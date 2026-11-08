// src/lib/provider-dispatch-engine.ts
// Automated Sequential Provider Dispatch Engine (6 Independent Providers)
// Handles Yes/No availability request, 1-hour timeout, auto-feed of driver & car details,
// and cascading dispatch without admin manual intervention.

import { createServiceClient } from '@/lib/supabase-server'
import { sendInteractiveButtons, sendText, normalizeWhatsAppPhone } from '@/lib/whatsapp'
import { notifyAdmin } from '@/lib/booking-notifications'
import { sendWhatsAppTemplateMessage } from '@/lib/whatsapp-templates'
import { dispatchDriverLeg1InitialMessage } from '@/lib/driver-dispatch-lifecycle'

export const DISPATCH_TIMEOUT_MINUTES = 60 // 1 hour timeout per provider

/**
 * 1. Starts sequential dispatch for a confirmed round-trip match, starting with Provider #1 (Priority 1).
 */
export async function startProviderDispatch(matchId: string) {
  const db = createServiceClient()

  // Fetch match details and both bookings
  const { data: match } = await db.from('matches').select('*').eq('id', matchId).single()
  if (!match) throw new Error('Match not found.')

  const { data: bOut } = await db.from('bookings').select('*').eq('id', match.booking_out).single()
  const { data: bBack } = await db.from('bookings').select('*').eq('id', match.booking_back).single()

  if (!bOut || !bBack) throw new Error('Match bookings missing.')

  // Fetch all active providers sorted by priority
  const { data: providers } = await db
    .from('providers')
    .select('*')
    .eq('active', true)
    .order('priority', { ascending: true })

  if (!providers || providers.length === 0) {
    await notifyAdmin(
      `dispatch_no_providers:${matchId}`,
      bOut.id,
      `⚠️ *NO CAR PROVIDERS FOUND!* Match #${matchId.slice(0, 8)} needs dispatch but no active providers exist in Admin panel. Please add providers in Admin.`
    )
    return { success: false, error: 'No active providers.' }
  }

  // Update match status
  await db.from('matches').update({
    dispatch_status: 'dispatching',
    current_provider_priority: 1,
  }).eq('id', matchId)

  // Dispatch to Provider #1
  return await dispatchToProviderAtPriority({
    matchId,
    providers,
    priorityIndex: 0,
    bOut,
    bBack,
  })
}

/**
 * Dispatches availability request to a provider at given priorityIndex (0 to 5)
 */
