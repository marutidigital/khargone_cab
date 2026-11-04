import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { secureAndConfirmMatch } from '@/lib/matching-engine'

export async function GET() {
  const db = createServiceClient()

  // 1. Confirmed matches
  const { data: matches } = await db
    .from('matches')
    .select('*, drivers(name, phone), booking_out:bookings!matches_booking_out_fkey(*), booking_back:bookings!matches_booking_back_fkey(*)')
    .order('created_at', { ascending: false })
    .limit(30)

  // 2. Pending waiting bookings (unmatched)
  const { data: waitingKI } = await db
    .from('bookings')
    .select('*')
    .eq('direction', 'KI')
    .in('status', ['waiting', 'pending_payment'])
    .is('match_id', null)
    .order('travel_date', { ascending: true })

  const { data: waitingIK } = await db
    .from('bookings')
    .select('*')
    .eq('direction', 'IK')
    .in('status', ['waiting', 'pending_payment'])
    .is('match_id', null)
    .order('travel_date', { ascending: true })

  return NextResponse.json({
    matches: matches || [],
    waitingKI: waitingKI || [],
    waitingIK: waitingIK || [],
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body?.booking_out_id || !body?.booking_back_id) {
    return NextResponse.json({ error: 'Outward and return booking IDs are required.' }, { status: 400 })
  }

  const result = await secureAndConfirmMatch({
    bookingOutId: body.booking_out_id,
    bookingBackId: body.booking_back_id,
    driverId: body.driver_id,
    vehicleId: body.vehicle_id,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true, matchId: result.matchId })
}
