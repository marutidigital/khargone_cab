import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase-server'
import { fetchRazorpayPayment, verifyRazorpayPaymentSignature } from '@/lib/razorpay'
import { recordCapturedAdvance } from '@/lib/payment-state'

const Input = z.object({ razorpay_order_id: z.string().min(5), razorpay_payment_id: z.string().min(5), razorpay_signature: z.string().min(10), publicToken: z.string().min(30) })

export async function POST(request: NextRequest) {
  const parsed = Input.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payment response.' }, { status: 400 })
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature, publicToken } = parsed.data
  if (!verifyRazorpayPaymentSignature(orderId, paymentId, signature)) return NextResponse.json({ error: 'Payment signature could not be verified.' }, { status: 400 })
  try {
    const db = createServiceClient()
    const { data: payment } = await db.from('payments').select('amount,booking_id').eq('razorpay_order_id', orderId).limit(1).single()
    const { data: booking } = await db.from('bookings').select('id').eq('id', payment?.booking_id).eq('public_token', publicToken).limit(1).single()
    if (!payment || !booking) return NextResponse.json({ error: 'This payment does not belong to the booking.' }, { status: 404 })
    const remote = await fetchRazorpayPayment(paymentId)
    if (remote.order_id !== orderId || remote.status !== 'captured' || remote.amount !== payment.amount * 100 || remote.currency !== 'INR') {
      return NextResponse.json({ error: 'Razorpay has not confirmed this payment yet.' }, { status: 409 })
    }
    await recordCapturedAdvance(orderId, paymentId)
    return NextResponse.json({ success: true, statusUrl: `/booking/${publicToken}` })
  } catch (error) {
    console.error('Razorpay callback verification failed:', error)
    return NextResponse.json({ error: 'Payment is received but booking confirmation is still syncing. Check your booking status shortly.' }, { status: 503 })
  }
}
