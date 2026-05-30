// src/app/api/drivers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = supabase.from('drivers').select('*').order('created_at', { ascending: false })
  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ drivers: data || [] })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createServiceClient()

    if (body._action === 'delete') {
      await supabase.from('drivers').update({ status: 'inactive' }).eq('id', body.id)
      return NextResponse.json({ success: true })
    }

    if (body._action === 'update') {
      const { _action, id, ...updates } = body
      await supabase.from('drivers').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
      return NextResponse.json({ success: true })
    }

    // Create new driver
    const { data, error } = await supabase.from('drivers').insert({
      name: body.name,
      phone: body.phone,
      vehicle_type: body.vehicle_type || 'sedan',
      vehicle_number: body.vehicle_number || '',
      vehicle_model: body.vehicle_model || '',
      status: 'active',
      rating: 4.5,
      trips_completed: 0,
    })

    if (error) throw error
    return NextResponse.json({ driver: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
