import { createServiceClient } from '@/lib/supabase-server'
import { sendInteractiveButtons, sendText, normalizeWhatsAppPhone } from '@/lib/whatsapp'
import { notifyAdmin } from '@/lib/booking-notifications'
import { sendWhatsAppTemplateMessage } from '@/lib/whatsapp-templates'

export interface AssignDriverParams {
  matchId: string
  driverName: string
  driverPhone: string
  vehicleModel: string
  vehicleNumber: string
  driverId?: string
  vehicleId?: string
}

/**
 * Assigns Driver and Vehicle together to a confirmed round-trip match,
 * updates both outward and return bookings, dispatches driver_car_details to both passengers,
 * and sends the initial interactive WhatsApp dispatch to the driver with quick-reply buttons!
 */
export async function assignDriverAndVehicleToMatch(params: {
  matchId: string
  driverName: string
  driverPhone: string
  vehicleModel: string
  vehicleNumber: string
  driverId?: string
  vehicleId?: string
}) {
  const db = createServiceClient()
  const { matchId, driverName, driverPhone, vehicleModel, vehicleNumber } = params

  const cleanDriverPhone = String(driverPhone).replace(/\D/g, '').slice(-10)
  const cleanRegNo = String(vehicleNumber).trim().toUpperCase()
  const cleanModel = String(vehicleModel).trim()
  const cleanName = String(driverName).trim()

  if (!cleanDriverPhone || cleanDriverPhone.length !== 10) {
    throw new Error('Valid 10-digit driver mobile number is required.')
  }
  if (!cleanName) throw new Error('Driver name is required.')
  if (!cleanRegNo) throw new Error('Vehicle registration number is required.')

  // 1. Fetch or create Driver
  let driverRecord: any = null
  if (params.driverId) {
    const { data: d } = await db.from('drivers').select('*').eq('id', params.driverId).single()
    driverRecord = d
  }
  if (!driverRecord) {
    const { data: existingDrivers } = await db
      .from('drivers')
      .select('*')
      .eq('phone', cleanDriverPhone)
      .limit(1)

    if (existingDrivers && existingDrivers.length > 0) {
      driverRecord = existingDrivers[0]
      await db.from('drivers').update({
        name: cleanName,
        vehicle_number: cleanRegNo,
        vehicle_model: cleanModel || driverRecord.vehicle_model,
        updated_at: new Date().toISOString(),
      }).eq('id', driverRecord.id)
    } else {
      const { data: newD, error: dErr } = await db.from('drivers').insert({
        name: cleanName,
        phone: cleanDriverPhone,
        vehicle_type: 'sedan',
        vehicle_number: cleanRegNo,
        vehicle_model: cleanModel,
        status: 'active',
        rating: 4.8,
        trips_completed: 0,
      }).select('*').single()
      if (dErr || !newD) throw new Error(dErr?.message || 'Could not create driver record.')
      driverRecord = newD
    }
  }

  // 2. Fetch or create Vehicle
  let vehicleRecord: any = null
  if (params.vehicleId) {
    const { data: v } = await db.from('vehicles').select('*').eq('id', params.vehicleId).single()
    vehicleRecord = v
  }
  if (!vehicleRecord) {
    const { data: existingVehicles } = await db
      .from('vehicles')
      .select('*')
      .eq('registration_number', cleanRegNo)
      .limit(1)

    if (existingVehicles && existingVehicles.length > 0) {
      vehicleRecord = existingVehicles[0]
      await db.from('vehicles').update({
        vehicle_model: cleanModel || vehicleRecord.vehicle_model,
      }).eq('id', vehicleRecord.id)
    } else {
      const { data: newV, error: vErr } = await db.from('vehicles').insert({
        registration_number: cleanRegNo,
        vehicle_model: cleanModel,
        seating_capacity: 4,
        availability_status: 'assigned',
        active: true,
      }).select('*').single()
      if (vErr || !newV) throw new Error(vErr?.message || 'Could not create vehicle record.')
      vehicleRecord = newV
    }
  }

  // 3. Fetch Match and its both bookings
  const { data: match, error: mErr } = await db
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (mErr || !match) throw new Error('Match record not found.')

  const { data: bOut } = await db.from('bookings').select('*').eq('id', match.booking_out).single()
  const { data: bBack } = await db.from('bookings').select('*').eq('id', match.booking_back).single()

  if (!bOut || !bBack) throw new Error('Could not find outward or return booking for this match.')

  const nowIso = new Date().toISOString()

  // 4. Update match record
  await db.from('matches').update({
    driver_id: driverRecord.id,
    vehicle_id: vehicleRecord.id,
    vehicle: cleanModel || 'economy_sedan',
  }).eq('id', matchId)

  // 5. Update outward and return bookings with assigned driver & lifecycle stage
  const initLifecycle = {
    stage: 'assigned',
    assigned_at: nowIso,
    driver_name: cleanName,
    driver_phone: cleanDriverPhone,
    vehicle_model: cleanModel,
    vehicle_number: cleanRegNo,
  }

  await db.from('bookings').update({
    driver_id: driverRecord.id,
    driver_name: cleanName,
    vehicle_id: vehicleRecord.id,
    updated_at: nowIso,
    extras: {
      ...(bOut.extras || {}),
      driver_lifecycle: initLifecycle,
      assigned_driver: cleanName,
      assigned_driver_phone: cleanDriverPhone,
      assigned_vehicle: cleanModel,
      assigned_plate: cleanRegNo,
    },
  }).eq('id', bOut.id)

  await db.from('bookings').update({
    driver_id: driverRecord.id,
    driver_name: cleanName,
    vehicle_id: vehicleRecord.id,
    updated_at: nowIso,
    extras: {
      ...(bBack.extras || {}),
      driver_lifecycle: initLifecycle,
      assigned_driver: cleanName,
      assigned_driver_phone: cleanDriverPhone,
      assigned_vehicle: cleanModel,
      assigned_plate: cleanRegNo,
    },
  }).eq('id', bBack.id)

  // 6. Notify Both Passengers with Driver & Vehicle Details (driver_car_details)
  try {
    const outBalance = Math.max(0, (bOut.total_fare || 2200) - (bOut.advance_paid || 500))
    await sendWhatsAppTemplateMessage({
      toPhone: bOut.phone,
      templateCode: 'driver_car_details',
      variables: [
        bOut.passenger_name || 'Passenger',
        cleanName,
        cleanDriverPhone,
        cleanModel,
        cleanRegNo,
        bOut.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone',
        bOut.travel_date,
        String(bOut.pickup_time).slice(0, 5),
        bOut.address || bOut.drop_name || 'Selected City Point',
        String(outBalance),
      ],
      bookingId: bOut.id,
    })
  } catch (outErr) {
    console.warn('Driver details dispatch to Leg 1 passenger warning:', outErr)
  }

  try {
    const backBalance = Math.max(0, (bBack.total_fare || 1800) - (bBack.advance_paid || 500))
    await sendWhatsAppTemplateMessage({
      toPhone: bBack.phone,
      templateCode: 'driver_car_details',
      variables: [
        bBack.passenger_name || 'Passenger',
        cleanName,
        cleanDriverPhone,
        cleanModel,
        cleanRegNo,
        bBack.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone',
        bBack.travel_date,
        String(bBack.pickup_time).slice(0, 5),
        bBack.address || bBack.drop_name || 'Selected City Point',
        String(backBalance),
      ],
      bookingId: bBack.id,
    })
  } catch (backErr) {
    console.warn('Driver details dispatch to Leg 2 passenger warning:', backErr)
  }

  // 7. Dispatch Interactive WhatsApp Duty Assignment to Driver!
  await dispatchDriverLeg1InitialMessage({
    matchId,
    driverPhone: cleanDriverPhone,
    driverName: cleanName,
    vehicleModel: cleanModel,
    vehicleNumber: cleanRegNo,
    bOut,
    bBack,
  })

  // 8. Notify Admin
  await notifyAdmin(
    `driver_assigned:${matchId}`,
    bOut.id,
    `🚘 *DRIVER & CAR ASSIGNED!* Match #${matchId.slice(0, 8)}\nDriver: ${cleanName} (${cleanDriverPhone})\nCar: ${cleanModel} (${cleanRegNo})\nTrip 1: #${bOut.booking_ref} (${bOut.passenger_name})\nTrip 2: #${bBack.booking_ref} (${bBack.passenger_name})`
  )

  return {
    success: true,
    driver: driverRecord,
    vehicle: vehicleRecord,
  }
}

