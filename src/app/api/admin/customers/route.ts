// src/app/api/admin/customers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { authorizeAdminRequest } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const auth = await authorizeAdminRequest(req)
  if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const tier = searchParams.get('tier')
  const search = searchParams.get('search')?.trim().toLowerCase()

  let query = supabase.from('customers').select('*').order('last_booking_at', { ascending: false })

  if (tier && tier !== 'all') {
    query = query.eq('tier', tier)
  }

  const { data: customers, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also fetch all past bookings to attach full journey history
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id,booking_ref,passenger_name,phone,direction,drop_name,travel_date,pickup_time,total_fare,status,created_at')
    .order('created_at', { ascending: false })

  const bookingsByPhone = new Map<string, any[]>()
  for (const b of bookings || []) {
    const list = bookingsByPhone.get(b.phone) || []
    list.push(b)
    bookingsByPhone.set(b.phone, list)
  }

  const enriched = ((customers || []) as any[]).map((c: any) => ({
    ...c,
    rides: bookingsByPhone.get(c.phone) || [],
  })).filter((c: any) => {
    if (!search) return true
    return (
      (c.name || '').toLowerCase().includes(search) ||
      (c.phone || '').toLowerCase().includes(search) ||
      (c.notes && c.notes.toLowerCase().includes(search))
    )
  })

  return NextResponse.json({ customers: enriched })
}

export async function PATCH(req: NextRequest) {
  const auth = await authorizeAdminRequest(req)
  if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status })

  try {
    const body = await req.json()
    const { id, notes, tags, tier } = body

    if (!id) return NextResponse.json({ error: 'Customer ID is required.' }, { status: 400 })

    const supabase = createServiceClient()
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (typeof notes === 'string') updates.notes = notes
    if (Array.isArray(tags)) updates.tags = tags
    if (tier && ['new', 'frequent', 'vip'].includes(tier)) updates.tier = tier

    const { error } = await supabase.from('customers').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Could not update customer.' }, { status: 500 })
  }
}
