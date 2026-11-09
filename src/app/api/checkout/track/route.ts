import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const {
      action = 'initiated', // 'initiated' | 'abandoned' | 'failed'
      name,
      phone,
      direction,
      travel_date,
      pickup_time,
      drop_point,
      drop_name,
      total_fare,
      booking_ref,
      token,
      reason,
    } = body

    const cleanedPhone = String(phone || '').replace(/\D/g, '')
    if (!cleanedPhone && !booking_ref && !token) {
      return NextResponse.json({ ok: false, error: 'Phone or booking reference required' }, { status: 400 })
    }

    const db = createServiceClient()
    const nowIso = new Date().toISOString()

    // 1. If booking_ref or token is provided, update existing booking extras
    if (booking_ref || token) {
      const query = db.from('bookings').select('id, extras, status')
      if (booking_ref) query.eq('booking_ref', booking_ref)
      else query.eq('public_token', token)

      const { data: b } = await query.maybeSingle()
      if (b && b.status === 'pending_payment') {
        await db.from('bookings').update({
          extras: {
            ...(b.extras || {}),
            abandoned: action === 'abandoned',
            checkout_stage: action,
            abandoned_at: action === 'abandoned' ? nowIso : undefined,
            abandon_reason: reason || undefined,
            last_checkout_activity: nowIso,
          },
          updated_at: nowIso,
        }).eq('id', b.id)
      }
    }

    // 2. Also log as a lead for instant admin follow-up if phone is available
    if (cleanedPhone && cleanedPhone.length >= 10) {
      const normalizedPhone = cleanedPhone.length === 10 ? `91${cleanedPhone}` : cleanedPhone
      const pickupAt = travel_date && pickup_time ? `${travel_date}T${pickup_time}:00+05:30` : nowIso

      try {
        await db.from('leads').insert({
          passenger_name: name || 'Interested Passenger',
          phone: normalizedPhone,
          route: direction === 'KI' ? 'Khargone to Indore' : 'Indore to Khargone',
          pickup_at: pickupAt,
          pickup_address: drop_name || drop_point || 'City Drop',
          price: total_fare || 2200,
          vehicle_type: 'sedan',
          passengers: 1,
          status: action === 'abandoned' ? 'abandoned' : 'initiated',
          notes: `Checkout ${action} on ${nowIso}. Advance ₹500 unpaid. Ref: ${booking_ref || 'N/A'}${reason ? ` Reason: ${reason}` : ''}`,
          created_at: nowIso,
        })
      } catch (leadErr) {
        // Fallback gracefully if leads schema differs
        console.warn('Leads table insert warning:', leadErr)
      }
    }

    return NextResponse.json({ ok: true, action, recorded_at: nowIso })
  } catch (err: any) {
    console.error('Checkout tracking error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Tracking failed' }, { status: 500 })
  }
}
