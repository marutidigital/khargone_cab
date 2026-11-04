import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { refundRazorpayPayment } from '@/lib/razorpay'
import { sendWhatsAppTemplateMessage } from '@/lib/whatsapp-templates'

export async function GET() {
  const db = createServiceClient()

  const { data: payments } = await db
    .from('payments')
    .select('*, bookings(booking_ref, passenger_name, phone, direction, total_fare)')
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: refunds } = await db
    .from('refunds')
    .select('*, bookings(booking_ref, passenger_name, phone, direction)')
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({
    payments: payments || [],
    refunds: refunds || [],
  })
}

export async function POST(request: NextRequest) {
  // Retry a failed refund
  const db = createServiceClient()
  const body = await request.json().catch(() => null)
  const refundId = body?.refund_id

  if (!refundId) {
    return NextResponse.json({ error: 'Missing refund_id' }, { status: 400 })
  }

  const { data: refund } = await db
    .from('refunds')
    .select('*, bookings(*)')
    .eq('id', refundId)
    .single()

  if (!refund || !refund.bookings) {
    return NextResponse.json({ error: 'Refund record or booking not found' }, { status: 404 })
  }

  const booking = refund.bookings
  let paymentId = booking.extras?.razorpay_payment_id

  if (!paymentId) {
    const { data: payRow } = await db
      .from('payments')
      .select('provider_payment_id')
      .eq('booking_id', booking.id)
      .limit(1)
      .single()
    paymentId = payRow?.provider_payment_id
  }

  if (!paymentId) {
    return NextResponse.json({ error: 'Missing Razorpay payment ID for refund' }, { status: 400 })
  }

  const idempotencyKey = `retry_refund_${refund.id}_${Date.now()}`
  try {
    const refundResult = await refundRazorpayPayment(
      paymentId,
      Number(refund.amount || 500),
      idempotencyKey
    )

    const isSuccess = refundResult.status === 'processed' || refundResult.status === 'submitted'

    await db.from('refunds').update({
      refund_status: isSuccess ? 'processed' : 'processing',
      provider_refund_id: refundResult.id,
      failure_reason: null,
      processed_at: isSuccess ? new Date().toISOString() : null,
    }).eq('id', refund.id)

    await db.from('bookings').update({
      refund_status: isSuccess ? 'processed' : 'processing',
    }).eq('id', booking.id)

    // Send WhatsApp notification
    await sendWhatsAppTemplateMessage({
      toPhone: booking.phone,
      templateCode: 'refund_initiated',
      variables: [
        booking.passenger_name || 'Passenger',
        booking.booking_ref,
        refundResult.id || idempotencyKey,
      ],
      bookingId: booking.id,
    })

    return NextResponse.json({ success: true, refundResult })
  } catch (err: any) {
    await db.from('refunds').update({
      failure_reason: err?.message || 'Retry failed',
    }).eq('id', refund.id)

    return NextResponse.json({ error: err?.message || 'Refund retry failed' }, { status: 500 })
  }
}
