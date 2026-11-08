import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { sendWhatsAppTemplateMessage } from '@/lib/whatsapp-templates'
import { sendInteractiveButtons, sendText, normalizeWhatsAppPhone } from '@/lib/whatsapp'
import { notifyAdmin } from '@/lib/booking-notifications'
import { dispatchNextProvider } from '@/lib/provider-dispatch-engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET || 'maruticab_cron_secret_2026'
  const authHeader = req.headers.get('authorization')
  if (authHeader === `Bearer ${secret}`) return true
  const querySecret = req.nextUrl.searchParams.get('secret')
  return querySecret === secret
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceClient()
  const nowIso = new Date().toISOString()

  // 1. Fetch due jobs (run_at <= now AND status = 'pending')
  const { data: dueJobs, error: jErr } = await db
    .from('jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('run_at', nowIso)
    .order('run_at', { ascending: true })
    .limit(50)

  if (jErr) {
    return NextResponse.json({ error: jErr.message }, { status: 500 })
  }

  const results: any[] = []

  for (const job of dueJobs || []) {
    // Lock job to processing
    await db.from('jobs').update({ status: 'processing', attempts: (job.attempts || 0) + 1 }).eq('id', job.id)

    try {
      if (job.type === 'provider_timeout') {
        // ── 1. PROVIDER TIMEOUT (1 Hour Passed without Reply) ──
        const { matchId, attemptId, providerId, priorityIndex } = job.payload || {}
        
        // Check if attempt is still 'sent'
        const { data: attempt } = await db.from('dispatch_attempts').select('*').eq('id', attemptId).single()
        if (attempt && attempt.status === 'sent') {
          await db.from('dispatch_attempts').update({ status: 'timeout' }).eq('id', attemptId)

          const { data: provider } = await db.from('providers').select('*').eq('id', providerId).single()
          const providerName = provider?.name || `Provider #${priorityIndex + 1}`

          // Alert Admin with 3 interactive action buttons
          const adminAlertText = [
            `⏰ *PROVIDER TIMEOUT ALERT!* ⚠️`,
            `Match #${String(matchId).slice(0, 8)}: Provider #${priorityIndex + 1} (${providerName}) ne 1 ghante mein koi jawab nahi diya.`,
            ``,
            `Aap kya action lena chahte hain?`,
          ].join('\n')

          const adminPhone = process.env.ADMIN_PHONE_NUMBER || process.env.WHATSAPP_ADMIN_PHONE || '917282316090'
          await sendInteractiveButtons({
            to: adminPhone,
            body: adminAlertText,
            buttons: [
              { id: `ADMIN_ACT:called:${matchId}:${providerId}`, title: '📞 Maine Call Kiya' },
              { id: `ADMIN_ACT:next:${matchId}:${providerId}`, title: '⏭️ Agle Provider Ko' },
              { id: `ADMIN_ACT:wait:${matchId}:${providerId}`, title: '⏳ 30 Min Aur Ruko' },
            ],
            eventVersion: `timeout_admin:${attemptId}`,
          }).catch(async () => {
            // Fallback plain text admin alert
            await notifyAdmin(
              `prov_timeout:${attemptId}`,
              null,
              `⏰ *PROVIDER TIMEOUT!* Match #${String(matchId).slice(0, 8)}: Provider #${priorityIndex + 1} (${providerName}) 1 ghante se silent hai. Agle provider ko dispatch karein ya call karein.`
            )
          })

          results.push({ jobId: job.id, action: 'provider_timeout_alerted' })
        }
      } else if (job.type === 'release_driver_details') {
        // ── 2. T-1 HOUR: RELEASE CAR & DRIVER DETAILS TO PASSENGERS ──
        const { bOutId, bBackId, driverName, driverPhone, carModel, carReg } = job.payload || {}
        
        const { data: bOut } = await db.from('bookings').select('*').eq('id', bOutId).single()
        const { data: bBack } = await db.from('bookings').select('*').eq('id', bBackId).single()

        if (bOut && bOut.status !== 'cancelled') {
          const outBalance = Math.max(0, (bOut.total_fare || 2200) - (bOut.advance_paid || 500))
          await sendWhatsAppTemplateMessage({
            toPhone: bOut.phone,
            templateCode: 'driver_car_details',
            variables: [
              bOut.passenger_name || 'Passenger',
              driverName,
              driverPhone,
              carModel,
              carReg,
              bOut.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone',
              bOut.travel_date,
              String(bOut.pickup_time).slice(0, 5),
              bOut.address || bOut.drop_name || 'City Point',
              String(outBalance),
            ],
            bookingId: bOut.id,
          })
        }

        if (bBack && bBack.status !== 'cancelled') {
          const backBalance = Math.max(0, (bBack.total_fare || 1800) - (bBack.advance_paid || 500))
          await sendWhatsAppTemplateMessage({
            toPhone: bBack.phone,
            templateCode: 'driver_car_details',
            variables: [
              bBack.passenger_name || 'Passenger',
              driverName,
              driverPhone,
              carModel,
              carReg,
              bBack.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone',
              bBack.travel_date,
              String(bBack.pickup_time).slice(0, 5),
              bBack.address || bBack.drop_name || 'City Point',
              String(backBalance),
            ],
            bookingId: bBack.id,
          })
        }

        results.push({ jobId: job.id, action: 'released_driver_details' })
      } else if (job.type === 'abandoned_payment_check') {
        // ── 3. ABANDONED PAYMENT RETRY FOLLOWUP (15 MIN) ──
        const { bookingId } = job.payload || {}
        const { data: b } = await db.from('bookings').select('*').eq('id', bookingId).single()
        if (b && b.status === 'pending_payment' && (b.advance_paid || 0) === 0) {
          const retryUrl = `https://maruticab.in/pay?ref=${b.booking_ref}`
          const retryText = [
            `Namaste *${b.passenger_name || 'Passenger'}* ji! 🚖`,
            `Aapki *${b.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'}* cab booking request record hui hai, par advance payment pending hai.`,
            ``,
            `Apni seat confirm karne ke liye yahan se ₹500 advance pay karein:`,
            `👉 ${retryUrl}`,
            ``,
            `Kisi bhi sahayata ke liye call karein: +91 72823 16090`,
          ].join('\n')

          await sendText({ to: b.phone, body: retryText, bookingId: b.id })
          results.push({ jobId: job.id, action: 'sent_abandoned_retry' })
        }
      }

      // Mark completed
      await db.from('jobs').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', job.id)
    } catch (err: any) {
      console.error(`Job ${job.id} failed:`, err)
      await db.from('jobs').update({
        status: (job.attempts || 0) >= 3 ? 'failed' : 'pending',
        error: err?.message || 'Execution error',
        updated_at: new Date().toISOString(),
      }).eq('id', job.id)
    }
  }

  return NextResponse.json({
    success: true,
    processedCount: dueJobs?.length || 0,
    results,
  })
}
