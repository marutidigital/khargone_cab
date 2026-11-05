import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { sendInChatPaymentOrder } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { bookingId, amount, coupon } = await request.json().catch(() => ({}))
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
  const isCoupon2 = coupon === 'MARUTI2' || coupon === 'CAB2' || amount === 2
  const advance = isCoupon2 ? 2 : (amount ? Number(amount) : (booking.advance_amount || 500))

  if (isCoupon2 && booking.advance_amount !== 2) {
    await db.from('bookings').update({
      advance_amount: 2,
      balance_amount: Math.max(0, (booking.total_fare || (isKI ? 2200 : 1800)) - 2),
      discount: (booking.total_fare || (isKI ? 2200 : 1800)) > 500 ? 498 : 0,
      extras: { ...(booking.extras || {}), coupon_code: 'MARUTI2' },
    }).eq('id', booking.id)
  }

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

  return NextResponse.json({
    success: true,
    amount: advance,
    message: `In-chat payment request (₹${advance}) sent to ${booking.phone}`,
  })
}
