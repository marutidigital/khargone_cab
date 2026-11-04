import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { sendInChatPaymentOrder } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { bookingId } = await request.json().catch(() => ({}))
  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
  }

  const db = createServiceClient()
  const { data: booking, error } = await db.from('bookings').select('*').eq('id', bookingId).single()
  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const isKI = booking.direction === 'KI' || booking.direction === 'K2I'
  const routeName = isKI ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'
  const advance = booking.advance_amount || 500

  const res = await sendInChatPaymentOrder({
    to: booking.phone,
    amountInRs: advance,
    bookingRef: booking.booking_ref,
    bookingId: booking.id,
    customerName: booking.passenger_name || 'Passenger',
    routeName,
    travelDate: booking.travel_date || '',
    pickupTime: String(booking.pickup_time || '').slice(0, 5),
  })

  if (!res.success) {
    return NextResponse.json({ error: res.error || 'Failed to dispatch WhatsApp payment order' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: `In-chat payment request sent to ${booking.phone}` })
}
