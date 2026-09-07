// src/app/api/admin/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const direction = searchParams.get('direction')
  const date = searchParams.get('date')
  const requestedLimit = Number.parseInt(searchParams.get('limit') || '200', 10)
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 200

  let query = supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(limit)

  if (status && status !== 'all') query = query.eq('status', status)
  if (direction && direction !== 'all') query = query.eq('direction', direction)
  if (date) query = query.eq('travel_date', date)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bookings: data || [] })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createServiceClient()
    const { _action, id, ...updates } = body
    const updateBooking = async (bookingId: string, values: Record<string, unknown>) => {
      const { error } = await supabase.from('bookings').update(values).eq('id', bookingId)
      if (error) throw error
    }

    if (_action === 'create') {
      // Generate a booking ref
      const ref = 'BK' + Math.floor(1000 + Math.random() * 9000)
      const now = new Date().toISOString()
      const { data, error } = await supabase.from('bookings').insert({
        booking_ref: ref,
        direction: updates.direction || 'KI',
        drop_point: updates.drop_point || 'railway',
        drop_name: updates.drop_name || '',
        travel_date: updates.travel_date,
        pickup_time: updates.pickup_time || '09:00',
        is_night: updates.is_night || false,
        base_fare: Number(updates.base_fare) || 0,
        discount: Number(updates.discount) || 0,
        night_extra: Number(updates.night_extra) || 0,
        total_fare: Number(updates.total_fare) || 0,
        passenger_name: updates.passenger_name,
        phone: updates.phone,
        email: updates.email || null,
        status: updates.status || 'waiting',
        driver_id: updates.driver_id || null,
        driver_name: updates.driver_name || null,
        agent_id: updates.agent_id || null,
        agent_name: updates.agent_name || null,
        passenger_count: Number(updates.passenger_count) || 1,
        vehicle_type: updates.vehicle_type || 'sedan',
        advance_paid: Number(updates.advance_paid) || 0,
        notes: updates.notes || null,
        whatsapp_sent: false,
        email_sent: false,
        created_at: now,
        updated_at: now,
      }).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, booking: data })
    }

    if (_action === 'cancel') {
      await updateBooking(id, { status: 'cancelled', updated_at: new Date().toISOString() })
      return NextResponse.json({ success: true })
    }

    if (_action === 'assign_driver') {
      await updateBooking(id, {
        driver_id: updates.driver_id,
        driver_name: updates.driver_name,
        status: updates.status || 'confirmed',
        updated_at: new Date().toISOString()
      })
      return NextResponse.json({ success: true })
    }

    if (_action === 'assign_agent') {
      await updateBooking(id, {
        agent_id: updates.agent_id,
        agent_name: updates.agent_name,
        updated_at: new Date().toISOString()
      })
      return NextResponse.json({ success: true })
    }

    if (_action === 'link') {
      await updateBooking(id, {
        matched_with: updates.matched_with,
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      // Also update the other booking
      await updateBooking(updates.matched_with, {
        matched_with: id,
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      return NextResponse.json({ success: true })
    }

    if (_action === 'unlink') {
      await updateBooking(id, { matched_with: null, status: 'waiting', updated_at: new Date().toISOString() })
      if (updates.matched_with) {
        await updateBooking(updates.matched_with, { matched_with: null, status: 'waiting', updated_at: new Date().toISOString() })
      }
      return NextResponse.json({ success: true })
    }

    if (_action === 'update_status') {
      await updateBooking(id, {
        status: updates.status,
        updated_at: new Date().toISOString()
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
