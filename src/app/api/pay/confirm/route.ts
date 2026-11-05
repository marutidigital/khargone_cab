import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createServiceClient } from '@/lib/supabase-server'
import { notifyAdmin } from '@/lib/booking-notifications'
import { tryAutomaticFIFOMatch } from '@/lib/matching-engine'
import { sendWhatsAppTemplateMessage } from '@/lib/whatsapp-templates'

export async function POST(req: NextRequest) {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keySecret) {
      return NextResponse.json({ error: 'Razorpay secret key is not configured.' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const {
      bookingRef,
      orderId,
      paymentId,
      signature,
      advancePaid = 500,
      couponCode,
    } = body

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: 'Missing payment signature parameters.' }, { status: 400 })
    }

    // 1. Verify Razorpay HMAC-SHA256 signature
    const payload = `${orderId}|${paymentId}`
    const expected = crypto.createHmac('sha256', keySecret).update(payload).digest('hex')
    const expBuf = Buffer.from(expected, 'utf-8')
    const supBuf = Buffer.from(signature, 'utf-8')

    const isValid = expBuf.length === supBuf.length && crypto.timingSafeEqual(expBuf, supBuf)
    if (!isValid) {
      return NextResponse.json({ error: 'Payment signature could not be verified.' }, { status: 400 })
    }

    const db = createServiceClient()

    // 2. Fetch booking
    let query = db.from('bookings').select('*')
    if (bookingRef) {
      query = query.eq('booking_ref', String(bookingRef).toUpperCase().trim())
    } else {
      return NextResponse.json({ error: 'Booking reference is required.' }, { status: 400 })
    }

    const { data: bookings, error: bErr } = await query.limit(1)
    if (bErr || !bookings || bookings.length === 0) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }

    const booking = bookings[0]
    const amountVal = Number(advancePaid) || 500
    const totalFare = Number(booking.total_fare) || 2200
    const balanceVal = Math.max(0, totalFare - amountVal)

    // 3. Update booking status to 'waiting' (for return match) or 'confirmed'
    const newStatus = booking.mode === 'match' ? 'waiting' : 'confirmed'
    await db.from('bookings').update({
      status: newStatus,
      advance_paid: amountVal,
      advance_amount: amountVal,
      balance_amount: balanceVal,
      updated_at: new Date().toISOString(),
      extras: {
        ...(booking.extras || {}),
        paid_via: 'web_pay',
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        coupon_code: couponCode || null,
        paid_at: new Date().toISOString(),
      },
    }).eq('id', booking.id)

    // 4. Record payment in payments table
    await db.from('payments').insert({
      booking_id: booking.id,
      provider: 'razorpay',
      provider_order_id: orderId,
      provider_payment_id: paymentId,
      amount: amountVal,
      payment_status: 'captured',
      verified_at: new Date().toISOString(),
    }).catch((pErr: any) => console.warn('Payment insert notice:', pErr?.message || pErr))

    // 5. Trigger FIFO auto return-ride matching
    try {
      await tryAutomaticFIFOMatch(booking.id)
    } catch (mErr) {
      console.warn('Match engine auto FIFO notice on web pay:', mErr)
    }

    // 6. Send WhatsApp confirmation template
    const routeLabel = booking.direction === 'IK' ? 'Indore ➔ Khargone' : 'Khargone ➔ Indore'
    try {
      await sendWhatsAppTemplateMessage({
        toPhone: booking.phone,
        templateCode: 'payment_received',
        variables: [
          booking.passenger_name || 'Passenger',
          String(amountVal),
          booking.booking_ref,
          paymentId,
          routeLabel,
          booking.travel_date || new Date().toISOString().slice(0, 10),
        ],
        bookingId: booking.id,
      })
    } catch (tplErr) {
      console.warn('Payment confirmation WA template notice:', tplErr)
    }

    // 7. Alert Admin
    await notifyAdmin(
      `web_pay_confirm:${booking.id}`,
      booking.id,
      `💰 Advance ₹${amountVal} received via Online Pay for Booking #${booking.booking_ref}! Passenger: ${booking.passenger_name} (${booking.phone}). Route: ${routeLabel}.`
    )

    return NextResponse.json({
      success: true,
      message: 'Advance payment verified and booking updated successfully.',
      booking_ref: booking.booking_ref,
      status: newStatus,
    })
  } catch (err: any) {
    console.error('Pay confirm error:', err)
    return NextResponse.json(
      { error: err?.message || 'Internal error confirming payment.' },
      { status: 500 }
    )
  }
}