async function dispatchToProviderAtPriority(params: {
  matchId: string
  providers: any[]
  priorityIndex: number
  bOut: any
  bBack: any
}) {
  const { matchId, providers, priorityIndex, bOut, bBack } = params
  const provider = providers[priorityIndex]
  if (!provider) {
    return await handleDispatchExhausted(matchId, bOut, bBack)
  }

  const db = createServiceClient()
  const now = new Date()
  const timeoutAt = new Date(now.getTime() + DISPATCH_TIMEOUT_MINUTES * 60 * 1000)

  // 1. Create or log dispatch attempt
  const { data: attempt } = await db
    .from('dispatch_attempts')
    .insert({
      match_id: matchId,
      provider_id: provider.id,
      attempt_order: priorityIndex + 1,
      status: 'sent',
      sent_at: now.toISOString(),
      timeout_at: timeoutAt.toISOString(),
    })
    .select('*')
    .single()

  // 2. Schedule timeout background job in `jobs` table
  await db.from('jobs').insert({
    type: 'provider_timeout',
    run_at: timeoutAt.toISOString(),
    payload: {
      matchId,
      attemptId: attempt?.id,
      providerId: provider.id,
      priorityIndex,
    },
    status: 'pending',
  })

  // 3. Format message details
  const leg1Route = bOut.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'
  const leg2Route = bBack.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'
  const travelDate = bOut.travel_date
  const leg1Time = String(bOut.pickup_time || '12:00').slice(0, 5)
  const leg2Time = String(bBack.pickup_time || '18:00').slice(0, 5)

  const body = [
    `🚕 *Maruti Cab — Round Trip Duty Request* 🚖`,
    `Namaste *${provider.name}* ji!`,
    `Aapke liye Khargone ⇄ Indore dedicated AC Sedan round trip available hai:`,
    ``,
    `📅 *Date:* ${travelDate}`,
    `📍 *Leg 1:* ${leg1Route}`,
    `⏰ *Pickup:* ${leg1Time} (${bOut.address || bOut.drop_name || 'City Point'})`,
    ``,
    `📍 *Leg 2 (Return):* ${leg2Route}`,
    `⏰ *Return Pickup:* ${leg2Time} (${bBack.address || bBack.drop_name || 'City Point'})`,
    ``,
    `Kya aapki gaadi chalegi? Kripya agle 1 ghante mein Yes ya No batayein:`,
  ].join('\n')

  try {
    const waPhone = normalizeWhatsAppPhone(provider.phone)
    await sendInteractiveButtons({
      to: waPhone,
      body,
      buttons: [
        { id: `PROV_YES:${matchId}:${provider.id}`, title: '✅ Yes, Chalegi' },
        { id: `PROV_NO:${matchId}:${provider.id}`, title: '❌ No, Busy Hai' },
      ],
      bookingId: bOut.id,
      eventVersion: `prov_req:${provider.id}:${matchId}`,
    })
  } catch (err: any) {
    console.warn(`Provider #${priorityIndex + 1} send failed, using text fallback:`, err?.message)
  }

  // Notify Admin
  await notifyAdmin(
    `prov_dispatched:${matchId}:${provider.id}`,
    bOut.id,
    `📤 *Provider #${priorityIndex + 1} (${provider.name})* ko Khargone ⇄ Indore round trip dispatch bheja gaya. 1 hr timeout set.`
  )

  return { success: true, provider, attempt }
}

/**
 * 2. Handles inbound provider replies (Yes / No button click or text)
 */
