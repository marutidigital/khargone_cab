import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ref = (searchParams.get('ref') || '').trim()

  if (!ref) {
    return NextResponse.json({ error: 'Booking reference is required.' }, { status: 400 })
  }

  const db = createServiceClient()

  // Match by booking_ref (case insensitive) or public_token
  const cleanRef = ref.toUpperCase()
  let query = db.from('bookings').select('*')

  if (cleanRef.startsWith('KC')) {
    query = query.eq('booking_ref', cleanRef)
  } else {
    query = query.or(`booking_ref.eq.${cleanRef},public_token.eq.${ref}`)
  }

  const { data: bookings, error } = await query.limit(1)

  if (error || !bookings || bookings.length === 0) {
    return NextResponse.json({ error: 'Booking not found. Please verify reference ID.' }, { status: 404 })
  }

  const booking = bookings[0]

  const isIK = booking.direction === 'IK'
  const routeLabel = isIK ? 'Indore ➔ Khargone' : 'Khargone ➔ Indore'

  return NextResponse.json({
    success: true,
    booking: {
      id: booking.id,
      booking_ref: booking.booking_ref,
      passenger_name: booking.passenger_name || 'Passenger',
      phone: booking.phone,
      email: booking.email,
      direction: booking.direction,
      route_label: routeLabel,
      travel_date: booking.travel_date,
      pickup_time: booking.pickup_time ? String(booking.pickup_time).slice(0, 5) : '09:00',
      address: booking.address,
      vehicle: booking.vehicle || 'economy_sedan',
      total_fare: booking.total_fare || (isIK ? 1800 : 2200),
      advance_amount: booking.advance_amount || 500,
      advance_paid: booking.advance_paid || 0,
      balance_amount: booking.balance_amount ?? Math.max(0, (booking.total_fare || (isIK ? 1800 : 2200)) - (booking.advance_amount || 500)),
      status: booking.status,
      public_token: booking.public_token,
    },
  })
}
