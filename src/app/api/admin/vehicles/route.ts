import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET() {
  const db = createServiceClient()
  const { data: vehicles, error } = await db
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ vehicles: vehicles || [] })
}

export async function POST(request: NextRequest) {
  const db = createServiceClient()
  const body = await request.json().catch(() => null)

  if (!body?.registration_number || !body?.vehicle_model) {
    return NextResponse.json({ error: 'Registration number and model are required.' }, { status: 400 })
  }

  const { data: newVehicle, error } = await db
    .from('vehicles')
    .insert({
      registration_number: body.registration_number.trim().toUpperCase(),
      vehicle_model: body.vehicle_model.trim(),
      seating_capacity: body.seating_capacity || 4,
      availability_status: body.availability_status || 'available',
      active: body.active !== undefined ? body.active : true,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, vehicle: newVehicle })
}
