import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createServiceClient } from '@/lib/supabase-server'
import { verifyRazorpayPaymentSignature } from '@/lib/razorpay'
import { sendWhatsAppTemplateMessage } from '@/lib/whatsapp-templates'
import { notifyAdmin } from '@/lib/booking-notifications'
import { tryMatchBookingAndConfirm } from '@/lib/matching-engine'

export async function POST(req: NextRequest) {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keySecret) {
      return NextResponse.json(
        { error: 'Razorpay secret key is not configured.' },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const orderId = body.order_id || body.razorpay_order_id
    const paymentId = body.payment_id || body.razorpay_payment_id
    const signature = body.signature || body.razorpay_signature
    const bookingId = body.booking_id || body.bookingId

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, payment_id, and razorpay_signature.' },
        { status: 400 }
      )
    }

    const isValid = verifyRazorpayPaymentSignature(orderId, paymentId, signature)

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment verification failed: Invalid signature.',
        },
        { status: 400 }
      )
    }

    const db = createServiceClient()

    // Find the booking linked to this order or booking_id
    let booking: any = null
    if (bookingId) {
      const { data: bData } = await db.from('bookings').select('*').eq('id', bookingId).limit(1)
      booking = bData?.[0]
    }
    if (!booking && orderId) {
      const { data: bData } = await db.from('bookings').select('*').contains('extras', { razorpay_order_id: orderId }).limit(1)
      booking = bData?.[0]
    }

    if (booking) {
      const amountRupees = Number(booking.advance_amount || 500)

      // Ensure payment is logged in public.payments table
      const { data: existingPay } = await db
        .from('payments')
        .select('id')
        .eq('provider_payment_id', paymentId)
        .limit(1)

      if (!existingPay || existingPay.length === 0) {
        await db.from('payments').insert({
          booking_id: booking.id,
          provider: 'razorpay',
          provider_order_id: orderId || null,
          provider_payment_id: paymentId,
          amount: amountRupees,
          payment_status: 'captured',
          verified_at: new Date().toISOString(),
        })
      }

      // If booking is still pending_payment, atomically transition to waiting
      if (booking.status === 'pending_payment') {
        const balance = Math.max(0, Number(booking.total_fare || 0) - amountRupees)
        await db
          .from('bookings')
          .update({
            advance_paid: amountRupees,
            advance_amount: amountRupees,
            balance_amount: balance,
            status: 'waiting',
            updated_at: new Date().toISOString(),
            extras: {
              ...(booking.extras || {}),
              razorpay_payment_id: paymentId,
              razorpay_order_id: orderId,
              verified_via_browser: true,
            },
          })
          .eq('id', booking.id)

        // Dispatch WhatsApp notification (safe & resilient)
        const routeLabel = booking.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'
        try {
          await sendWhatsAppTemplateMessage({
            toPhone: booking.phone,
            templateCode: 'payment_received',
            variables: [
              booking.passenger_name || 'Passenger',
              String(amountRupees),
              booking.booking_ref,
              paymentId,
              routeLabel,
              booking.travel_date || '',
            ],
            bookingId: booking.id,
          })
        } catch (waErr) {
          console.warn('WhatsApp payment confirmation notice:', waErr)
        }

        // Notify Admin of verified advance payment (safe)
        try {
          await notifyAdmin(
            `pay_captured:${booking.id}`,
            booking.id,
            `Advance payment of ₹${amountRupees} confirmed for ${booking.booking_ref} (${booking.passenger_name}). Matching search started.`
          )
        } catch (admErr) {
          console.warn('Admin notification notice:', admErr)
        }

        // Trigger return match check
        try {
          await tryMatchBookingAndConfirm(booking.id)
        } catch (matchErr) {
          console.warn('Matching check warning:', matchErr)
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully.',
        order_id: orderId,
        payment_id: paymentId,
        booking_id: booking.id,
        bookingRef: booking.booking_ref,
        publicToken: booking.public_token,
        status: booking.status === 'pending_payment' ? 'waiting' : booking.status,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully.',
      order_id: orderId,
      payment_id: paymentId,
    })
  } catch (error: any) {
    console.error('Razorpay verify-payment error:', error)
    return NextResponse.json(
      {
        error: error?.message || 'Internal server error while verifying payment.',
      },
      { status: 500 }
    )
  }
}
