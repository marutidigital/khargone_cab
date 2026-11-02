import { createServiceClient } from '@/lib/supabase-server'
import { calculateBookingFare, type DropPointId } from '@/lib/config'
import { createRazorpayPaymentLink, refundRazorpayPayment } from '@/lib/razorpay'
import { notify, notifyAdmin } from '@/lib/booking-notifications'

export async function createWhatsAppUpgradeLink(token: string) {
  const db = createServiceClient()
  const { data: booking, error } = await db.from('bookings').select('*').eq('public_token', token).limit(1).single()
  if (error || !booking || booking.status !== 'no_match_decision' || booking.mode !== 'match') throw new Error('This booking is not awaiting an upgrade.')
  const fare = calculateBookingFare({ mode: 'guaranteed', point: booking.drop_point as DropPointId, pickupTime: String(booking.pickup_time).slice(0, 5) })
  const difference = Math.max(0, fare.totalFare - Number(booking.total_fare || 0))
  if (difference === 0) {
    const { error: updateError } = await db.from('bookings').update({ mode: 'guaranteed', status: 'confirmed', base_fare: fare.baseFare, night_extra: fare.nightSurcharge, total_fare: fare.totalFare, balance_amount: Math.max(0, fare.totalFare - Number(booking.advance_paid || booking.advance_amount || 0)), cutoff_at: null, refund_status: 'not_applicable' }).eq('id', booking.id).eq('status', 'no_match_decision')
    if (updateError) throw new Error('Could not upgrade this booking.')
    await notify('payment_captured', booking.id, { eventVersion: 'upgrade:no-difference' })
    return { amount: 0, url: null }
  }
  const existing = await db.from('payments').select('razorpay_payment_link_id,payment_link_url,status').eq('booking_id', booking.id).eq('purpose', 'upgrade').in('status', ['created', 'authorized']).limit(1).single()
  if (existing.data?.razorpay_payment_link_id) {
    return { amount: difference, url: existing.data.payment_link_url || null, paymentLinkId: existing.data.razorpay_payment_link_id }
  }
  const baseUrl = process.env.APP_BASE_URL || 'https://maruticab.in'
  const link = await createRazorpayPaymentLink({
    amount: difference,
    description: `MarutiCab guaranteed ride upgrade ${booking.booking_ref}`,
    referenceId: `upgrade_${String(booking.id).slice(0, 30)}`,
    customer: { name: booking.passenger_name, contact: `+91${String(booking.phone).replace(/\D/g, '').slice(-10)}` },
    callbackUrl: `${baseUrl}/booking/${token}`,
    notes: { booking_id: booking.id, booking_token: token, purpose: 'upgrade' },
  })
  const { error: insertError } = await db.from('payments').insert({ booking_id: booking.id, purpose: 'upgrade', razorpay_payment_link_id: link.id, payment_link_url: link.short_url, amount: difference, status: 'created' })
  if (insertError) throw new Error('The payment link was created but could not be saved. Contact support before retrying.')
  return { amount: difference, url: link.short_url, paymentLinkId: link.id }
}

export async function refundWhatsAppBooking(token: string) {
  const db = createServiceClient()
  const { data: booking } = await db.from('bookings').select('*').eq('public_token', token).limit(1).single()
  if (!booking || booking.status !== 'no_match_decision' || booking.mode !== 'match') throw new Error('This booking is not awaiting a refund decision.')
  const { data: payment } = await db.from('payments').select('*').eq('booking_id', booking.id).eq('purpose', 'advance').limit(1).single()
  if (!payment?.razorpay_payment_id || !['captured', 'refund_pending'].includes(payment.status)) throw new Error('A refundable captured advance could not be found.')
  const idempotencyKey = payment.refund_idempotency_key || `whatsapp_refund_${booking.id}`
  await db.from('payments').update({ status: 'refund_pending', refund_idempotency_key: idempotencyKey }).eq('id', payment.id).in('status', ['captured', 'refund_pending'])
  let result: Awaited<ReturnType<typeof refundRazorpayPayment>>
  try {
    result = await refundRazorpayPayment(payment.razorpay_payment_id, payment.amount, idempotencyKey)
  } catch (error) {
    await db.from('payments').update({ status: 'refund_pending', refund_idempotency_key: idempotencyKey }).eq('id', payment.id)
    await db.from('bookings').update({ refund_status: 'failed' }).eq('id', booking.id)
    await notifyAdmin(`refund-failed:${booking.id}`, booking.id, 'Customer refund request failed at the payment provider. Retry from admin.')
    throw error
  }
  const complete = result.status === 'processed'
  await db.from('payments').update({ status: complete ? 'refunded' : 'refund_pending', refund_id: result.id, refunded_at: complete ? new Date().toISOString() : null }).eq('id', payment.id)
  await db.from('bookings').update({ status: complete ? 'refunded' : 'no_match_decision', refund_status: complete ? 'processed' : 'pending' }).eq('id', booking.id)
  if (complete) await notify('refund_processed', booking.id, { eventVersion: 'whatsapp-refund' })
  return { complete }
}
