import { createServiceClient } from '@/lib/supabase-server'
import { notify, notifyAdmin } from '@/lib/booking-notifications'
import { calculateBookingFare, type DropPointId } from '@/lib/config'

export async function recordCapturedAdvance(orderId: string, paymentId: string) {
  const db = createServiceClient()
  const { data: payment, error: paymentReadError } = await db.from('payments')
    .select('id,booking_id,amount,status').eq('razorpay_order_id', orderId).limit(1).single()
  if (paymentReadError || !payment) throw new Error('Payment order was not found.')
  if (payment.status === 'captured') return { bookingId: payment.booking_id, alreadyProcessed: true }
  const { data: booking, error: bookingReadError } = await db.from('bookings')
    .select('id,mode,status,travel_date,pickup_time,direction').eq('id', payment.booking_id).single()
  if (bookingReadError || !booking || booking.status !== 'pending_payment') throw new Error('Booking is not awaiting payment.')
  const { error: paymentUpdateError } = await db.from('payments').update({ status: 'captured', razorpay_payment_id: paymentId, captured_at: new Date().toISOString() }).eq('id', payment.id).neq('status', 'captured')
  if (paymentUpdateError) throw paymentUpdateError
  const { error: bookingUpdateError } = await db.from('bookings').update({
    status: booking.mode === 'match' ? 'waiting' : 'confirmed', advance_paid: payment.amount,
    refund_status: booking.mode === 'match' ? 'pending' : 'not_applicable',
  }).eq('id', booking.id).eq('status', 'pending_payment')
  if (bookingUpdateError) throw bookingUpdateError
  let matched = false
  if (booking.mode === 'match') {
    const { error } = await db.rpc('try_match_booking', { p_booking_id: booking.id, p_min_gap_hours: 4, p_max_gap_hours: 8 })
    if (error) console.error('Match lookup after payment failed:', error)
    const { data: refreshed } = await db.from('bookings').select('*').eq('id', booking.id).single()
    matched = refreshed?.status === 'matched'
    await notifyAdmin('new-waiting', booking.id, 'New paid Match Deal booking is waiting for dispatch.')
    if (matched && refreshed?.match_id) {
      const { data: pair } = await db.from('bookings').select('*').eq('match_id', refreshed.match_id)
      for (const ride of pair ?? []) await notify('payment_captured', ride.id)
    } else {
      await notify('payment_captured', booking.id)
    }
  } else {
    const { data: refreshed } = await db.from('bookings').select('*').eq('id', booking.id).single()
    if (refreshed) await notify('payment_captured', booking.id)
  }
  return { bookingId: booking.id, alreadyProcessed: false, matched }
}

export async function recordCapturedUpgrade(paymentLinkId: string, paymentId: string) {
  const db = createServiceClient()
  const { data: payment } = await db.from('payments').select('*').eq('razorpay_payment_link_id', paymentLinkId).limit(1).single()
  if (!payment || payment.purpose !== 'upgrade') throw new Error('Upgrade payment link was not found.')
  if (payment.status === 'captured') return { bookingId: payment.booking_id, alreadyProcessed: true }
  const { data: booking } = await db.from('bookings').select('*').eq('id', payment.booking_id).single()
  if (!booking || booking.status !== 'no_match_decision' || booking.mode !== 'match') throw new Error('Booking is no longer awaiting an upgrade.')
  const fare = calculateBookingFare({ mode: 'guaranteed', direction: booking.direction === 'IK' ? 'I2K' : 'K2I', point: booking.drop_point as DropPointId, pickupTime: String(booking.pickup_time).slice(0, 5) })
  const alreadyPaid = Number(booking.advance_paid || booking.advance_amount || 0)
  const newAdvancePaid = alreadyPaid + Number(payment.amount)
  const { error: paymentError } = await db.from('payments').update({ status: 'captured', razorpay_payment_id: paymentId, captured_at: new Date().toISOString() }).eq('id', payment.id).neq('status', 'captured')
  if (paymentError) throw paymentError
  const { error } = await db.from('bookings').update({
    mode: 'guaranteed', status: 'confirmed', base_fare: fare.baseFare, night_extra: fare.nightSurcharge,
    total_fare: fare.totalFare, advance_paid: newAdvancePaid, advance_amount: newAdvancePaid,
    balance_amount: Math.max(0, fare.totalFare - newAdvancePaid), cutoff_at: null, refund_status: 'not_applicable',
  }).eq('id', booking.id).eq('status', 'no_match_decision')
  if (error) throw error
  await notify('payment_captured', booking.id, { eventVersion: `upgrade:${payment.id}` })
  return { bookingId: booking.id, alreadyProcessed: false }
}
