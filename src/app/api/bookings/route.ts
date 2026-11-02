import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase-server'
import { calculateBookingFare, getMatchCutoffAt, isMatchDealWithinWindow, parsePickupDateTime, type DropPointId } from '@/lib/config'
import { createRazorpayOrder, razorpayConfigured } from '@/lib/razorpay'
import { PRICING_CONFIG } from '@/config/pricing'

const Input = z.object({
  direction: z.enum(['K2I', 'I2K']), mode: z.literal('match'),
  point: z.enum(['rajendra', 'bhawarkua', 'railway', 'airport', 'rajwada']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  name: z.string().trim().min(2).max(60), phone: z.string().regex(/^[6-9]\d{9}$/),
  passengers: z.number().int().min(1).max(4), address: z.string().trim().max(250).optional().default(''),
  consent: z.literal(true), idempotencyKey: z.string().min(12).max(100),
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
  if (!razorpayConfigured()) return NextResponse.json({ error: 'Online booking payments are not configured yet. Please contact MarutiCab on WhatsApp.' }, { status: 503 })
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
  const db = createServiceClient()
  const { data: existing, error: duplicateError } = await db.from('bookings').select('id,public_token,booking_ref,status,phone').eq('idempotency_key', data.idempotencyKey).limit(1)
  if (duplicateError) return NextResponse.json({ error: 'Booking storage is unavailable. Apply the Supabase migration and try again.' }, { status: 503 })
  if (existing?.[0]) {
    const prior = existing[0]
    if (prior.phone !== data.phone) return NextResponse.json({ error: 'This checkout key is not associated with your phone number.' }, { status: 403 })
    if (prior.status !== 'pending_payment') return NextResponse.json({ error: 'This booking attempt has already been paid or completed.' }, { status: 409 })
    const { data: priorPayment } = await db.from('payments').select('razorpay_order_id,amount,status').eq('booking_id', prior.id).eq('purpose', 'advance').limit(1).single()
    if (!priorPayment?.razorpay_order_id) return NextResponse.json({ error: 'The previous checkout did not finish. Please start a new booking.' }, { status: 409 })
    return NextResponse.json({ bookingRef: prior.booking_ref, publicToken: prior.public_token, orderId: priorPayment.razorpay_order_id, amount: priorPayment.amount * 100, currency: 'INR', keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID })
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
    base_fare: fare.baseFare, discount: 0, night_extra: fare.nightSurcharge,
    total_fare: fare.totalFare, advance_amount: fare.advanceAmount, advance_paid: 0,
    is_night: fare.nightSurcharge > 0, extras: { drop_point_extra: fare.dropPointExtra, night_surcharge: fare.nightSurcharge },
    balance_amount: fare.balanceAmount, status: 'pending_payment', refund_status: data.mode === 'match' ? 'pending' : 'not_applicable',
    cutoff_at: cutoffAt, public_token: token, idempotency_key: data.idempotencyKey,
  }).select('id,booking_ref').single()
  if (insertError || !booking) {
    if (insertError?.code === '23505') return NextResponse.json({ error: 'There is already an active booking for this phone number on that date.' }, { status: 409 })
    return NextResponse.json({ error: 'Could not save the booking. Check that the Supabase migration is applied.' }, { status: 503 })
  }

  try {
    const order = await createRazorpayOrder({ amount: fare.advanceAmount, receipt: String(booking.booking_ref), notes: { booking_id: booking.id, booking_ref: String(booking.booking_ref) } })
    const { error: paymentError } = await db.from('payments').insert({ booking_id: booking.id, purpose: 'advance', razorpay_order_id: order.id, amount: fare.advanceAmount, status: 'created' })
    if (paymentError) throw paymentError
    return NextResponse.json({ bookingRef: booking.booking_ref, publicToken: token, orderId: order.id, amount: fare.advanceAmount * 100, currency: 'INR', keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID, fare })
  } catch (error) {
    await db.from('bookings').update({ status: 'cancelled', refund_status: 'not_applicable' }).eq('id', booking.id).eq('status', 'pending_payment')
    console.error('Razorpay order creation failed', error)
    return NextResponse.json({ error: 'Could not start secure payment. No payment was taken; please try again.' }, { status: 502 })
  }
}
