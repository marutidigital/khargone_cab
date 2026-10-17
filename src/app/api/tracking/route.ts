// src/app/api/tracking/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { z } from 'zod'

const TrackEventSchema = z.object({
  session_id: z.string().min(1),
  event: z.enum([
    'page_view',
    'route_selected',
    'vehicle_selected',
    'date_selected',
    'details_filled',
    'payment_screen_reached',
    'whatsapp_clicked',
  ]),
  direction: z.enum(['KI', 'IK']).optional(),
  vehicle: z.enum(['sedan', 'suv']).optional(),
  point: z.string().optional(),
  travel_date: z.string().optional(),
  time_slot: z.string().optional(),
  price: z.number().int().optional(),
  phone: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  consent: z.boolean().optional(),
})

// POST /api/tracking - log an event
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = TrackEventSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const {
      session_id,
      event,
      direction,
      vehicle,
      point,
      travel_date,
      time_slot,
      price,
      name,
      consent,
    } = parsed.data

    // Only store phone if user explicitly gave consent
    const phoneToStore = consent ? (parsed.data.phone ?? null) : null

    const supabase = createServiceClient()

    const eventRecord = {
      session_id,
      event,
      direction: direction || null,
      vehicle: vehicle || null,
      point: point || null,
      travel_date: travel_date || null,
      time_slot: time_slot || null,
      price: price ?? null,
      phone: phoneToStore,
      name: name || null,
      paid: false,
    }

    const { data, error } = await supabase
      .from('booking_events')
      .insert(eventRecord)
      .select()

    if (error) {
      console.warn('Tracking insert warning (non-fatal):', error.message)
      return NextResponse.json({ recorded: false, error: error.message }, { status: 200 })
    }

    return NextResponse.json({ recorded: true, data }, { status: 201 })
  } catch (err: any) {
    console.error('Tracking API error:', err)
    // Non-blocking response so analytics issues never disrupt booking experience
    return NextResponse.json({ recorded: false, error: err.message }, { status: 200 })
  }
}

// GET /api/tracking - fetch tracking events & aggregated counts for Admin
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const eventType = searchParams.get('event') || 'payment_screen_reached'
    const limit = Number.parseInt(searchParams.get('limit') || '100', 10)

    const supabase = createServiceClient()

    // 1. Fetch rows matching event type (default payment_screen_reached)
    const { data: rows, error: rowsErr } = await supabase
      .from('booking_events')
      .select('*')
      .eq('event', eventType)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (rowsErr) {
      console.warn('Failed to fetch tracking rows:', rowsErr.message)
    }

    const items = rows || []

    // 2. Compute aggregated counts by direction, vehicle, point, and travel_date
    const counts = {
      total: items.length,
      paidTokens: items.filter((r: any) => r.paid === true).length,
      byDirection: { KI: 0, IK: 0 } as Record<string, number>,
      byVehicle: { sedan: 0, suv: 0 } as Record<string, number>,
      byPoint: {} as Record<string, number>,
      byDate: {} as Record<string, number>,
    }

    for (const item of items) {
      if (item.direction) {
        counts.byDirection[item.direction] = (counts.byDirection[item.direction] || 0) + 1
      }
      if (item.vehicle) {
        counts.byVehicle[item.vehicle] = (counts.byVehicle[item.vehicle] || 0) + 1
      }
      if (item.point) {
        counts.byPoint[item.point] = (counts.byPoint[item.point] || 0) + 1
      }
      if (item.travel_date) {
        counts.byDate[item.travel_date] = (counts.byDate[item.travel_date] || 0) + 1
      }
    }

    return NextResponse.json({
      events: items,
      counts,
    })
  } catch (err: any) {
    console.error('Tracking GET error:', err)
    return NextResponse.json({ events: [], counts: null, error: err.message }, { status: 500 })
  }
}

// PATCH /api/tracking - toggle "paid" status for paid tokens tracking
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, paid } = body
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('booking_events')
      .update({ paid: !!paid })
      .eq('id', id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
