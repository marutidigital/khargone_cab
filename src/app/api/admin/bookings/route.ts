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
      if (typeof id !== 'string' || typeof updates.other_booking_id !== 'string') {
        return NextResponse.json({ error: 'Choose two bookings to match.' }, { status: 400 })
      }

      // Check if driver was explicitly assigned or if auto dispatch is preferred
      let driverId: string | undefined = undefined
      if (updates.driver_id && typeof updates.driver_id === 'string' && updates.driver_id !== 'auto' && updates.driver_id !== '') {
        const { data: driver, error: driverErr } = await supabase
          .from('drivers')
          .select('id,name,phone,status')
          .eq('id', updates.driver_id)
          .single()
        if (driverErr || !driver || driver.status === 'inactive') {
          return NextResponse.json({ error: 'Selected driver could not be found or is inactive.' }, { status: 404 })
        }
        driverId = driver.id
      }

      // Fetch both bookings
      const [firstResult, secondResult] = await Promise.all([
        supabase.from('bookings').select('*').eq('id', id).single(),
        supabase.from('bookings').select('*').eq('id', updates.other_booking_id).single(),
      ])

      const first = firstResult.data
      const second = secondResult.data

      if (firstResult.error || secondResult.error || !first || !second) {
        return NextResponse.json({ error: 'One or both bookings could not be found.' }, { status: 404 })
      }

      if (first.status === 'confirmed' || second.status === 'confirmed') {
        return NextResponse.json({ error: 'One of these bookings is already confirmed.' }, { status: 409 })
      }

      if (first.direction === second.direction) {
        return NextResponse.json({ error: 'Bookings must be in opposite directions (one Khargone➔Indore and one Indore➔Khargone).' }, { status: 409 })
      }

      const out = first.direction === 'KI' ? first : second
      const back = first.direction === 'IK' ? first : second

      const { secureAndConfirmMatch } = await import('@/lib/matching-engine')
      const matchResult = await secureAndConfirmMatch({
        bookingOutId: out.id,
        bookingBackId: back.id,
        driverId: driverId,
        confirmedBy: 'admin',
      })

      if (!matchResult.success) {
        return NextResponse.json({ error: matchResult.error || 'Could not confirm match.' }, { status: 409 })
      }

      return NextResponse.json({ success: true, matchId: matchResult.matchId })
    }

    if (_action === 'auto_match_all') {
      const { tryAutomaticFIFOMatch } = await import('@/lib/matching-engine')
      const { data: waitingBookings } = await supabase
        .from('bookings')
        .select('id, booking_ref, travel_date, pickup_time, direction')
        .eq('status', 'waiting')
        .is('match_id', null)
        .order('created_at', { ascending: true })

      let matchedCount = 0
      const matchedIds: string[] = []

      for (const b of waitingBookings || []) {
        if (matchedIds.includes(b.id)) continue
        try {
          const res = await tryAutomaticFIFOMatch(b.id)
          if (res.matched && res.matchId) {
            matchedCount++
            matchedIds.push(b.id)
          }
        } catch (mErr) {
          console.warn('Auto match attempt notice for booking', b.id, mErr)
        }
      }

      return NextResponse.json({
        success: true,
        matchedCount,
        message: matchedCount > 0 ? `Successfully paired ${matchedCount} return match(es)!` : 'No new compatible round matches found.',
      })
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
      if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })

      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', id)
        .eq('purpose', 'advance')
        .limit(1)
        .single()

      let razorpayRefundSuccess = false
      let refundId: string | null = null

      if (payment?.razorpay_payment_id && ['captured', 'refund_pending'].includes(payment.status)) {
        const key = payment.refund_idempotency_key || `admin_refund_${id}`
        try {
          const refund = await refundRazorpayPayment(payment.razorpay_payment_id, payment.amount, key)
          if (refund.status === 'processed') {
            razorpayRefundSuccess = true
            refundId = refund.id
          }
          await supabase
            .from('payments')
            .update({
              status: razorpayRefundSuccess ? 'refunded' : 'refund_pending',
              refund_id: refund.id,
              refunded_at: new Date().toISOString(),
            })
            .eq('id', payment.id)
        } catch (cause) {
          console.warn('Razorpay refund attempt note (continuing database update):', cause)
        }
      }

      const refundAmt = Number(booking.advance_paid) || Number(payment?.amount) || 500
      await updateBooking(id, {
        status: 'refunded',
        refund_status: 'processed',
        refund_amount: refundAmt,
        updated_at: new Date().toISOString(),
      })

      // Send WhatsApp Template 4 (refund_initiated) to customer
      try {
        const { sendWhatsAppTemplateMessage } = await import('@/lib/whatsapp-templates')
        await sendWhatsAppTemplateMessage({
          toPhone: booking.phone,
          templateCode: 'refund_initiated',
          variables: [
            booking.passenger_name || 'Passenger',
            booking.booking_ref,
            String(refundAmt),
            refundId || `RFD_${booking.booking_ref}`,
          ],
          bookingId: booking.id,
        })
      } catch (waErr) {
        console.warn('Customer refund WA template notice:', waErr)
      }

      await notifyAdmin(
        `refund_processed:${booking.id}`,
        booking.id,
        `💰 Refund of ₹${refundAmt} processed for #${booking.booking_ref} (${booking.passenger_name}).`
      ).catch(() => {})

      return NextResponse.json({ success: true, status: 'refunded', amount: refundAmt })
    }

    if (_action === 'refund_all_expired') {
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
      const nowIso = new Date().toISOString()
      const { data: expired } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'waiting')
        .or(`travel_date.lt.${todayStr},cutoff_at.lte.${nowIso}`)

      let count = 0
      for (const b of expired || []) {
        const refundAmt = Number(b.advance_paid) || 500
        await updateBooking(b.id, {
          status: 'refunded',
          refund_status: 'processed',
          refund_amount: refundAmt,
          updated_at: new Date().toISOString(),
        })

        try {
          const { sendWhatsAppTemplateMessage } = await import('@/lib/whatsapp-templates')
          await sendWhatsAppTemplateMessage({
            toPhone: b.phone,
            templateCode: 'refund_initiated',
            variables: [
              b.passenger_name || 'Passenger',
              b.booking_ref,
              String(refundAmt),
              `RFD_${b.booking_ref}`,
            ],
            bookingId: b.id,
          })
        } catch (waErr) {
          console.warn('Customer refund WA template notice:', waErr)
        }

        count++
      }

      return NextResponse.json({ success: true, count, message: `${count} expired booking(s) refunded successfully.` })
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
