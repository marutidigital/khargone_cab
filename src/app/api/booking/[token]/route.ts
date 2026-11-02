import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  const { data, error } = await createServiceClient().from('bookings')
    .select('booking_ref,mode,status,direction,drop_name,travel_date,pickup_time,passenger_count,passenger_name,phone,total_fare,advance_amount,advance_paid,balance_amount,cutoff_at,refund_status,driver_name,driver_id,address')
    .eq('public_token', token).limit(1).single()
  if (error || !data) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  const { data: driver } = data.driver_id
    ? await createServiceClient().from('drivers').select('name,phone,vehicle_number').eq('id', data.driver_id).limit(1).single()
    : { data: null }
  return NextResponse.json({ booking: { ...data, phone: `${String(data.phone).slice(0, 2)}••••••${String(data.phone).slice(-2)}`, driver: driver ?? null } }, { headers: { 'Cache-Control': 'no-store' } })
}
