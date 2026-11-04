import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const phoneParam = request.nextUrl.searchParams.get('phone') || ''
  const cleanPhone = phoneParam.replace(/\D/g, '').slice(-10)

  if (!cleanPhone || cleanPhone.length !== 10) {
    return NextResponse.json({ error: 'Please enter a valid 10-digit phone number.' }, { status: 400 })
  }

  const db = createServiceClient()
  const { data: bookings, error } = await db
    .from('bookings')
    .select('id,booking_ref,direction,drop_name,travel_date,pickup_time,status,total_fare,advance_paid,balance_amount,public_token,driver_name,created_at')
    .eq('phone', cleanPhone)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error fetching customer rides:', error)
    return NextResponse.json({ error: 'Failed to look up rides.' }, { status: 500 })
  }

  return NextResponse.json({ phone: cleanPhone, bookings: bookings || [] })
}
