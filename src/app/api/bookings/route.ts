// src/app/api/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendBookingConfirmation, sendMatchNotification } from '@/lib/whatsapp'
import { sendBookingEmail, sendAdminAlert, sendMatchEmail } from '@/lib/email'
import { calcPrice, isNightHour } from '@/lib/constants'
import { z } from 'zod'
import type { Booking } from '@/types'

const BookingSchema = z.object({
  direction:      z.enum(['KI', 'IK']),
  drop_point:     z.enum(['rajendra', 'railway', 'airport']),
  drop_name:      z.string().min(2),
  travel_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pickup_time:    z.string().regex(/^\d{2}:\d{2}$/),
  passenger_name: z.string().min(2).max(60),
  phone:          z.string().regex(/^\d{10}$/),
  email:          z.string().email().optional().or(z.literal('')),
  extra:          z.number().int().min(0),
  days_ahead:     z.number().int().min(1).max(60),
  vehicle:        z.enum(['sedan', 'suv']).optional(),
})

// GET /api/bookings?direction=KI&date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const supabase = createServiceClient()

  let query = supabase
    .from('bookings')
    .select('id,booking_ref,direction,drop_name,travel_date,pickup_time,status,is_night,total_fare,created_at')
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(50)

  const dir  = searchParams.get('direction')
  const date = searchParams.get('date')
  if (dir)  query = query.eq('direction', dir)
  if (date) query = query.eq('travel_date', date)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bookings: data })
}

// POST /api/bookings
export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const parsed = BookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const d = parsed.data
    const [h] = d.pickup_time.split(':').map(Number)
    const isNight = isNightHour(h)
    const vehicleExtra = d.vehicle === 'suv' ? 600 : 0
    const price   = calcPrice(d.extra, d.days_ahead, isNight, vehicleExtra)

    const supabase = createServiceClient()

    // Generate booking ref
    const { data: refData } = await supabase.rpc('generate_booking_ref')
    const booking_ref = refData as string

    // Check for opposite-direction match on same date
    const { data: matches } = await supabase
      .from('bookings')
      .select('id,phone,passenger_name,direction,travel_date,pickup_time,booking_ref')
      .eq('direction', d.direction === 'KI' ? 'IK' : 'KI')
      .eq('travel_date', d.travel_date)
      .eq('status', 'waiting')
      .limit(1)

    const match = matches?.[0]
    const status = match ? 'confirmed' : 'waiting'

    // Insert new booking
    const { data: newBooking, error: insertErr } = await supabase
      .from('bookings')
      .insert({
        booking_ref,
        direction:      d.direction,
        drop_point:     d.drop_point,
        drop_name:      d.drop_name,
        travel_date:    d.travel_date,
        pickup_time:    d.pickup_time,
        is_night:       isNight,
        base_fare:      price.base,
        discount:       price.discount,
        night_extra:    price.night_extra,
        total_fare:     price.total,
        passenger_name: d.passenger_name,
        phone:          d.phone,
        email:          d.email || null,
        status,
        matched_with:   match?.id ?? null,
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    // Update matched booking
    if (match) {
      await supabase
        .from('bookings')
        .update({ status: 'confirmed', matched_with: newBooking.id })
        .eq('id', match.id)
    }

    // Send notifications (fire & forget)
    const notifyNew = async () => {
      try {
        await sendBookingConfirmation(newBooking)
        await supabase.from('bookings').update({ whatsapp_sent: true }).eq('id', newBooking.id)
      } catch (e) { console.error('WhatsApp notify error:', e) }

      if (d.email) {
        try {
          await sendBookingEmail(newBooking)
          await sendAdminAlert(newBooking)
          await supabase.from('bookings').update({ email_sent: true }).eq('id', newBooking.id)
        } catch (e) { console.error('Email notify error:', e) }
      } else {
        try { await sendAdminAlert(newBooking) } catch (e) { console.error('Admin email error:', e) }
      }
    }

    const notifyMatch = async () => {
      if (!match) return
      try {
        await sendMatchNotification({
          passenger_name: match.passenger_name,
          phone:          match.phone,
          booking_ref:    match.booking_ref,
          direction:      match.direction,
          travel_date:    match.travel_date,
          pickup_time:    match.pickup_time,
        })
      } catch (e) { console.error('Match WhatsApp error:', e) }
    }

    // Don't await — respond immediately
    notifyNew()
    notifyMatch()

    return NextResponse.json({
      booking: newBooking,
      matched: !!match,
    }, { status: 201 })
  } catch (err: any) {
    console.error('Booking error:', err)
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 })
  }
}
