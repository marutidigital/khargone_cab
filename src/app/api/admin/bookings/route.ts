// src/app/api/admin/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { authorizeAdminRequest } from '@/lib/admin-auth'
import { sendBookingAutomation } from '@/lib/whatsapp-automation'
import { isMatchTimeCompatible } from '@/lib/config'
import { notify, notifyAdmin, notifyBooking } from '@/lib/booking-notifications'
import { refundRazorpayPayment } from '@/lib/razorpay'

export async function GET(req: NextRequest) {
  const auth = await authorizeAdminRequest(req)
  if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status })

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

  const { data: matches } = await supabase
    .from('matches')
    .select('id, booking_out, booking_back, driver_id, vehicle_id, vehicle, confirmed_at, drivers(id, name, phone)')
    .order('created_at', { ascending: false })

  return NextResponse.json({ bookings: data || [], matches: matches || [] })
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeAdminRequest(req)
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status })

    const body = await req.json()
    const supabase = createServiceClient()
    const { _action, id, ...updates } = body
    const updateBooking = async (bookingId: string, values: Record<string, unknown>) => {
      const { error } = await supabase.from('bookings').update(values).eq('id', bookingId)
      if (error) throw error
    }

    if (_action === 'match_pair') {
      if (typeof id !== 'string' || typeof updates.other_booking_id !== 'string' || typeof updates.driver_id !== 'string') {
        return NextResponse.json({ error: 'Choose two bookings and an active driver.' }, { status: 400 })
      }
      const [firstResult, secondResult, driverResult] = await Promise.all([
        supabase.from('bookings').select('*').eq('id', id).single(),
        supabase.from('bookings').select('*').eq('id', updates.other_booking_id).single(),
        supabase.from('drivers').select('id,name,phone,vehicle_number,status').eq('id', updates.driver_id).single(),
      ])
      const first = firstResult.data
      const second = secondResult.data
      const driver = driverResult.data
      if (firstResult.error || secondResult.error || !first || !second || !driver || driver.status === 'inactive') {
        return NextResponse.json({ error: 'Bookings or active driver could not be found.' }, { status: 404 })
      }
      const isValid = first.mode === 'match' && second.mode === 'match' && first.status === 'waiting' && second.status === 'waiting'
        && first.travel_date === second.travel_date
        && isMatchTimeCompatible(first.direction === 'KI' ? 'K2I' : 'I2K', String(first.pickup_time).slice(0, 5), second.direction === 'KI' ? 'K2I' : 'I2K', String(second.pickup_time).slice(0, 5))
        && first.direction !== second.direction
      if (!isValid) return NextResponse.json({ error: 'These bookings do not meet the same-day opposite-direction 4–8 hour match rule.' }, { status: 409 })
      const out = first.direction === 'KI' ? first : second
      const back = first.direction === 'IK' ? first : second
      const { data: match, error: matchError } = await supabase.from('matches').insert({ booking_out: out.id, booking_back: back.id, driver_id: driver.id, vehicle: 'economy_sedan', confirmed_at: new Date().toISOString() }).select('id').single()
      if (matchError || !match) return NextResponse.json({ error: 'Could not create this match. Refresh the board and try again.' }, { status: 409 })
      const now = new Date().toISOString()
      const { error: updateError } = await supabase.from('bookings').update({ status: 'confirmed', match_id: match.id, driver_id: driver.id, driver_name: driver.name, matched_with: second.id, updated_at: now }).eq('id', first.id).eq('status', 'waiting')
      if (updateError) return NextResponse.json({ error: 'Match saved but booking confirmation failed. Check the admin board.' }, { status: 503 })
      const { error: secondUpdateError } = await supabase.from('bookings').update({ status: 'confirmed', match_id: match.id, driver_id: driver.id, driver_name: driver.name, matched_with: first.id, updated_at: now }).eq('id', second.id).eq('status', 'waiting')
      if (secondUpdateError) return NextResponse.json({ error: 'One booking was updated. Review the match board immediately.' }, { status: 503 })
      await Promise.all([notify('match_confirmed', first.id), notify('match_confirmed', second.id)])
      return NextResponse.json({ success: true, matchId: match.id })
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
      const { data: booking } = await supabase.from('bookings').select('*').eq('id', id).limit(1)
      if (booking?.[0]) await sendBookingAutomation('booking_cancelled', booking[0]).catch(() => false)
      return NextResponse.json({ success: true })
    }

    if (_action === 'refund') {
      const { data: booking } = await supabase.from('bookings').select('*').eq('id', id).single()
      if (!booking || !['no_match_decision', 'confirmed', 'waiting', 'cancelled'].includes(booking.status)) return NextResponse.json({ error: 'This booking cannot be refunded in its current status.' }, { status: 409 })
      const { data: payment } = await supabase.from('payments').select('*').eq('booking_id', id).eq('purpose', 'advance').limit(1).single()
      if (!payment?.razorpay_payment_id || !['captured', 'refund_pending'].includes(payment.status)) return NextResponse.json({ error: 'No captured advance payment is available to refund.' }, { status: 409 })
      const key = payment.refund_idempotency_key || `admin_refund_${id}`
      await supabase.from('payments').update({ status: 'refund_pending', refund_idempotency_key: key }).eq('id', payment.id).in('status', ['captured', 'refund_pending'])
      try {
        const refund = await refundRazorpayPayment(payment.razorpay_payment_id, payment.amount, key)
        const complete = refund.status === 'processed'
        await supabase.from('payments').update({ status: complete ? 'refunded' : 'refund_pending', refund_id: refund.id, refunded_at: complete ? new Date().toISOString() : null }).eq('id', payment.id)
        await updateBooking(id, { status: complete ? 'refunded' : booking.status === 'cancelled' ? 'cancelled' : 'no_match_decision', refund_status: complete ? 'processed' : 'pending' })
        if (complete) await notifyBooking(booking, 'refund_processed')
        return NextResponse.json({ success: true, status: complete ? 'refunded' : 'refund_pending' })
      } catch (cause) {
        console.error('Admin refund failed:', cause)
        await notifyAdmin(`refund-failed:${booking.id}`, booking.id, 'Admin refund request failed at the payment provider. Retry after checking payment status.')
        return NextResponse.json({ error: 'Razorpay could not process the refund. It can be retried safely.' }, { status: 502 })
      }
    }

    if (_action === 'complete') {
      const { data: booking } = await supabase.from('bookings').select('*').eq('id', id).single()
      if (!booking || !['confirmed', 'matched'].includes(booking.status)) return NextResponse.json({ error: 'Only a confirmed booking can be completed.' }, { status: 409 })
      const completedAt = new Date()
      await updateBooking(id, { status: 'completed', completed_at: completedAt.toISOString(), feedback_due_at: new Date(completedAt.getTime() + 2 * 60 * 60 * 1000).toISOString(), updated_at: completedAt.toISOString() })
      return NextResponse.json({ success: true })
    }

    if (_action === 'assign_driver') {
      const { data: driver } = await supabase.from('drivers').select('id,name,phone,vehicle_number,vehicle_model,status').eq('id', updates.driver_id).single()
      if (!driver || driver.status === 'inactive') return NextResponse.json({ error: 'Select an active driver.' }, { status: 400 })
      await updateBooking(id, {
        driver_id: updates.driver_id,
        driver_name: driver.name,
        updated_at: new Date().toISOString()
      })
      const { data: updated } = await supabase.from('bookings').select('*').eq('id', id).single()
      if (updated?.match_id) {
        // Also link same dedicated driver & vehicle to the return pair!
        await supabase.from('bookings').update({
          driver_id: driver.id,
          driver_name: driver.name,
          updated_at: new Date().toISOString()
        }).eq('match_id', updated.match_id)
      }
      return NextResponse.json({ success: true, driverName: driver.name })
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
      return NextResponse.json({ error: 'Use the validated Match Deal board to link bookings.' }, { status: 400 })
    }

    if (_action === 'unlink') {
      await updateBooking(id, { matched_with: null, status: 'waiting', updated_at: new Date().toISOString() })
      if (updates.matched_with) {
        await updateBooking(updates.matched_with, { matched_with: null, status: 'waiting', updated_at: new Date().toISOString() })
      }
      return NextResponse.json({ success: true })
    }

    if (_action === 'update_status') {
      if (!id || !['waiting', 'confirmed', 'cancelled', 'completed'].includes(updates.status)) {
        return NextResponse.json({ error: 'A booking and valid status are required.' }, { status: 400 })
      }
      const { data: target } = await supabase.from('bookings').select('mode,status').eq('id', id).single()
      if (target?.mode === 'match' && updates.status !== 'cancelled' && updates.status !== 'completed') {
        return NextResponse.json({ error: 'Use the validated Match Deal board to confirm a match.' }, { status: 409 })
      }
      await updateBooking(id, {
        status: updates.status,
        updated_at: new Date().toISOString()
      })
      const { data: booking } = await supabase.from('bookings').select('*').eq('id', id).limit(1)
      if (updates.status === 'completed') {
        const completedAt = new Date()
        await updateBooking(id, { completed_at: completedAt.toISOString(), feedback_due_at: new Date(completedAt.getTime() + 2 * 60 * 60 * 1000).toISOString() })
        return NextResponse.json({ success: true })
      }
      const trigger = updates.status === 'confirmed'
        ? 'booking_confirmed'
        : updates.status === 'cancelled'
          ? 'booking_cancelled'
          : 'booking_waiting'
      if (booking?.[0]) await sendBookingAutomation(trigger, booking[0]).catch(() => false)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
