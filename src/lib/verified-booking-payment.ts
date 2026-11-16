import { getRazorpayCredentials } from '@/lib/razorpay'

export async function fetchRazorpayOrder(orderId: string) {
  if (!/^order_[A-Za-z0-9]+$/.test(orderId)) throw new Error('Invalid payment order.')
  const { keyId, keySecret } = getRazorpayCredentials()
  if (!keyId || !keySecret) throw new Error('Payment gateway is not configured.')
  const response = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}` },
    cache: 'no-store', signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error('Could not fetch the payment order from Razorpay.')
  return response.json()
}

export async function fetchCapturedBookingPayment(paymentId: string, orderId: string, booking: { id: string; booking_ref: string; advance_amount?: number; extras?: {razorpay_order_id?: string} }) {
  if (booking.extras?.razorpay_order_id && booking.extras.razorpay_order_id !== orderId) throw new Error('Payment order does not belong to this booking.')
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

export function assertCapturedBookingPayment(payment: any, order: any, booking: { id: string; booking_ref: string; advance_amount?: number; extras?: {razorpay_order_id?: string} }) {
  if (booking.extras?.razorpay_order_id && booking.extras.razorpay_order_id !== order.id) throw new Error('Payment order does not belong to this booking.')
  if (payment.status !== 'captured' || payment.order_id !== order.id || payment.currency !== 'INR') throw new Error('Payment is not captured for this order.')
  if (order.notes?.booking_id !== booking.id && order.notes?.booking_ref !== booking.booking_ref) throw new Error('Payment does not belong to this booking.')
  const expectedPaise = Math.round(Number(booking.advance_amount || 500) * 100)
  if (Number(payment.amount) !== expectedPaise || Number(order.amount) !== expectedPaise) throw new Error('Payment amount does not match the booking advance.')
}
