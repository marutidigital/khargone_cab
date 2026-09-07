// src/app/api/agents/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = supabase.from('agents').select('*').order('created_at', { ascending: false })
  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ agents: data || [] })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createServiceClient()

    if (body._action === 'delete') {
      const { error } = await supabase.from('agents').update({ status: 'inactive' }).eq('id', body.id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (body._action === 'update') {
      const { id, ...updates } = body
      delete updates._action
      const { error } = await supabase.from('agents').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // Create new agent
    const { data, error } = await supabase.from('agents').insert({
      name: body.name,
      phone: body.phone,
      email: body.email || '',
      area: body.area || 'Khargone',
      commission_pct: body.commission_pct || 10,
      status: 'active',
      bookings_linked: 0,
    })

    if (error) throw error
    return NextResponse.json({ agent: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