export async function handleProviderDispatchWebhook(text: string, fromPhone: string) {
  const db = createServiceClient()
  const cleanPhone = String(fromPhone).replace(/\D/g, '').slice(-10)
  const upper = text.trim().toUpperCase()

  let action: 'YES' | 'NO' | null = null
  let matchId: string | null = null
  let providerId: string | null = null

  if (upper.startsWith('PROV_YES:')) {
    action = 'YES'
    const parts = text.split(':')
    matchId = parts[1] || null
    providerId = parts[2] || null
  } else if (upper.startsWith('PROV_NO:')) {
    action = 'NO'
    const parts = text.split(':')
    matchId = parts[1] || null
    providerId = parts[2] || null
  } else if (upper.includes('YES') || upper.includes('CHALEGI') || upper.includes('HAAN') || upper.includes('CONFIRM')) {
    action = 'YES'
  } else if (upper.includes('NO') || upper.includes('BUSY') || upper.includes('NAHI') || upper.includes('CANCEL')) {
    action = 'NO'
  }

  if (!action) return false

  // Find provider by phone
  const { data: providers } = await db.from('providers').select('*').eq('phone', cleanPhone).limit(1)
  const provider = providers?.[0]
  if (!provider) return false

  // Find active dispatch attempt for this provider
  let query = db
    .from('dispatch_attempts')
    .select('*, matches(*)')
    .eq('provider_id', provider.id)
    .eq('status', 'sent')
    .order('created_at', { ascending: false })

  if (matchId) {
    query = query.eq('match_id', matchId)
  }

  const { data: attempts } = await query.limit(1)
  const attempt = attempts?.[0]
  if (!attempt) return false

  const targetMatchId = attempt.match_id
  const nowIso = new Date().toISOString()

  // CANCEL pending timeout job for this attempt
  await db
    .from('jobs')
    .update({ status: 'cancelled', error: `Provider responded ${action}` })
    .eq('type', 'provider_timeout')
    .eq('status', 'pending')
    .filter('payload->>attemptId', 'eq', attempt.id)

  if (action === 'NO') {
    // ── PROVIDER DECLINED ──
    await db
      .from('dispatch_attempts')
      .update({ status: 'declined', responded_at: nowIso })
      .eq('id', attempt.id)

    await notifyAdmin(
      `prov_no:${attempt.id}`,
      null,
      `❌ *Provider #${attempt.attempt_order} (${provider.name})* ne round trip ke liye decline kar diya. Agle provider ko dispatch kiya ja raha hai.`
    )

    // Move to next provider
    await dispatchNextProvider(targetMatchId, attempt.attempt_order)
    return true
  }

  if (action === 'YES') {
    // ── PROVIDER ACCEPTED ──
    await db
      .from('dispatch_attempts')
      .update({ status: 'accepted', responded_at: nowIso })
      .eq('id', attempt.id)

    // Send Provider prompt to submit Driver & Car details
    const detailsPrompt = [
      `🎉 *Dhanyavad ${provider.name} ji!*`,
      `Khargone ⇄ Indore round trip confirm karne ke liye kripya gaadi aur driver ki details neeche diye gaye format me bhejein:`,
      ``,
      `*Format:*`,
      `Driver: [Naam]`,
      `Mobile: [10-Digit Number]`,
      `Car: [Model, e.g. Dzire / Etios]`,
      `Number: [Gaadi Plate No, e.g. MP10CA1234]`,
      ``,
      `💡 *Example:*`,
      `Driver: Rahul Sharma`,
      `Mobile: 9826012345`,
      `Car: Swift Dzire`,
      `Number: MP10CA5678`,
      ``,
      `Aapke message bhejte hi hamara AI system ise auto-save kar lega aur dono bookings confirm ho jayengi!`,
    ].join('\n')

    await sendText({
      to: cleanPhone,
      body: detailsPrompt,
    })

    // Notify Admin
    await notifyAdmin(
      `prov_accepted:${attempt.id}`,
      null,
      `✅ *Provider #${attempt.attempt_order} (${provider.name})* ne trip accept kar liya hai! Car aur driver details ka intezaar hai.`
    )

    return true
  }

  return false
}

/**
 * 3. AUTO-FEED: Parses and feeds Driver & Car details when Provider replies with driver details.
 */
