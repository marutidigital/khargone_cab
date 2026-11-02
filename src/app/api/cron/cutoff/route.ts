import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { refundRazorpayPayment } from '@/lib/razorpay'
import { notify, notifyAdmin } from '@/lib/booking-notifications'
import { sendBookingAutomation } from '@/lib/whatsapp-automation'
import { isAutoRefundDue, isCutoffExpired } from '@/lib/config'

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`)
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = createServiceClient()
  const now = new Date().toISOString()
  const { data: waitingBookings, error } = await db.from('bookings').select('*').eq('mode', 'match').eq('status', 'waiting').limit(500)
  if (error) return NextResponse.json({ error: 'Could not load bookings for cutoff.' }, { status: 503 })
  const cutoffBookings = (waitingBookings ?? []).filter((booking: { cutoff_at?: string | null }) => isCutoffExpired(booking.cutoff_at, new Date(now)))
  let cutoffCount = 0
  for (const booking of cutoffBookings ?? []) {
    const { data: changed, error: updateError } = await db.from('bookings').update({ status: 'no_match_decision', no_match_at: now, decision_at: now }).eq('id', booking.id).eq('status', 'waiting').select('id')
    if (updateError || !changed?.length) continue
    cutoffCount++
    if (Number(booking.advance_paid || 0) > 0) await notify('no_match', booking.id)
    else await sendBookingAutomation('no_match', { ...booking, status: 'no_match_decision' }).catch(() => false)
    await notifyAdmin(`cutoff:${booking.id}`, booking.id, 'Match Deal reached cutoff without a compatible return booking.')
  }
  const { data: decisions } = await db.from('bookings').select('*').eq('mode', 'match').eq('status', 'no_match_decision').eq('refund_status', 'pending').limit(500)
  const expired = (decisions ?? []).filter((booking: { decision_at?: string | null }) => isAutoRefundDue(booking.decision_at, new Date(now)))
  let refunded = 0
  for (const booking of expired ?? []) {
    const { data: payment } = await db.from('payments').select('*').eq('booking_id', booking.id).eq('purpose', 'advance').limit(1).single()
    if (!payment?.razorpay_payment_id || !['captured', 'refund_pending'].includes(payment.status)) continue
    const idempotencyKey = payment.refund_idempotency_key || `cutoff_refund_${booking.id}`
    await db.from('payments').update({ status: 'refund_pending', refund_idempotency_key: idempotencyKey }).eq('id', payment.id).in('status', ['captured', 'refund_pending'])
    try {
      const result = await refundRazorpayPayment(payment.razorpay_payment_id, payment.amount, idempotencyKey)
      const complete = result.status === 'processed'
      await db.from('payments').update({ status: complete ? 'refunded' : 'refund_pending', refund_id: result.id, refunded_at: complete ? new Date().toISOString() : null }).eq('id', payment.id)
      await db.from('bookings').update({ status: complete ? 'refunded' : 'no_match_decision', refund_status: complete ? 'processed' : 'pending' }).eq('id', booking.id)
      if (complete) { refunded++; await notify('refund_processed', booking.id) }
    } catch (cause) {
      console.error('Automatic refund failed:', cause instanceof Error ? cause.message : 'provider error')
      await notifyAdmin(`refund-failed:${booking.id}`, booking.id, 'Automatic refund failed. Retry the advance refund from admin.')
    }
  }
  return NextResponse.json({ cutoffCount, refunded })
}
