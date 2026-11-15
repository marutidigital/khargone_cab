import { getRazorpayCredentials } from '@/lib/razorpay'

export async function fetchCapturedBookingPayment(paymentId: string, orderId: string, booking: { id: string; booking_ref: string; advance_amount?: number }) {
  if (!/^pay_[A-Za-z0-9]+$/.test(paymentId) || !/^order_[A-Za-z0-9]+$/.test(orderId)) throw new Error('Invalid payment identifiers.')
  const { keyId, keySecret } = getRazorpayCredentials()
  if (!keyId || !keySecret) throw new Error('Payment gateway is not configured.')
  const headers = { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}` }
  const [paymentResponse, orderResponse] = await Promise.all([
    fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, { headers, cache: 'no-store', signal: AbortSignal.timeout(15000) }),
    fetch(`https://api.razorpay.com/v1/orders/${orderId}`, { headers, cache: 'no-store', signal: AbortSignal.timeout(15000) }),
  ])
  if (!paymentResponse.ok || !orderResponse.ok) throw new Error('Could not verify payment with Razorpay.')
  const payment = await paymentResponse.json()
  const order = await orderResponse.json()
  assertCapturedBookingPayment(payment, order, booking)
  return Number(payment.amount) / 100
}

export function assertCapturedBookingPayment(payment: any, order: any, booking: { id: string; booking_ref: string; advance_amount?: number }) {
  if (payment.status !== 'captured' || payment.order_id !== order.id || payment.currency !== 'INR') throw new Error('Payment is not captured for this order.')
  if (order.notes?.booking_id !== booking.id && order.notes?.booking_ref !== booking.booking_ref) throw new Error('Payment does not belong to this booking.')
  const expectedPaise = Math.round(Number(booking.advance_amount || 500) * 100)
  if (Number(payment.amount) !== expectedPaise || Number(order.amount) !== expectedPaise) throw new Error('Payment amount does not match the booking advance.')
}