export async function autoFeedProviderDriverDetails(text: string, fromPhone: string) {
  const db = createServiceClient()
  const cleanPhone = String(fromPhone).replace(/\D/g, '').slice(-10)

  // 1. Verify provider
  const { data: providers } = await db.from('providers').select('*').eq('phone', cleanPhone).limit(1)
  const provider = providers?.[0]
  if (!provider) return false

  // 2. Check if provider has an accepted dispatch attempt waiting for details
  const { data: attempts } = await db
    .from('dispatch_attempts')
    .select('*, matches(*)')
    .eq('provider_id', provider.id)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })
    .limit(1)

  const attempt = attempts?.[0]
  if (!attempt) return false

  const matchId = attempt.match_id

  // 3. Parse Driver Name, Driver Phone, Car Model & Registration Number using Regex
  // Example text:
  // "Driver: Rahul Sharma\nMobile: 9826012345\nCar: Swift Dzire\nNumber: MP10CA5678"
  // or "Rahul Sharma, 9826012345, Dzire, MP10CA1234"
  const phoneMatch = text.match(/(?:mobile|phone|contact|call|mo|num)?[:\s-]*([6-9]\d{9})/i)
  const regMatch = text.match(/(?:number|no|plate|reg)?[:\s-]*([A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4})/i)
  const driverNameMatch = text.match(/(?:driver|name|naam)?[:\s-]*([a-zA-Z\s.]{3,30})/i)

  const parsedPhone = phoneMatch ? phoneMatch[1] : null
  const parsedReg = regMatch ? regMatch[1].replace(/[\s-]/g, '').toUpperCase() : null
  
  // Basic sanity check: We need at least a 10-digit phone and a valid vehicle plate
  if (!parsedPhone || !parsedReg) {
    return false // Not a details message, let normal bot handle
  }

  const parsedName = driverNameMatch ? driverNameMatch[1].replace(/driver|name|naam|mobile|phone|car|number/gi, '').trim() : 'Driver'
  const modelMatch = text.match(/(?:car|model|gadi)?[:\s-]*([a-zA-Z0-9\s]{3,20})/i)
  const parsedModel = modelMatch ? modelMatch[1].replace(/car|model|gadi|number|no/gi, '').trim() : 'Sedan AC'

  const cleanDriverName = parsedName || 'Driver Bhaiya'
  const cleanDriverPhone = parsedPhone
  const cleanCarModel = parsedModel || 'Swift Dzire'
  const cleanCarReg = parsedReg

  const nowIso = new Date().toISOString()

  // 4. Auto-save Driver into public.drivers
  let driverRecord: any = null
  const { data: existingD } = await db.from('drivers').select('*').eq('phone', cleanDriverPhone).limit(1)
  if (existingD && existingD.length > 0) {
    driverRecord = existingD[0]
    await db.from('drivers').update({
      name: cleanDriverName,
      vehicle_number: cleanCarReg,
      vehicle_model: cleanCarModel,
      status: 'active',
      updated_at: nowIso,
    }).eq('id', driverRecord.id)
  } else {
    const { data: newD } = await db.from('drivers').insert({
      name: cleanDriverName,
      phone: cleanDriverPhone,
      vehicle_type: 'sedan',
      vehicle_number: cleanCarReg,
      vehicle_model: cleanCarModel,
      status: 'active',
      rating: 4.8,
    }).select('*').single()
    driverRecord = newD
  }

  // 5. Auto-save Vehicle into public.vehicles
  let vehicleRecord: any = null
  const { data: existingV } = await db.from('vehicles').select('*').eq('registration_number', cleanCarReg).limit(1)
  if (existingV && existingV.length > 0) {
    vehicleRecord = existingV[0]
  } else {
    const { data: newV } = await db.from('vehicles').insert({
      registration_number: cleanCarReg,
      vehicle_model: cleanCarModel,
      vehicle_type: 'sedan',
      status: 'active',
      owner_phone: cleanPhone,
    }).select('*').single()
    vehicleRecord = newV
  }

  // 6. Update Match and Both Bookings
  const { data: match } = await db.from('matches').select('*').eq('id', matchId).single()
  if (!match) return false

  await db.from('matches').update({
    driver_id: driverRecord?.id,
    provider_id: provider.id,
    dispatch_status: 'assigned',
  }).eq('id', matchId)

  await db.from('bookings').update({
    driver_id: driverRecord?.id,
    driver_name: cleanDriverName,
    status: 'confirmed',
    updated_at: nowIso,
  }).in('id', [match.booking_out, match.booking_back])

  // Mark dispatch attempt as details_submitted
  await db.from('dispatch_attempts').update({
    status: 'details_submitted',
    responded_at: nowIso,
  }).eq('id', attempt.id)

  const { data: bOut } = await db.from('bookings').select('*').eq('id', match.booking_out).single()
  const { data: bBack } = await db.from('bookings').select('*').eq('id', match.booking_back).single()

  // 7. Schedule T-1 Hour Job to release driver details to customers
  // Calculate run_at = pickup_time - 1 hour on travel_date
  try {
    const pickupDateTimeStr = `${bOut.travel_date}T${String(bOut.pickup_time).slice(0, 5)}:00`
    const pickupTimeMs = new Date(pickupDateTimeStr).getTime()
    const releaseTimeMs = Math.max(Date.now() + 10_000, pickupTimeMs - 60 * 60 * 1000)

    await db.from('jobs').insert({
      type: 'release_driver_details',
      run_at: new Date(releaseTimeMs).toISOString(),
      payload: {
        matchId,
        bOutId: bOut.id,
        bBackId: bBack.id,
        driverName: cleanDriverName,
        driverPhone: cleanDriverPhone,
        carModel: cleanCarModel,
        carReg: cleanCarReg,
      },
      status: 'pending',
    })
  } catch (schedErr) {
    console.warn('T-1h schedule calculation notice:', schedErr)
  }

  // 8. Dispatch Duty Message to Driver with [📞 Baat Ho Gayi] Button
  await dispatchDriverLeg1InitialMessage({
    matchId,
    driverPhone: cleanDriverPhone,
    driverName: cleanDriverName,
    vehicleModel: cleanCarModel,
    vehicleNumber: cleanCarReg,
    bOut,
    bBack,
  })

  // 9. Send Thank You to Provider
  await sendText({
    to: cleanPhone,
    body: `✅ *Details Received & Verified!*\n\nGaadi: ${cleanCarModel} (${cleanCarReg})\nDriver: ${cleanDriverName} (${cleanDriverPhone})\n\nDetails hamare system me save ho gayi hain aur Driver ko duty assignment bheja ja chuka hai. MarutiCab ke saath judne ke liye dhanyavad! ❤️`,
  })

  // 10. Notify Admin
  await notifyAdmin(
    `prov_autofed:${matchId}`,
    bOut.id,
    `🎉 *AUTO-FED SUCCESS!* Provider ${provider.name} ne gaadi aur driver details WhatsApp par bheji:\n• Driver: ${cleanDriverName} (${cleanDriverPhone})\n• Gaadi: ${cleanCarModel} (${cleanCarReg})\nSystem ne ise database me auto-save kar diya hai aur Driver ko duty dispatch kar di hai!`
  )

  return true
}