/**
 * Sends initial duty assignment message to driver with Trip 1 & Trip 2 details,
 * and quick-reply button [📞 Baat Ho Gayi / Call Done].
 */
export async function dispatchDriverLeg1InitialMessage(params: {
  matchId: string
  driverPhone: string
  driverName: string
  vehicleModel: string
  vehicleNumber: string
  bOut: any
  bBack: any
}) {
  const { matchId, driverPhone, driverName, vehicleModel, vehicleNumber, bOut, bBack } = params

  const leg1Route = bOut.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'
  const leg2Route = bBack.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'

  const leg1Balance = Math.max(0, (bOut.total_fare || 2200) - (bOut.advance_paid || 500))
  const leg2Balance = Math.max(0, (bBack.total_fare || 1800) - (bBack.advance_paid || 500))

  const leg1PickupTime = String(bOut.pickup_time || '12:00').slice(0, 5)
  const leg2PickupTime = String(bBack.pickup_time || '18:00').slice(0, 5)

  const body = [
    `🚕 *Maruti Cab Duty Assignment* 📋`,
    `Namaste *${driverName}* ji!`,
    `Aapko Khargone ⇄ Indore round trip duty assign hui hai.`,
    `Gaadi: *${vehicleModel} (${vehicleNumber})*`,
    ``,
    `📍 *TRIP 1: ${leg1Route}*`,
    `👤 *Passenger:* ${bOut.passenger_name || 'Passenger'}`,
    `📞 *Call:* ${bOut.phone}`,
    `📅 *Date:* ${bOut.travel_date}`,
    `⏰ *Pickup Time:* ${leg1PickupTime}`,
    `🏡 *Pickup Location:* ${bOut.address || bOut.drop_name || 'City Point'}`,
    `💰 *Cash Collect:* ₹${leg1Balance} (Advance online receive ho chuka hai)`,
    ``,
    `📍 *TRIP 2: ${leg2Route} (Return)*`,
    `👤 *Passenger:* ${bBack.passenger_name || 'Return Passenger'} (${bBack.phone})`,
    `⏰ *Return Pickup Time:* ${leg2PickupTime}`,
    `💰 *Return Cash Collect:* ₹${leg2Balance}`,
    ``,
    `⚠️ *Instruction:* Trip 1 passenger se trip se 1 ghanta pehle call karke pickup confirm karein.`,
    `Baat hone ke baad neeche *"Baat Ho Gayi"* button dabayein:`,
  ].join('\n')

  return await sendInteractiveButtons({
    to: driverPhone,
    body,
    buttons: [
      { id: `DRIVER_CALLED:leg1:${matchId}`, title: '📞 Baat Ho Gayi' },
    ],
    bookingId: bOut.id,
    eventVersion: `driver_duty:${matchId}`,
  })
}

