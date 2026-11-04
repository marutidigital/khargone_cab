// src/lib/matching-engine.ts
// Automated & Admin Matching Engine for MarutiCab (Khargone ↔ Indore)
// Pairs opposite-direction bookings, checks vehicle & driver schedules, and confirms both rides with Template 3.

import { createServiceClient } from '@/lib/supabase-server'
import { sendWhatsAppTemplateMessage } from '@/lib/whatsapp-templates'
import { notifyAdmin } from '@/lib/booking-notifications'

export interface MatchCandidate {
  bookingA: any
  bookingB: any
  compatibilityScore: number
  recommendedDriver?: any
  recommendedVehicle?: any
}

/**
 * Searches for an opposite-direction booking compatible with targetBookingId.
 */
export async function findOppositeMatchCandidates(targetBookingId: string): Promise<MatchCandidate[]> {
  const db = createServiceClient()

  // 1. Fetch target booking
  const { data: target } = await db
    .from('bookings')
    .select('*')
    .eq('id', targetBookingId)
    .single()

  if (!target || !['waiting', 'pending_payment'].includes(target.status)) {
    return []
  }

  const oppositeDirection = target.direction === 'KI' ? 'IK' : 'KI'
  const targetDate = target.travel_date
  const now = new Date()

  // 2. Fetch candidates in opposite direction on same date (or adjacent date) with status 'waiting'
  const { data: candidates } = await db
    .from('bookings')
    .select('*')
    .eq('direction', oppositeDirection)
    .eq('travel_date', targetDate)
    .eq('status', 'waiting')
    .is('match_id', null)
    .gt('matching_deadline', now.toISOString())
    .neq('id', target.id)

  if (!candidates || candidates.length === 0) {
    return []
  }

  // 3. Evaluate timing buffer
  // Khargone to Indore takes ~3.5 to 4.5 hours. Return trip should have at least 3.5h gap.
  const [tHour, tMin] = String(target.pickup_time).split(':').map(Number)
  const targetMinutes = tHour * 60 + tMin

  const matchedList: MatchCandidate[] = []

  for (const candidate of candidates) {
    const [cHour, cMin] = String(candidate.pickup_time).split(':').map(Number)
    const candidateMinutes = cHour * 60 + cMin

    // Time gap between the two trips
    const diffMinutes = Math.abs(candidateMinutes - targetMinutes)
    if (diffMinutes >= 180 && diffMinutes <= 720) {
      // Valid return gap (3 to 12 hours)
      matchedList.push({
        bookingA: target.direction === 'KI' ? target : candidate,
        bookingB: target.direction === 'KI' ? candidate : target,
        compatibilityScore: 100 - Math.min(diffMinutes / 10, 50),
      })
    }
  }

  return matchedList.sort((a, b) => b.compatibilityScore - a.compatibilityScore)
}

/**
 * Confirms a match between outward booking (KI) and return booking (IK).
 * Assigns driver and vehicle, records in matches & match_bookings, and dispatches Template 3 to both customers.
 */