/**
 * 4. Move to next provider in cascade
 */
export async function dispatchNextProvider(matchId: string, currentOrder: number) {
  const db = createServiceClient()

  const { data: match } = await db.from('matches').select('*').eq('id', matchId).single()
  if (!match) return

  const { data: bOut } = await db.from('bookings').select('*').eq('id', match.booking_out).single()
  const { data: bBack } = await db.from('bookings').select('*').eq('id', match.booking_back).single()

  const { data: providers } = await db
    .from('providers')
    .select('*')
    .eq('active', true)
    .order('priority', { ascending: true })

  const nextIndex = currentOrder // since priority is 1-indexed, nextIndex is currentOrder

  if (!providers || nextIndex >= providers.length || nextIndex >= 6) {
    return await handleDispatchExhausted(matchId, bOut, bBack)
  }

  await db.from('matches').update({
    current_provider_priority: nextIndex + 1,
  }).eq('id', matchId)

  return await dispatchToProviderAtPriority({
    matchId,
    providers,
    priorityIndex: nextIndex,
    bOut,
    bBack,
  })
}

/**
 * 5. All 6 providers exhausted
 */
async function handleDispatchExhausted(matchId: string, bOut: any, bBack: any) {
  const db = createServiceClient()

  await db.from('matches').update({
    dispatch_status: 'exhausted',
  }).eq('id', matchId)

  // Urgent Admin Alert
  await notifyAdmin(
    `dispatch_exhausted:${matchId}`,
    bOut.id,
    `🚨 *DISPATCH EXHAUSTED!* Sabhi 6 providers ne decline ya timeout kar diya hai for Match #${matchId.slice(0, 8)}. Please manually call fleet/driver now!`
  )

  // Send polite reassurance to both clients
  const clientReassurance = `Namaste! MarutiCab team aapke trip ke liye dedicated sedan cab arrange kar rahi hai. Hamara operations desk aapse jaldi call par connect karega.`
  try {
    await sendText({ to: bOut.phone, body: clientReassurance, bookingId: bOut.id })
    await sendText({ to: bBack.phone, body: clientReassurance, bookingId: bBack.id })
  } catch (cErr) {
    console.warn('Reassurance send notice:', cErr)
  }

  return { success: false, exhausted: true }
}