/**
 * Handles incoming WhatsApp webhook events from the driver (button clicks or text replies).
 */
export async function handleDriverLifecycleWebhook(text: string, fromPhone: string) {
  const db = createServiceClient()
  const cleanPhone = String(fromPhone).replace(/\D/g, '').slice(-10)

  // 1. Identify Action, Leg and MatchId from button payload or text
  let action: 'CALLED' | 'BOARDED' | 'DROPPED' | null = null
  let leg: 'leg1' | 'leg2' = 'leg1'
  let matchId: string | null = null

  const upper = text.trim().toUpperCase()

  if (upper.startsWith('DRIVER_CALLED:')) {
    action = 'CALLED'
    const parts = text.split(':')
    leg = parts[1] === 'leg2' ? 'leg2' : 'leg1'
    matchId = parts[2] || null
  } else if (upper.startsWith('DRIVER_BOARDED:')) {
    action = 'BOARDED'
    const parts = text.split(':')
    leg = parts[1] === 'leg2' ? 'leg2' : 'leg1'
    matchId = parts[2] || null
  } else if (upper.startsWith('DRIVER_DROPPED:')) {
    action = 'DROPPED'
    const parts = text.split(':')
    leg = parts[1] === 'leg2' ? 'leg2' : 'leg1'
    matchId = parts[2] || null
  }
  // Smart Hinglish Text Fallback:
  else if (upper.includes('BAAT HO GAYI') || upper.includes('CALL DONE') || upper.includes('CALL HO GAYA')) {
    action = 'CALLED'
  } else if (upper.includes('BAITH GAYE') || upper.includes('ONBOARD') || upper.includes('CAR MAI BETH') || upper.includes('CAR ME BETH')) {
    action = 'BOARDED'
  } else if (upper.includes('DROP KAR DIYA') || upper.includes('DROP HO GAYA') || upper.includes('CHHOD DIYA') || upper.includes('DROPPED')) {
    action = 'DROPPED'
  }

  if (!action) return false

  // 2. If matchId not in payload, look up driver's active match by driver phone
  if (!matchId) {
    const { data: drivers } = await db.from('drivers').select('id,name').eq('phone', cleanPhone).limit(1)
    const driver = drivers?.[0]
    if (!driver) return false

    const { data: activeMatches } = await db
      .from('matches')
      .select('*')
      .eq('driver_id', driver.id)
      .order('created_at', { ascending: false })
      .limit(1)

    const match = activeMatches?.[0]
    if (!match) return false
    matchId = match.id
  }

  // 3. Fetch match and both bookings
  const { data: match } = await db.from('matches').select('*').eq('id', matchId).single()
  if (!match) return false

  const { data: bOut } = await db.from('bookings').select('*').eq('id', match.booking_out).single()
  const { data: bBack } = await db.from('bookings').select('*').eq('id', match.booking_back).single()

  if (!bOut || !bBack) return false

  const targetBooking = leg === 'leg1' ? bOut : bBack
  const nowIso = new Date().toISOString()
  const currentLifecycle = (targetBooking.extras as any)?.driver_lifecycle || {}

  // ── STAGE 1: CALL CONFIRMED ──
  if (action === 'CALLED') {
    const updatedLifecycle = {
      ...currentLifecycle,
      stage: `${leg}_called`,
      [`${leg}_called_at`]: nowIso,
    }

    await db.from('bookings').update({
      extras: { ...(targetBooking.extras || {}), driver_lifecycle: updatedLifecycle },
      updated_at: nowIso,
    }).eq('id', targetBooking.id)

    // Notify Admin
    await notifyAdmin(
      `driver_${leg}_called:${matchId}`,
      targetBooking.id,
      `📞 *Driver Update:* Driver ne ${leg === 'leg1' ? 'Trip 1' : 'Trip 2'} passenger (${targetBooking.passenger_name}) se call par baat confirm kar li hai.`
    )

    // Send Driver next step: Boarding button
    const body = [
      `✅ *Update Recorded:* ${leg === 'leg1' ? 'Trip 1' : 'Trip 2'} passenger se aapki baat note ho gayi hai!`,
      ``,
      `Jab passenger gaadi mein baith jayein aur ride shuru ho, toh neeche *"Passenger Baith Gaye"* button dabayein:`,
    ].join('\n')

    await sendInteractiveButtons({
      to: fromPhone,
      body,
      buttons: [
        { id: `DRIVER_BOARDED:${leg}:${matchId}`, title: '🚖 Passenger Baith Gaye' },
      ],
      bookingId: targetBooking.id,
      eventVersion: `board_prompt:${leg}:${matchId}`,
    })
    return true
  }

  // ── STAGE 2: PASSENGER BOARDED (TRIP STARTED) ──
  if (action === 'BOARDED') {
    const updatedLifecycle = {
      ...currentLifecycle,
      stage: `${leg}_boarded`,
      [`${leg}_boarded_at`]: nowIso,
    }

    await db.from('bookings').update({
      status: 'in_progress',
      extras: { ...(targetBooking.extras || {}), driver_lifecycle: updatedLifecycle },
      updated_at: nowIso,
    }).eq('id', targetBooking.id)

    // Alert Passenger
    try {
      await sendText({
        to: targetBooking.phone,
        body: `🚕 *Maruti Cab Safar Shuru!* 🌟\n\nNamaste ${targetBooking.passenger_name}! Aapki cab ride shuru ho gayi hai.\nDriver Bhaiya: *${bOut.driver_name || 'Maruti Cab Driver'}*\nRoute: *${targetBooking.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'}*\n\nShubh yatra! 24x7 Helpline: +91 72823 16090`,
        bookingId: targetBooking.id,
        eventVersion: `ride_started:${targetBooking.id}`,
      })
    } catch (passErr) {
      console.warn('Ride started text notice:', passErr)
    }

    // Alert Admin
    await notifyAdmin(
      `driver_${leg}_boarded:${matchId}`,
      targetBooking.id,
      `🚖 *Passenger Onboarded:* ${targetBooking.passenger_name} (${targetBooking.phone}) car mein baith chuke hain. ${leg === 'leg1' ? 'Trip 1' : 'Trip 2'} safar shuru!`
    )

    const balanceAmount = Math.max(0, (targetBooking.total_fare || 2200) - (targetBooking.advance_paid || 500))

    // Send Driver next step: Drop button
    const body = [
      `✅ *Trip Started!*`,
      `Safe journey. Passenger se balance amount *₹${balanceAmount}* cash ya UPI collect karein.`,
      ``,
      `Jab aap passenger ko unke drop point par chhod dein, toh drop complete karne ke liye neeche button dabayein:`,
    ].join('\n')

    await sendInteractiveButtons({
      to: fromPhone,
      body,
      buttons: [
        { id: `DRIVER_DROPPED:${leg}:${matchId}`, title: '📍 Passenger Drop Kar Diya' },
      ],
      bookingId: targetBooking.id,
      eventVersion: `drop_prompt:${leg}:${matchId}`,
    })
    return true
  }

  // ── STAGE 3: PASSENGER DROPPED ──
  if (action === 'DROPPED') {
    const updatedLifecycle = {
      ...currentLifecycle,
      stage: `${leg}_dropped`,
      [`${leg}_dropped_at`]: nowIso,
    }

    await db.from('bookings').update({
      status: 'completed',
      extras: { ...(targetBooking.extras || {}), driver_lifecycle: updatedLifecycle },
      updated_at: nowIso,
    }).eq('id', targetBooking.id)

    // Send Feedback Request to dropped passenger
    try {
      await sendWhatsAppTemplateMessage({
        toPhone: targetBooking.phone,
        templateCode: 'ride_completed_feedback',
        variables: [targetBooking.passenger_name || 'Passenger'],
        bookingId: targetBooking.id,
      })
    } catch (fbErr) {
      console.warn('Feedback request notice:', fbErr)
    }

    // If Leg 1 Dropped -> Transition to Leg 2 (Return Ride)!
    if (leg === 'leg1') {
      const leg2Route = bBack.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'
      const leg2Balance = Math.max(0, (bBack.total_fare || 1800) - (bBack.advance_paid || 500))
      const leg2PickupTime = String(bBack.pickup_time || '18:00').slice(0, 5)

      // Alert Admin
      await notifyAdmin(
        `trip1_completed:${matchId}`,
        bOut.id,
        `✅ *Trip 1 Dropped:* Trip 1 passenger ${bOut.passenger_name} successfully drop ho gaye hain. Ab Driver ki Return Trip 2 shuru ho rahi hai.`
      )

      // Send Return Trip Details to Driver
      const returnBody = [
        `🎉 *Trip 1 Completed Successfully!*`,
        `Ab aapki *Trip 2 (Return: ${leg2Route})* shuru hoti hai.`,
        ``,
        `📍 *TRIP 2: ${leg2Route}*`,
        `👤 *Return Passenger:* ${bBack.passenger_name || 'Passenger'}`,
        `📞 *Mobile:* ${bBack.phone}`,
        `📅 *Date:* ${bBack.travel_date}`,
        `⏰ *Pickup Time:* ${leg2PickupTime}`,
        `🏡 *Pickup Location:* ${bBack.address || bBack.drop_name || 'City Point'}`,
        `💰 *Cash Collect:* ₹${leg2Balance}`,
        ``,
        `⚠️ Kripya return passenger se call par baat karein aur baat hone par neeche button dabayein:`,
      ].join('\n')

      await sendInteractiveButtons({
        to: fromPhone,
        body: returnBody,
        buttons: [
          { id: `DRIVER_CALLED:leg2:${matchId}`, title: '📞 Return Call Done' },
        ],
        bookingId: bBack.id,
        eventVersion: `return_duty:${matchId}`,
      })
      return true
    }

    // If Leg 2 Dropped -> Whole Round Trip Completed!
    if (leg === 'leg2') {
      await db.from('matches').update({
        confirmed_at: nowIso,
      }).eq('id', matchId)

      // Alert Admin
      await notifyAdmin(
        `round_match_completed:${matchId}`,
        bBack.id,
        `🎉 *ROUND TRIP MATCH 100% COMPLETED!* Match #${matchId.slice(0, 8)}. Driver ${bOut.driver_name} ne dono legs (Khargone ⇄ Indore) safaltapoorvak poore kar liye hain!`
      )

      // Send Final Summary to Driver
      const finalDriverBody = [
        `🌟 *Shabash! Dono Trips Safaltapoorvak Poori Ho Gayi Hain!* 🥳`,
        ``,
        `Dono passengers unke drop points par safe drop ho chuke hain aur aapki duty complete ho gayi hai.`,
        ``,
        `Maruti Cab par safe aur timely driving ke liye dhanyavad! 🚗💨`,
      ].join('\n')

      await sendText({
        to: fromPhone,
        body: finalDriverBody,
        bookingId: bBack.id,
        eventVersion: `duty_complete:${matchId}`,
      })
      return true
    }
  }

  return false
}
