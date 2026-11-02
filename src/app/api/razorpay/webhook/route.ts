import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { verifyRazorpayWebhookSignature } from '@/lib/razorpay'
import { recordCapturedAdvance, recordCapturedUpgrade } from '@/lib/payment-state'
import { shouldAcknowledgeDuplicateWebhook } from '@/lib/webhook-idempotency'
import { notifyAdmin } from '@/lib/booking-notifications'

export async function POST(request: NextRequest) {
  const raw = await request.text()
  if (!verifyRazorpayWebhookSignature(raw, request.headers.get('x-razorpay-signature') || '')) return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 })
  const eventId = request.headers.get('x-razorpay-event-id')
  if (!eventId) return NextResponse.json({ error: 'Missing webhook event id.' }, { status: 400 })
  let body: any
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }) }
  const db = createServiceClient()
  const { error: insertError } = await db.from('razorpay_webhook_events').insert({ event_id: eventId, event_type: body.event || 'unknown', payload: body })
  if (insertError) {
    const { data } = await db.from('razorpay_webhook_events').select('event_id,processed_at').eq('event_id', eventId).limit(1).single()
    if (shouldAcknowledgeDuplicateWebhook(data?.processed_at)) return NextResponse.json({ received: true, duplicate: true })
    if (!data) return NextResponse.json({ error: 'Could not record webhook event.' }, { status: 503 })
  }
  try {
    const payment = body.payload?.payment?.entity
    if (body.event === 'payment_link.paid') {
      const paymentLink = body.payload?.payment_link?.entity
      const payment = body.payload?.payment?.entity
      const storedUpgrade = paymentLink?.id ? await db.from('payments').select('amount').eq('razorpay_payment_link_id', paymentLink.id).limit(1).single() : { data: null }
      if (paymentLink?.id && payment?.id && payment.status === 'captured' && storedUpgrade.data?.amount * 100 === payment.amount && payment.currency === 'INR') await recordCapturedUpgrade(paymentLink.id, payment.id)
    } else if (body.event === 'payment.captured' || body.event === 'order.paid') {
      if (payment?.payment_link_id && payment?.id && payment.status === 'captured') {
        const storedUpgrade = await db.from('payments').select('amount').eq('razorpay_payment_link_id', payment.payment_link_id).limit(1).single()
        if (storedUpgrade.data?.amount * 100 === payment.amount && payment.currency === 'INR') await recordCapturedUpgrade(payment.payment_link_id, payment.id)
      } else if (payment?.order_id && payment?.id && payment.status === 'captured') await recordCapturedAdvance(payment.order_id, payment.id)
    } else if (body.event === 'payment.failed' && payment?.order_id) {
      const { data: failedPayment } = await db.from('payments').select('id,booking_id').eq('razorpay_order_id', payment.order_id).limit(1).single()
      await db.from('payments').update({ status: 'failed' }).eq('razorpay_order_id', payment.order_id).neq('status', 'captured')
      if (failedPayment) await notifyAdmin(`payment-failed:${failedPayment.id}`, failedPayment.booking_id, 'Advance payment failed. Check with the customer before holding the booking.')
    }
    await db.from('razorpay_webhook_events').update({ processed_at: new Date().toISOString() }).eq('event_id', eventId)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Razorpay webhook processing failed:', error)
    await db.from('razorpay_webhook_events').update({ error: error instanceof Error ? error.message : 'Processing failed' }).eq('event_id', eventId)
    return NextResponse.json({ error: 'Webhook processing failed; provider may retry.' }, { status: 500 })
  }
}
