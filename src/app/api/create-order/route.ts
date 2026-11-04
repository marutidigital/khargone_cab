import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'

export async function POST(req: NextRequest) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: 'Razorpay API credentials are not configured.' },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { amount, currency = 'INR', receipt, notes } = body

    // Amount must be in paise and at least 100 paise (Rs 1.00)
    let numAmount = Number(amount)
    // If passed in rupees (< 100 but >= 1), convert to paise
    if (Number.isFinite(numAmount) && numAmount >= 1 && numAmount < 100) {
      numAmount = Math.round(numAmount * 100)
    }

    if (!Number.isFinite(numAmount) || numAmount < 100) {
      return NextResponse.json(
        { error: 'Amount is required and must be at least 100 paise (Rs 1.00).' },
        { status: 400 }
      )
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })

    const orderReceipt = receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const order = await razorpay.orders.create({
      amount: Math.round(numAmount),
      currency: currency.toUpperCase(),
      receipt: orderReceipt,
      notes: notes || {},
    })

    return NextResponse.json({
      order_id: order.id,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
    })
  } catch (error: any) {
    console.error('Razorpay create-order error:', error)
    return NextResponse.json(
      {
        error: error?.message || error?.description || 'Failed to create Razorpay order.',
      },
      { status: 500 }
    )
  }
}
