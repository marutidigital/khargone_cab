import { NextRequest, NextResponse } from 'next/server'
import crypto, { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase-server'
import { calculateBookingFare, getMatchCutoffAt, isMatchDealWithinWindow, parsePickupDateTime, type DropPointId } from '@/lib/config'
import { PRICING_CONFIG } from '@/config/pricing'
import { notify, notifyAdmin } from '@/lib/booking-notifications'
import { sendBookingAutomation } from '@/lib/whatsapp-automation'
import { tryAutomaticFIFOMatch, secureAndConfirmMatch } from '@/lib/matching-engine'

const Input = z.object({
  direction: z.enum(['K2I', 'I2K']), mode: z.literal('match'),
  point: z.enum(['rajendra', 'bhawarkua', 'railway', 'airport', 'rajwada']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  name: z.string().trim().min(2).max(60), phone: z.string().regex(/^[6-9]\d{9}$/),
  email: z.string().trim().email().optional().or(z.literal('')).transform(val => val || undefined),
  passengers: z.number().int().min(1).max(4), address: z.string().trim().max(250).optional().default(''),
  consent: z.literal(true), idempotencyKey: z.string().min(12).max(100),
  confirmedRideId: z.string().uuid().optional(),
  matchedWithBookingId: z.string().uuid().optional(),
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
      return NextResponse.json({ error: 'Online payment signature could not be verified.' }, { status: 400 })
    }
    advancePaid = data.advancePaid || 500
  } else {
    return NextResponse.json({
      error: 'Advance payment of ₹500 is required to confirm your booking.'
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
    if (prior.status === 'pending_payment') {
      // Transition pre-inserted pending booking to waiting
      await db.from('bookings').update({
        status: 'waiting',
        advance_paid: advancePaid,
        advance_amount: advancePaid,
        balance_amount: balanceAmount,
        updated_at: new Date().toISOString(),
        extras: {
          razorpay_order_id: data.paymentOrderId,
          razorpay_payment_id: data.paymentId,
          coupon_code: data.couponCode || null,
          ...(data.confirmedRideId ? { confirmed_ride_id: data.confirmedRideId } : {}),
          ...(data.matchedWithBookingId ? { matched_with_booking_id: data.matchedWithBookingId } : {}),
        },
      }).eq('id', prior.id)

      if (data.paymentId) {
        await db.from('payments').insert({
          booking_id: prior.id,
          provider: 'razorpay',
          provider_order_id: data.paymentOrderId || null,
          provider_payment_id: data.paymentId,
          amount: advancePaid,
          payment_status: 'captured',
          verified_at: new Date().toISOString(),
        }).catch(() => {})
      }

      // Dispatch WhatsApp Template: payment_received (awaited!)
      const routeLabel = data.direction === 'K2I' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'
      await sendWhatsAppTemplateMessage({
        toPhone: data.phone,
        templateCode: 'payment_received',
        variables: [
          data.name,
          String(advancePaid),
          prior.booking_ref,
          data.paymentId || 'RZP_OK',
          routeLabel,
          data.date,
        ],
        bookingId: prior.id,
      })

      await notifyAdmin(
        `pay_captured:${prior.id}`,
        prior.id,
        `Advance payment of ₹${advancePaid} confirmed for ${prior.booking_ref} (${data.name}). Route: ${routeLabel}.`
      )

      return NextResponse.json({ bookingRef: prior.booking_ref, publicToken: prior.public_token, status: 'waiting', fare })
    }
    return NextResponse.json({ error: 'This booking attempt is no longer active. Please start a new booking.' }, { status: 409 })
  }

  const token = randomBytes(32).toString('base64url')
  const direction = data.direction === 'K2I' ? 'KI' : 'IK'

  // If visitor is matching a specific public board ride, pre-validate target booking & 4-hour gap
  let targetBooking: any = null
  if (data.matchedWithBookingId) {
    const { data: tb, error: tbError } = await db
      .from('bookings')
      .select('*')
      .eq('id', data.matchedWithBookingId)
      .single()

    if (tbError || !tb) {
      return NextResponse.json({ error: 'Selected waiting ride was not found. Please choose an available ride from the board.' }, { status: 404 })
    }
    if (tb.status !== 'waiting' || tb.match_id) {
      return NextResponse.json({ error: 'That return ride was just matched or is no longer waiting. Refresh the list and choose another available ride.' }, { status: 409 })
    }
    const expectedDir = tb.direction === 'KI' ? 'IK' : 'KI'
    if (direction !== expectedDir) {
      return NextResponse.json({ error: 'Visitor ride direction must be opposite to the waiting ride.' }, { status: 400 })
    }
    if (tb.travel_date !== data.date) {
      return NextResponse.json({ error: 'Travel date must match the waiting ride date.' }, { status: 400 })
    }
    // Formula: ABS(existing_pickup_datetime - visitor_pickup_datetime) >= 4 hours (240 minutes)
    const [tHour, tMin] = String(tb.pickup_time).split(':').map(Number)
    const [vHour, vMin] = String(data.time).split(':').map(Number)
    const tMinutes = (Number.isFinite(tHour) ? tHour : 12) * 60 + (Number.isFinite(tMin) ? tMin : 0)
    const vMinutes = (Number.isFinite(vHour) ? vHour : 12) * 60 + (Number.isFinite(vMin) ? vMin : 0)
    const diffMinutes = Math.abs(vMinutes - tMinutes)
    if (diffMinutes < 240) {
      return NextResponse.json({
        error: `Pickup time must have at least a 4-hour gap from the existing ride pickup time (${String(tb.pickup_time).slice(0, 5)}). Difference is only ${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m.`
      }, { status: 400 })
    }
    targetBooking = tb
  }

  const cutoffAt = getMatchCutoffAt(data.date, data.time, now)
  const { data: booking, error: insertError } = await db.from('bookings').insert({
    direction, mode: data.mode, vehicle: 'economy_sedan', vehicle_type: 'sedan',
    drop_point: data.point, drop_name: PRICING_CONFIG.points.find((entry) => entry.id === data.point)?.name || data.point, travel_date: data.date, pickup_time: data.time,
    passenger_name: data.name, phone: data.phone, email: data.email || null, passenger_count: data.passengers, address: data.address || null,
    consent_whatsapp: true, consent_at: new Date().toISOString(),
    consent_text: 'I agree to receive WhatsApp updates about this booking and accept the Terms and Refund Policy.',
    base_fare: fare.baseFare, discount: data.couponCode ? (advancePaid === 2 ? 498 : 495) : 0, night_extra: fare.nightSurcharge,
    total_fare: fare.totalFare, advance_amount: advancePaid, advance_paid: advancePaid,
    is_night: fare.nightSurcharge > 0,
    extras: {
      drop_point_extra: fare.dropPointExtra,
      night_surcharge: fare.nightSurcharge,
      razorpay_order_id: data.paymentOrderId,
      razorpay_payment_id: data.paymentId,
      coupon_code: data.couponCode || null,
      ...(data.confirmedRideId ? { confirmed_ride_id: data.confirmedRideId } : {}),
      ...(data.matchedWithBookingId ? { matched_with_booking_id: data.matchedWithBookingId } : {}),
    },
    balance_amount: balanceAmount, status: 'waiting', refund_status: 'pending',
    cutoff_at: cutoffAt, public_token: token, idempotency_key: data.idempotencyKey,
  }).select('id,booking_ref').single()
  if (insertError || !booking) {
    if (insertError?.code === '23505') return NextResponse.json({ error: 'There is already an active booking for this phone number on that date.' }, { status: 409 })
    return NextResponse.json({ error: 'Could not save the booking. Check that the Supabase migration is applied.' }, { status: 503 })
  }

  // Record payment in public.payments
  if (data.paymentId) {
    await db.from('payments').insert({
      booking_id: booking.id,
      provider: 'razorpay',
      provider_order_id: data.paymentOrderId || null,
      provider_payment_id: data.paymentId,
      amount: advancePaid,
      payment_status: 'captured',
      verified_at: new Date().toISOString(),
    })
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
    const { data: matchId, error: matchError } = await db.rpc('confirm_reserved_match', { p_requester_booking_id: booking.id })
    if (matchError || !matchId) {
      await db.rpc('release_match_reservation', { p_requester_booking_id: booking.id })
      await db.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id).eq('status', 'waiting')
      console.error('Could not confirm selected return ride:', matchError)
      return NextResponse.json({ error: 'That return ride is no longer available. Refresh the list and choose another ride.' }, { status: 409 })
    }
    const { data: pair } = await db.from('bookings').select('*').eq('match_id', matchId)
    for (const ride of pair ?? []) await notify('match_confirmed', ride.id).catch((error) => console.error('Match notification failed:', error))
  } else if (targetBooking) {
    // Matched with public board waiting ride!
    const outId = targetBooking.direction === 'KI' ? targetBooking.id : booking.id
    const backId = targetBooking.direction === 'KI' ? booking.id : targetBooking.id
    const matchRes = await secureAndConfirmMatch({
      bookingOutId: outId,
      bookingBackId: backId,
    })
    if (!matchRes.success) {
      console.warn('Public board match notice:', matchRes.error)
      // Fallback: try general FIFO match
      await tryAutomaticFIFOMatch(booking.id)
    }
  } else {
    // Try automatic FIFO return match immediately!
    try {
      const fifoResult = await tryAutomaticFIFOMatch(booking.id)
      if (fifoResult.matched) {
        console.log(`Automatic FIFO match confirmed for ${booking.id}: match ${fifoResult.matchId}`)
      }
    } catch (fifoErr) {
      console.warn('Automatic FIFO match notice:', fifoErr)
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

  const pointName = PRICING_CONFIG.points.find((entry) => entry.id === data.point)?.name || data.point
  const routeName = direction === 'KI' ? 'Khargone to Indore' : 'Indore to Khargone'

  if (savedBooking?.status === 'confirmed') {
    void sendBookingAutomation('booking_waiting', savedBooking).catch((error) => console.error('Booking WhatsApp automation failed:', error))
    void notifyAdmin(`new-confirmed:${booking.id}`, booking.id, `🎉 Confirmed Booking #${booking.booking_ref}: ${data.name} (${data.phone}) - ${routeName} on ${data.date} at ${data.time}. Advance ₹${advancePaid} paid online. Balance: ₹${balanceAmount}. ⚠️ Action: Assign Driver & Vehicle!`)
  } else if (savedBooking?.status === 'waiting') {
    void sendBookingAutomation('booking_waiting', savedBooking).catch((error) => console.error('Booking WhatsApp automation failed:', error))
    void notifyAdmin(`new-waiting:${booking.id}`, booking.id, `🚨 New Waiting Booking #${booking.booking_ref}: ${data.name} (${data.phone}) - ${routeName} on ${data.date} at ${data.time}. Advance ₹${advancePaid} paid online. Waiting for return match.`)
  }

  // Direct WhatsApp Confirmation to Customer & Admin (fail-safe)
  try {
    const { sendText } = await import('@/lib/whatsapp')
    const customerPhone = String(data.phone).replace(/\D/g, '').slice(-10)

    // Send Customer Confirmation WhatsApp message
    await sendText({
      to: customerPhone,
      body: `🚕 *Maruti Cab Booking Mil Gayi!* 🥳\n\nHey *${data.name}*! Aapki cab booking request receive ho gayi hai.\n\n🧾 *Booking ID:* #${booking.booking_ref}\n📍 *Route:* ${routeName}\n📍 *Pickup/Drop:* ${pointName}\n📅 *Travel Date:* ${data.date}\n⏰ *Pickup Time:* ${data.time}\n\n💳 *Advance Paid:* ₹${advancePaid} (Online Received)\n💵 *Balance to Driver:* ₹${balanceAmount} (Gaadi me dena hai)\n\n🔗 *Live Ride Status & Tracking:*\nhttps://maruticab.in/booking/${token}\n\n📞 24x7 Helpline: +91 72823 16090\n*Maruti Cab — Khargone ⇄ Indore Dedicated Sedan Service* 🚗`,
      bookingId: booking.id,
      eventVersion: `booking_create:${booking.id}`,
    })

    // Send Admin Notification to 8878933778
    await sendText({
      to: '8878933778',
      body: `💰 *NEW ONLINE BOOKING (₹${advancePaid} Advance)* 🚕\n\nBooking: #${booking.booking_ref}\nPassenger: ${data.name} (${data.phone})\nRoute: ${routeName}\nDate: ${data.date} at ${data.time}\nAdvance: ₹${advancePaid} (Online)\nBalance: ₹${balanceAmount}\nPayment ID: ${data.paymentId || 'N/A'}\nStatus: ${savedBooking?.status || 'waiting'}\n\nDashboard: https://maruticab.in/admin`,
      bookingId: booking.id,
      eventVersion: `admin_booking_create:${booking.id}`,
    })
  } catch (waErr) {
    console.warn('Direct WhatsApp confirmation dispatch notice:', waErr)
  }

  // Send email confirmation if email was provided
  if (data.email && savedBooking) {
    try {
      const { sendBookingEmail } = await import('@/lib/email')
      void sendBookingEmail({ ...(savedBooking as any), email: data.email }).catch((err) => console.warn('Email dispatch notice:', err))
    } catch (emailErr) {
      console.warn('Booking email import notice:', emailErr)
    }
  }

  const greetingHeader = isRepeatCustomer
    ? `🚕 *Welcome back, ${data.name}!* Thank you for choosing MarutiCab again.`
    : `🚕 *Welcome to MarutiCab, ${data.name}!* Your private cab request is received.`

  const waText = `${greetingHeader}\n\n*Booking Ref:* ${booking.booking_ref}\n*Route:* ${routeName}\n*Drop Point:* ${pointName}\n*Date:* ${data.date}\n*Pickup Time:* ${data.time}\n*Status:* ${savedBooking?.status === 'confirmed' ? 'Confirmed & Scheduled' : 'Advance Paid · Matching Return Cab'}\n\n💳 *Advance Paid:* ₹${advancePaid} (Online Payment Received)\n💵 *Balance to Driver:* ₹${balanceAmount} (Pay in cab)\n\nView details: https://maruticab.in/booking/${token}\nSupport WhatsApp: +91 72823 16090`
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
