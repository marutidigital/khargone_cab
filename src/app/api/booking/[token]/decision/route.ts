import { NextRequest, NextResponse } from 'next/server'
import { cancelUnconfirmedBooking, createWhatsAppUpgradeLink, refundWhatsAppBooking } from '@/lib/whatsapp-booking-actions'

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || !['cancel', 'refund', 'upgrade'].includes(body.action)) return NextResponse.json({ error: 'Choose a valid booking action.' }, { status: 400 })
  try {
    if (body.action === 'cancel') {
      const result = await cancelUnconfirmedBooking(token)
      return NextResponse.json({ success: true, status: result.status, refundProcessed: result.complete })
    }
    if (body.action === 'upgrade') {
      const result = await createWhatsAppUpgradeLink(token)
      return NextResponse.json({ success: true, status: result.url ? 'payment_required' : 'confirmed', paymentUrl: result.url, amount: result.amount })
    }
    const result = await refundWhatsAppBooking(token)
    return NextResponse.json({ success: true, status: result.complete ? 'refunded' : 'refund_pending' })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update booking.' }, { status: 409 })
  }
}
