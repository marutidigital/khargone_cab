// src/app/api/admin/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const direction = searchParams.get('direction')
  const date = searchParams.get('date')
  const limit = parseInt(searchParams.get('limit') || '200', 10)

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

    if (_action === 'cancel') {
      await supabase.from('bookings').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id)
      return NextResponse.json({ success: true })
    }

    if (_action === 'assign_driver') {
      await supabase.from('bookings').update({
        driver_id: updates.driver_id,
        driver_name: updates.driver_name,
        status: updates.status || 'confirmed',
        updated_at: new Date().toISOString()
      }).eq('id', id)
      return NextResponse.json({ success: true })
    }

    if (_action === 'assign_agent') {
      await supabase.from('bookings').update({
        agent_id: updates.agent_id,
        agent_name: updates.agent_name,
        updated_at: new Date().toISOString()
      }).eq('id', id)
      return NextResponse.json({ success: true })
    }

    if (_action === 'link') {
      await supabase.from('bookings').update({
        matched_with: updates.matched_with,
        status: 'confirmed',
        updated_at: new Date().toISOString()
      }).eq('id', id)
      // Also update the other booking
      await supabase.from('bookings').update({
        matched_with: id,
        status: 'confirmed',
        updated_at: new Date().toISOString()
      }).eq('id', updates.matched_with)
      return NextResponse.json({ success: true })
    }

    if (_action === 'update_status') {
      await supabase.from('bookings').update({
        status: updates.status,
        updated_at: new Date().toISOString()
      }).eq('id', id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
