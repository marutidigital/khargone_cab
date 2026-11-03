import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'

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

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, payment_id, and razorpay_signature.' },
        { status: 400 }
      )
    }

    const payload = `${orderId}|${paymentId}`
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex')

    // Timing-safe comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8')
    const suppliedBuffer = Buffer.from(signature, 'utf-8')

    const isValid =
      expectedBuffer.length === suppliedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment verification failed: Invalid signature.',
        },
        { status: 400 }
      )
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
