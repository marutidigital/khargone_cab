import { NextRequest, NextResponse } from 'next/server'
import crypto, { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase-server'
import { calculateBookingFare, getMatchCutoffAt, isMatchDealWithinWindow, parsePickupDateTime, type DropPointId } from '@/lib/config'
import { PRICING_CONFIG } from '@/config/pricing'
import { notify, notifyAdmin } from '@/lib/booking-notifications'
import { sendBookingAutomation } from '@/lib/whatsapp-automation'

const Input = z.object({
  direction: z.enum(['K2I', 'I2K']), mode: z.literal('match'),
  point: z.enum(['rajendra', 'bhawarkua', 'railway', 'airport', 'rajwada']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  name: z.string().trim().min(2).max(60), phone: z.string().regex(/^[6-9]\d{9}$/),
  passengers: z.number().int().min(1).max(4), address: z.string().trim().max(250).optional().default(''),
  consent: z.literal(true), idempotencyKey: z.string().min(12).max(100), confirmedRideId: z.string().uuid().optional(),
  // Advance Payment fields
  paymentOrderId: z.string().optional(),
  paymentId: z.string().optional(),
  paymentSignature: z.string().optional(),
  advancePaid: z.number().int().min(1).max(5000).optional().default(500),
  couponCode: z.string().optional(),
})
const rateMap = new Map<string, number[]>()

function checkRate(key: string) {
  const now = Date.now()
  const recent = (rateMap.get(key) ?? []).filter((value) => now - value < 60 * 60 * 1000)
  if (recent.length >= 8) return false
  recent.push(now)
  rateMap.set(key, recent)
  return true
}

export async function GET() {
  return NextResponse.json({ error: 'Use the availability endpoint for public booking checks.' }, { status: 405 })
}

export async function POST(request: NextRequest) {
  const parsed = Input.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Please check the booking details and consent.' }, { status: 400 })
  const data = parsed.data
  const pickup = parsePickupDateTime(data.date, data.time)
  const now = new Date()
  const maxDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
  if (!pickup || pickup < now || pickup > maxDate) return NextResponse.json({ error: 'Choose a valid pickup time within the next 60 days.' }, { status: 400 })
  if (!isMatchDealWithinWindow(data.date, data.time, now)) {
    return NextResponse.json({ error: 'Choose any future pickup time for your Match Deal booking.' }, { status: 400 })
  }
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRate(`${ip}:${data.phone}`)) return NextResponse.json({ error: 'Too many booking attempts. Try again later.' }, { status: 429 })

  const fare = calculateBookingFare({ mode: data.mode, direction: data.direction, point: data.point as DropPointId, pickupTime: data.time })

  // Enforce advance payment: verify Razorpay signature
  let advancePaid = 0
  if (data.paymentOrderId && data.paymentId && data.paymentSignature) {
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 't87HNHonjGlKH6vnUXa4SX9v'
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${data.paymentOrderId}|${data.paymentId}`)
      .digest('hex')

    const isMatch =
      generatedSignature.length === data.paymentSignature.length &&
      crypto.timingSafeEqual(Buffer.from(generatedSignature), Buffer.from(data.paymentSignature))

    if (!isMatch) {
      return NextResponse.json({ error: 'Razorpay payment signature could not be verified.' }, { status: 400 })
    }
    advancePaid = data.advancePaid || 500
  } else {
    // "no booking without advance payment"
    return NextResponse.json({
      error: 'Advance payment of ₹500 (or ₹5 with coupon) is required to confirm your booking.'
    }, { status: 400 })
  }

  const balanceAmount = Math.max(0, fare.totalFare - advancePaid)

  const db = createServiceClient()
  const { data: existing, error: duplicateError } = await db.from('bookings').select('id,public_token,booking_ref,status,phone').eq('idempotency_key', data.idempotencyKey).limit(1)
  if (duplicateError) return NextResponse.json({ error: 'Booking storage is unavailable. Apply the Supabase migration and try again.' }, { status: 503 })
  if (existing?.[0]) {
    const prior = existing[0]
    if (prior.phone !== data.phone) return NextResponse.json({ error: 'This checkout key is not associated with your phone number.' }, { status: 403 })
    if (['waiting', 'matched', 'confirmed', 'no_match_decision'].includes(prior.status)) {
      return NextResponse.json({ bookingRef: prior.booking_ref, publicToken: prior.public_token, status: prior.status, fare })
    }
    return NextResponse.json({ error: 'This booking attempt is no longer active. Please start a new booking.' }, { status: 409 })
  }
  const { data: samePhone, error: duplicatePhoneError } = await db.from('bookings').select('id').eq('phone', data.phone).eq('travel_date', data.date).in('status', ['pending_payment', 'waiting', 'matched', 'confirmed', 'no_match_decision']).limit(1)
  if (!duplicatePhoneError && samePhone?.length) return NextResponse.json({ error: 'There is already an active booking for this phone number on that date. Contact us if you need another cab.' }, { status: 409 })

  const token = randomBytes(32).toString('base64url')
  const direction = data.direction === 'K2I' ? 'KI' : 'IK'
  const cutoffAt = getMatchCutoffAt(data.date, data.time, now)
  const { data: booking, error: insertError } = await db.from('bookings').insert({
    direction, mode: data.mode, vehicle: 'economy_sedan', vehicle_type: 'sedan',
    drop_point: data.point, drop_name: PRICING_CONFIG.points.find((entry) => entry.id === data.point)?.name || data.point, travel_date: data.date, pickup_time: data.time,
    passenger_name: data.name, phone: data.phone, passenger_count: data.passengers, address: data.address || null,
    consent_whatsapp: true, consent_at: new Date().toISOString(),
    consent_text: 'I agree to receive WhatsApp updates about this booking and accept the Terms and Refund Policy.',
    base_fare: fare.baseFare, discount: data.couponCode ? 495 : 0, night_extra: fare.nightSurcharge,
    total_fare: fare.totalFare, advance_amount: advancePaid, advance_paid: advancePaid,
    is_night: fare.nightSurcharge > 0,
    extras: {
      drop_point_extra: fare.dropPointExtra,
      night_surcharge: fare.nightSurcharge,
      razorpay_order_id: data.paymentOrderId,
      razorpay_payment_id: data.paymentId,
      coupon_code: data.couponCode || null,
      ...(data.confirmedRideId ? { confirmed_ride_id: data.confirmedRideId } : {})
    },
    balance_amount: balanceAmount, status: 'waiting', refund_status: 'pending',
    cutoff_at: cutoffAt, public_token: token, idempotency_key: data.idempotencyKey,
  }).select('id,booking_ref').single()
  if (insertError || !booking) {
    if (insertError?.code === '23505') return NextResponse.json({ error: 'There is already an active booking for this phone number on that date.' }, { status: 409 })
    return NextResponse.json({ error: 'Could not save the booking. Check that the Supabase migration is applied.' }, { status: 503 })
  }

  if (data.confirmedRideId) {
    const { data: reserved, error: reservationError } = await db.rpc('reserve_match_candidate', {
      p_requester_booking_id: booking.id,
      p_candidate_booking_id: data.confirmedRideId,
      p_hold_minutes: 15,
    })
    if (reservationError || reserved !== true) {
      await db.from('bookings').update({ status: 'cancelled', refund_status: 'not_applicable' }).eq('id', booking.id).eq('status', 'waiting')
      console.error('Could not reserve selected return ride:', reservationError)
      if (reservationError) return NextResponse.json({ error: 'Confirmed Booking is temporarily unavailable. Please try again later.' }, { status: 503 })
      return NextResponse.json({ error: 'That return ride was just taken. Refresh the list and choose another available ride.' }, { status: 409 })
    }
  }

  if (data.confirmedRideId) {
    const { data: matchId, error: matchError } = await db.rpc('confirm_reserved_match', { p_requester_booking_id: booking.id })
    if (matchError || !matchId) {
      await db.rpc('release_match_reservation', { p_requester_booking_id: booking.id })
      await db.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id).eq('status', 'waiting')
      console.error('Could not confirm selected return ride:', matchError)
      return NextResponse.json({ error: 'That return ride is no longer available. Refresh the list and choose another ride.' }, { status: 409 })
    }
    const { data: pair } = await db.from('bookings').select('*').eq('match_id', matchId)
    for (const ride of pair ?? []) await notify('match_confirmed', ride.id).catch((error) => console.error('Match notification failed:', error))
  } else {
    const { error: matchError } = await db.rpc('try_match_booking', { p_booking_id: booking.id, p_min_gap_hours: 4, p_max_gap_hours: 8 })
    if (matchError) console.error('Automatic Match Deal search failed:', matchError)
    const { data: refreshed } = await db.from('bookings').select('status,match_id').eq('id', booking.id).single()
    if (refreshed?.status === 'matched' && refreshed.match_id) {
      const { data: pair } = await db.from('bookings').select('id').eq('match_id', refreshed.match_id)
      for (const ride of pair ?? []) void notify('match_confirmed', ride.id).catch((error) => console.error('Match notification failed:', error))
    }
  }

  const { data: savedBooking } = await db.from('bookings').select('*').eq('id', booking.id).single()
  
  // Customer CRM tracking
  let isRepeatCustomer = false
  let customerTier = 'new'
  try {
    const { data: existingCustomer } = await db.from('customers').select('*').eq('phone', data.phone).single()
    if (existingCustomer) {
      isRepeatCustomer = true
      const totalRides = (existingCustomer.total_bookings || 1) + 1
      const totalSpend = (existingCustomer.total_spend || 0) + fare.totalFare
      customerTier = totalRides >= 5 ? 'vip' : 'frequent'
      await db.from('customers').update({
        name: data.name,
        total_bookings: totalRides,
        total_spend: totalSpend,
        last_booking_at: new Date().toISOString(),
        preferred_direction: direction,
        preferred_drop_point: data.point,
        tier: customerTier,
        updated_at: new Date().toISOString(),
      }).eq('phone', data.phone)
    } else {
      await db.from('customers').insert({
        phone: data.phone,
        name: data.name,
        total_bookings: 1,
        total_spend: fare.totalFare,
        preferred_direction: direction,
        preferred_drop_point: data.point,
        tier: 'new',
        first_booking_at: new Date().toISOString(),
        last_booking_at: new Date().toISOString(),
      })
    }
  } catch (crmError) {
    console.error('Customer CRM tracking error:', crmError)
  }

  if (savedBooking?.status === 'confirmed') {
    void sendBookingAutomation('booking_waiting', savedBooking).catch((error) => console.error('Booking WhatsApp automation failed:', error))
    void notifyAdmin(`new-confirmed:${booking.id}`, booking.id, `New Confirmed Booking ${booking.booking_ref}: Advance of ₹${advancePaid} received via Razorpay (${data.paymentId}). Balance: ₹${balanceAmount}.`)
  } else if (savedBooking?.status === 'waiting') {
    void sendBookingAutomation('booking_waiting', savedBooking).catch((error) => console.error('Booking WhatsApp automation failed:', error))
    void notifyAdmin(`new-waiting:${booking.id}`, booking.id, 'New Match Deal booking is waiting for dispatch.')
  }

  const pointName = PRICING_CONFIG.points.find((entry) => entry.id === data.point)?.name || data.point
  const routeName = direction === 'KI' ? 'Khargone to Indore' : 'Indore to Khargone'
  const greetingHeader = isRepeatCustomer
    ? `🚕 *Welcome back, ${data.name}!* Thank you for choosing MarutiCab again.`
    : `🚕 *Welcome to MarutiCab, ${data.name}!* Your private cab is CONFIRMED.`

  const waText = `${greetingHeader}\n\n*Booking Ref:* ${booking.booking_ref}\n*Route:* ${routeName}\n*Drop Point:* ${pointName}\n*Date:* ${data.date}\n*Pickup Time:* ${data.time}\n*Status:* Confirmed\n\n💳 *Advance Paid:* ₹${advancePaid} (Razorpay ID: ${data.paymentId})\n💵 *Balance to Driver:* ₹${balanceAmount} (Pay in cab)\n\nTrack / Cancel ride: https://maruticab.in/booking/${token}\nSupport: +91 72823 16090`
  const whatsappUrl = `https://wa.me/917282316090?text=${encodeURIComponent(waText)}`

  return NextResponse.json({
    bookingRef: booking.booking_ref,
    publicToken: token,
    status: savedBooking?.status || 'waiting',
    fare,
    isRepeatCustomer,
    customerTier,
    whatsappUrl,
  })
}