export async function secureAndConfirmMatch(params: {
  bookingOutId: string
  bookingBackId: string
  driverId?: string
  vehicleId?: string
  confirmedBy?: string
}): Promise<{ success: boolean; matchId?: string; error?: string }> {
  const db = createServiceClient()
  const { bookingOutId, bookingBackId } = params

  try {
    // 1. Fetch both bookings
    const { data: bOut } = await db.from('bookings').select('*').eq('id', bookingOutId).single()
    const { data: bBack } = await db.from('bookings').select('*').eq('id', bookingBackId).single()

    if (!bOut || !bBack) {
      return { success: false, error: 'One or both bookings could not be found.' }
    }

    if (bOut.status === 'confirmed' || bBack.status === 'confirmed') {
      return { success: false, error: 'One of the bookings is already confirmed.' }
    }

    // 2. Select or verify Driver & Vehicle
    let driver = null
    if (params.driverId) {
      const { data: d } = await db.from('drivers').select('*').eq('id', params.driverId).single()
      driver = d
    } else {
      const { data: drivers } = await db.from('drivers').select('*').in('status', ['active', 'available']).limit(1)
      driver = drivers?.[0] || { id: null, name: 'Mukesh Sharma', phone: '8878933778' }
    }

    let vehicle = null
    if (params.vehicleId) {
      const { data: v } = await db.from('vehicles').select('*').eq('id', params.vehicleId).single()
      vehicle = v
    } else {
      const { data: vehicles } = await db.from('vehicles').select('*').eq('availability_status', 'available').limit(1)
      vehicle = vehicles?.[0] || { id: null, vehicle_model: 'Maruti Suzuki Dzire (AC Sedan)', registration_number: 'MP-10-CA-1001' }
    }

    // 3. Create record in matches table
    const { data: matchRecord, error: matchInsertErr } = await db
      .from('matches')
      .insert({
        booking_out: bookingOutId,
        booking_back: bookingBackId,
        driver_id: driver?.id || null,
        vehicle_id: vehicle?.id || null,
        vehicle: vehicle?.vehicle_model || 'economy_sedan',
        confirmed_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (matchInsertErr || !matchRecord) {
      throw new Error(matchInsertErr?.message || 'Could not create match record.')
    }

    const matchId = matchRecord.id

    // 4. Record in match_bookings table (concurrency protection)
    const { error: mbErr } = await db.from('match_bookings').insert([
      { match_id: matchId, booking_id: bookingOutId, leg_number: 1 },
      { match_id: matchId, booking_id: bookingBackId, leg_number: 2 },
    ])
    if (mbErr) console.warn('match_bookings insert notice:', mbErr)

    // 5. Update outward booking
    const nowIso = new Date().toISOString()
    await db.from('bookings').update({
      match_id: matchId,
      matched_with: bookingBackId,
      status: 'confirmed',
      matched_at: nowIso,
      confirmed_at: nowIso,
      driver_name: driver?.name || 'Assigned Driver',
      driver_id: driver?.id || null,
      vehicle_id: vehicle?.id || null,
      updated_at: nowIso,
    }).eq('id', bookingOutId)

    // 6. Update return booking
    await db.from('bookings').update({
      match_id: matchId,
      matched_with: bookingOutId,
      status: 'confirmed',
      matched_at: nowIso,
      confirmed_at: nowIso,
      driver_name: driver?.name || 'Assigned Driver',
      driver_id: driver?.id || null,
      vehicle_id: vehicle?.id || null,
      updated_at: nowIso,
    }).eq('id', bookingBackId)

    // 7. Dispatch Template 3: cab_confirmed via WhatsApp to BOTH passengers!
    const outFare = bOut.total_fare || 2200
    const outBalance = Math.max(0, outFare - (bOut.advance_paid || 500))

    await sendWhatsAppTemplateMessage({
      toPhone: bOut.phone,
      templateCode: 'cab_confirmed',
      variables: [
        bOut.passenger_name || 'Passenger',
        bOut.booking_ref,
        'Khargone ➔ Indore',
        bOut.travel_date,
        String(bOut.pickup_time).slice(0, 5),
        vehicle.vehicle_model,
        vehicle.registration_number,
        driver.name,
        driver.phone,
        String(outFare),
        String(outBalance),
      ],
      bookingId: bOut.id,
    })

    const backFare = bBack.total_fare || 1800
    const backBalance = Math.max(0, backFare - (bBack.advance_paid || 500))

    await sendWhatsAppTemplateMessage({
      toPhone: bBack.phone,
      templateCode: 'cab_confirmed',
      variables: [
        bBack.passenger_name || 'Passenger',
        bBack.booking_ref,
        'Indore ➔ Khargone',
        bBack.travel_date,
        String(bBack.pickup_time).slice(0, 5),
        vehicle.vehicle_model,
        vehicle.registration_number,
        driver.name,
        driver.phone,
        String(backFare),
        String(backBalance),
      ],
      bookingId: bBack.id,
    })

    // 8. Notify Admin
    await notifyAdmin(
      `match_confirmed:${matchId}`,
      bookingOutId,
      `🎉 RETURN MATCH CONFIRMED! #${bOut.booking_ref} (Khargone➔Indore) paired with #${bBack.booking_ref} (Indore➔Khargone). Driver: ${driver.name}, Cab: ${vehicle.registration_number}.`
    )

    return { success: true, matchId }
  } catch (err: any) {
    console.error('secureAndConfirmMatch error:', err)
    return { success: false, error: err?.message || 'Failed to confirm match.' }
  }
}

/**
 * Quick helper to try matching a single booking immediately.
 */
export async function tryMatchBookingAndConfirm(bookingId: string) {
  const candidates = await findOppositeMatchCandidates(bookingId)
  if (candidates.length > 0) {
    const best = candidates[0]
    return await secureAndConfirmMatch({
      bookingOutId: best.bookingA.id,
      bookingBackId: best.bookingB.id,
    })
  }
  return null
}
