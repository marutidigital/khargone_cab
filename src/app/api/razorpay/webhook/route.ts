// src/app/api/razorpay/webhook/route.ts
// Verifies Razorpay signed webhook events, records payments, triggers return matching, and sends WhatsApp templates

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { verifyRazorpayWebhookSignature } from '@/lib/razorpay'
import { sendWhatsAppTemplateMessage } from '@/lib/whatsapp-templates'
import { notifyAdmin } from '@/lib/booking-notifications'
import { tryMatchBookingAndConfirm } from '@/lib/matching-engine'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature') || ''
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET

  // 1. Signature Verification - Fail immediately with 401 if invalid
  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    console.error('[Razorpay Webhook] Unauthorized: Invalid signature')
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 })
  }

  const eventId = request.headers.get('x-razorpay-event-id') || `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`
  let body: any
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const db = createServiceClient()

  // 2. Idempotency protection via razorpay_webhook_events
  const { error: eventError } = await db.from('razorpay_webhook_events').insert({
    event_id: eventId,
    event_type: body.event || 'unknown',
    payload: body,
  })

  if (eventError) {
    // Duplicate webhook delivery
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    const eventType = body.event
    const payment = body.payload?.payment?.entity
    const paymentLink = body.payload?.payment_link?.entity
    const refund = body.payload?.refund?.entity

    // ── PAYMENT CAPTURED OR PAYMENT LINK PAID ──
    if (
      eventType === 'payment.captured' ||
      eventType === 'payment_link.paid' ||
      eventType === 'order.paid'
    ) {
      const paymentId = payment?.id || body.payload?.payment?.entity?.id
      const orderId = payment?.order_id || paymentLink?.order_id
      const amountPaise = Number(payment?.amount || paymentLink?.amount || 50000)
      const amountRupees = Math.round(amountPaise / 100)
      const notes = payment?.notes || paymentLink?.notes || {}

      const targetBookingId = notes.booking_id
      const targetBookingRef = notes.booking_ref

      // Strictly search by booking_id, booking_ref, or order_id in extras. NEVER fall back to phone!
      let booking: any = null
      if (targetBookingId) {
        const { data: bData } = await db.from('bookings').select('*').eq('id', targetBookingId).limit(1)
        booking = bData?.[0]
      }
      if (!booking && targetBookingRef) {
        const { data: bData } = await db.from('bookings').select('*').eq('booking_ref', targetBookingRef).limit(1)
        booking = bData?.[0]
      }
      if (!booking && orderId) {
        const { data: bData } = await db.from('bookings').select('*').contains('extras', { razorpay_order_id: orderId }).limit(1)
        booking = bData?.[0]
      }

      // If no booking found, do NOT attach to any other booking. Log and alert admin!
      if (!booking) {
        console.warn(`[Razorpay Webhook] No matching booking found for payment ${paymentId}, order ${orderId}, notes:`, notes)
        await notifyAdmin(
          `unattached_pay:${paymentId}`,
          null,
          `⚠️ *UNATTACHED PAYMENT RECEIVED*: Payment ${paymentId} (₹${amountRupees}) received for order ${orderId || 'N/A'}. No matching pending booking in database. Notes: ${JSON.stringify(notes)}`
        )
        return NextResponse.json({ received: true, unattached: true })
      }

      // Idempotency check: Has this payment already been processed?
      const { data: existingPay } = await db
        .from('payments')
        .select('id')
        .eq('provider_payment_id', paymentId)
        .limit(1)

      if (existingPay && existingPay.length > 0 && booking.status !== 'pending_payment') {
        return NextResponse.json({ received: true, idempotent: true })
      }

      // Record in public.payments table
      if (!existingPay || existingPay.length === 0) {
        const { error: payInsertErr } = await db.from('payments').insert({
          booking_id: booking.id,
          provider: 'razorpay',
          provider_order_id: orderId || null,
          provider_payment_id: paymentId,
          amount: amountRupees,
          payment_status: 'captured',
          verified_at: new Date().toISOString(),
        })
        if (payInsertErr) console.warn('Payment insert notice:', payInsertErr)
      }

      // Atomically update booking to 'waiting' + advance_paid
      const balance = Math.max(0, Number(booking.total_fare || 0) - amountRupees)
      await db.from('bookings').update({
        advance_paid: amountRupees,
        advance_amount: amountRupees,
        balance_amount: balance,
        status: booking.status === 'pending_payment' ? 'waiting' : booking.status,
        updated_at: new Date().toISOString(),
        extras: {
          ...(booking.extras || {}),
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId || booking.extras?.razorpay_order_id,
          paid_via_webhook: true,
        },
      }).eq('id', booking.id)

      // Dispatch WhatsApp Template: payment_received (awaited to prevent Vercel container termination!)
      const routeLabel = booking.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'
      await sendWhatsAppTemplateMessage({
        toPhone: booking.phone,
        templateCode: 'payment_received',
        variables: [
          booking.passenger_name || 'Passenger',
          String(amountRupees || 2),
          booking.booking_ref,
          paymentId || 'RZP_OK',
          routeLabel,
          booking.travel_date || '',
        ],
        bookingId: booking.id,
      })

      // Notify Admin of verified advance payment (awaited!)
      await notifyAdmin(
        `pay_captured:${booking.id}`,
        booking.id,
        `Advance payment of ₹${amountRupees} confirmed for ${booking.booking_ref} (${booking.passenger_name}). Matching search started.`
      )

      // Try automatic return matching immediately!
      try {
        await tryMatchBookingAndConfirm(booking.id)
      } catch (matchErr) {
        console.warn('Initial matching attempt notice:', matchErr)
      }
    }

    // ── REFUND EVENTS ──
    else if (eventType === 'refund.processed' || eventType === 'refund.created') {
      const refundId = refund?.id
      const paymentId = refund?.payment_id
      const refundAmount = Math.round(Number(refund?.amount || 50000) / 100)
      const notes = refund?.notes || {}

      let targetBookingId = notes.booking_id
      if (!targetBookingId && paymentId) {
        const { data: p } = await db.from('payments').select('booking_id').eq('provider_payment_id', paymentId).limit(1).single()
        targetBookingId = p?.booking_id
      }

      if (targetBookingId) {
        await db.from('refunds').update({
          refund_status: 'processed',
          processed_at: new Date().toISOString(),
          provider_refund_id: refundId,
        }).eq('booking_id', targetBookingId)

        const { data: bRow } = await db
          .from('bookings')
          .update({
            refund_status: 'processed',
            status: 'refunded',
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetBookingId)
          .select('*')
          .single()

        // Dispatch Template 4: refund_initiated via WhatsApp to customer!
        if (bRow) {
          await sendWhatsAppTemplateMessage({
            toPhone: bRow.phone,
            templateCode: 'refund_initiated',
            variables: [
              bRow.passenger_name || 'Passenger',
              bRow.booking_ref,
              String(refundAmount || bRow.advance_paid || 500),
              refundId || 'RZP_REFUND',
            ],
            bookingId: bRow.id,
          })
        }
      }
    } else if (eventType === 'refund.failed') {
      const refundId = refund?.id
      const notes = refund?.notes || {}
      if (notes.booking_id) {
        await db.from('refunds').update({
          refund_status: 'failed',
          failure_reason: refund?.error_description || 'Provider failed refund',
        }).eq('booking_id', notes.booking_id)

        await db.from('bookings').update({
          refund_status: 'failed',
        }).eq('id', notes.booking_id)

        await notifyAdmin(
          `refund_fail:${notes.booking_id}`,
          notes.booking_id,
          `CRITICAL: Refund failed for booking ${notes.booking_id}: ${refund?.error_description || 'Check Razorpay dashboard'}`
        )
      }
    }

    // Mark webhook event as processed
    await db.from('razorpay_webhook_events').update({
      processed_at: new Date().toISOString(),
    }).eq('event_id', eventId)

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Razorpay webhook handler error:', error)
    await db.from('razorpay_webhook_events').update({
      error: error?.message || 'Processing failed',
    }).eq('event_id', eventId)

    return NextResponse.json({ error: error?.message || 'Internal handler error' }, { status: 500 })
  }
}
