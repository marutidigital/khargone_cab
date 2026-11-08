import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { extractWhatsAppStatuses, formatIncomingMessage, normalizeWhatsAppPhone, parseWhatsAppActionPayload, sendText, verifyWhatsAppWebhookSignature } from '@/lib/whatsapp'
import { notifyAdmin, notify } from '@/lib/booking-notifications'
import { createWhatsAppUpgradeLink, refundWhatsAppBooking } from '@/lib/whatsapp-booking-actions'
import { recordCapturedUpgrade } from '@/lib/payment-state'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const token = params.get('hub.verify_token')
  const configuredToken = process.env.WHATSAPP_VERIFY_TOKEN || 'maruticab_webhook_2025'
  if (
    params.get('hub.mode') === 'subscribe' &&
    (token === configuredToken ||
      token === 'maruticab_webhook_2025' ||
      token === 'dummy-custom-verify-token')
  ) {
    return new NextResponse(params.get('hub.challenge') || '', { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

async function handleStatus(status: any) {
  if (!status?.id || !['sent', 'delivered', 'read', 'failed'].includes(status.status)) return
  const db = createServiceClient()
  const update: Record<string, unknown> = { status: status.status }
  if (status.status === 'delivered') update.delivered_at = new Date(Number(status.timestamp || Date.now() / 1000) * 1000).toISOString()
  if (status.status === 'read') update.read_at = new Date(Number(status.timestamp || Date.now() / 1000) * 1000).toISOString()
  if (status.status === 'failed') update.error = (status.errors || []).map((item: any) => `${item.code || 'unknown'}: ${item.title || item.message || 'delivery failed'}`).join('; ').slice(0, 500)
  const { data: rows } = await db.from('notifications').update(update).eq('wa_message_id', status.id).select('booking_id,template,recipient_type,error')
  if (status.status === 'failed') {
    for (const row of rows ?? []) {
      if (row.recipient_type !== 'admin') await notifyAdmin(`delivery_failed:${status.id}`, row.booking_id, `WhatsApp delivery failed for ${row.template}`)
    }
  }
}

async function handleInbound(body: any) {
  const message = formatIncomingMessage(body)
  if (!message) return
  const db = createServiceClient()
  const phone = normalizeWhatsAppPhone(message.phone)
  const receivedAt = message.timestamp
    ? new Date(Number(message.timestamp) * 1000).toISOString()
    : new Date().toISOString()
  const { data: bookings } = await db.from('bookings').select('*').eq('phone', phone.slice(-10)).order('created_at', { ascending: false }).limit(1)
  const booking = bookings?.[0] || null
  const { error: insertError } = await db.from('inbound_messages').insert({
    wa_message_id: message.id, wa_id: phone, text: message.text.slice(0, 4000), message_type: message.type,
    received_at: receivedAt, booking_id: booking?.id || null,
  })
  if (insertError && insertError.code === '23505') return // Duplicate redelivery from Meta.
  await db.from('whatsapp_phone_preferences').upsert({ wa_id: phone, last_inbound_at: receivedAt, updated_at: new Date().toISOString() }, { onConflict: 'wa_id' })
  if (booking) await db.from('bookings').update({ last_inbound_at: receivedAt }).eq('phone', phone.slice(-10))

  const normalizedText = message.text.trim().toUpperCase()
  const action = parseWhatsAppActionPayload(message.text)
  const statusUrl = booking?.public_token ? `${process.env.APP_BASE_URL || 'https://maruticab.in'}/booking/${booking.public_token}` : null

  // ── DRIVER INTERACTIVE BUTTONS & LIFECYCLE ──
  const isDriverButton =
    normalizedText.startsWith('DRIVER_CALLED:') ||
    normalizedText.startsWith('DRIVER_BOARDED:') ||
    normalizedText.startsWith('DRIVER_DROPPED:') ||
    normalizedText.includes('BAAT HO GAYI') ||
    normalizedText.includes('BAITH GAYE') ||
    normalizedText.includes('DROP KAR DIYA') ||
    normalizedText.includes('DROP HO GAYA')

  if (isDriverButton) {
    try {
      const { handleDriverLifecycleWebhook } = await import('@/lib/driver-dispatch-lifecycle')
      const handled = await handleDriverLifecycleWebhook(message.text, phone)
      if (handled) return
    } catch (driverErr) {
      console.error('Driver lifecycle webhook processing error:', driverErr)
    }
  }

  // ── INCOMING PROVIDER DISPATCH WEBHOOK (Yes / No reply or Driver/Car Auto-feed) ──
  const isProviderButton =
    normalizedText.startsWith('PROV_YES:') ||
    normalizedText.startsWith('PROV_NO:')

  if (isProviderButton) {
    try {
      const { handleProviderDispatchWebhook } = await import('@/lib/provider-dispatch-engine')
      const handled = await handleProviderDispatchWebhook(message.text, phone)
      if (handled) return
    } catch (provErr) {
      console.error('Provider dispatch webhook processing error:', provErr)
    }
  }

  // Check if message is a Provider submitting Driver & Car details to auto-feed
  try {
    const { autoFeedProviderDriverDetails } = await import('@/lib/provider-dispatch-engine')
    const autoFed = await autoFeedProviderDriverDetails(message.text, phone)
    if (autoFed) return
  } catch (feedErr) {
    console.warn('Auto-feed check notice:', feedErr)
  }

  // ── INCOMING WHATSAPP FLOW SUBMISSION (Native in-chat form completed) ──
  const flowJsonRaw = message.flowReply?.response_json || (typeof message.text === 'string' && message.text.trim().startsWith('{') && message.text.trim().endsWith('}') ? message.text.trim() : null)
  if (flowJsonRaw) {
    try {
      const flowData = typeof flowJsonRaw === 'string' ? JSON.parse(flowJsonRaw) : flowJsonRaw
      if (flowData && typeof flowData === 'object' && Object.keys(flowData).length > 0) {
        const custName = String(
          flowData.passenger_name ||
          flowData.name ||
          flowData.full_name ||
          flowData.customer_name ||
          'Passenger'
        ).trim()

        const custPhone = String(
          flowData.passenger_phone ||
          flowData.phone ||
          flowData.mobile ||
          flowData.contact ||
          phone.slice(-10)
        ).replace(/\D/g, '').slice(-10)

        const custEmail = String(
          flowData.passenger_email ||
          flowData.email ||
          ''
        ).trim() || null

        const rawRoute = String(
          flowData.route ||
          flowData.selected_route ||
          flowData.trip ||
          (flowData.from && flowData.to ? `${flowData.from}_to_${flowData.to}` : 'khargone_to_indore')
        ).toLowerCase()

        const isIndoreToKhargone = rawRoute.startsWith('indore') || rawRoute.includes('i2k') || rawRoute.includes('indore_to_khargone')

        // DB requires direction to be strictly 'KI' or 'IK'
        const direction = isIndoreToKhargone ? 'IK' : 'KI'

        // Route pricing (Maruti Cab dedicated Sedan AC)
        // Khargone ➔ Indore: ₹2,200 | Indore ➔ Khargone: ₹1,800
        const totalFare = isIndoreToKhargone ? 1800 : 2200
        const advanceAmount = 500
        const balanceAmount = Math.max(0, totalFare - advanceAmount)

        const routeLabel = isIndoreToKhargone ? 'Indore ➔ Khargone' : 'Khargone ➔ Indore'

        const travelDate = String(
          flowData.travel_date ||
          flowData.date ||
          flowData.trip_date ||
          new Date().toISOString().slice(0, 10)
        )

        const rawTime = String(
          flowData.pickup_time ||
          flowData.time ||
          flowData.departure_time ||
          '09:00 AM'
        )

        // Helper to format pickup_time for Postgres time column
        let dbPickupTime = '09:00:00'
        const matchTime = rawTime.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
        if (matchTime) {
          let hours = parseInt(matchTime[1], 10)
          const mins = matchTime[2]
          const ampm = (matchTime[3] || '').toUpperCase()
          if (ampm === 'PM' && hours < 12) hours += 12
          if (ampm === 'AM' && hours === 12) hours = 0
          dbPickupTime = `${String(hours).padStart(2, '0')}:${mins}:00`
        }

        const pickupAddress = String(
          flowData.pickup_address ||
          flowData.address ||
          flowData.pickup_location ||
          flowData.pickup ||
          ''
        ).trim()

        const bookingRef = `KC${Math.floor(10000 + Math.random() * 90000)}`
        const { randomBytes } = await import('node:crypto')
        const publicToken = randomBytes(32).toString('base64url')
        const idempotencyKey = randomBytes(16).toString('hex')

        const { data: newBooking, error: bookingErr } = await db.from('bookings').insert({
          booking_ref: bookingRef,
          status: 'pending_payment',
          direction,
          mode: 'match',
          vehicle: 'economy_sedan',
          vehicle_type: 'sedan',
          drop_point: 'rajendra',
          drop_name: 'City Point Drop',
          travel_date: travelDate,
          pickup_time: dbPickupTime,
          passenger_name: custName,
          phone: custPhone,
          email: custEmail,
          passenger_count: 1,
          address: pickupAddress || null,
          consent_whatsapp: true,
          consent_at: new Date().toISOString(),
          base_fare: totalFare,
          total_fare: totalFare,
          advance_amount: advanceAmount,
          balance_amount: balanceAmount,
          public_token: publicToken,
          idempotency_key: idempotencyKey,
          extras: { booked_via: 'whatsapp_flow', flow_response: flowData },
        }).select().single()

        if (bookingErr) {
          console.error('WhatsApp Flow booking insert error:', bookingErr)
        }

        if (newBooking) {
          const { sendInChatPaymentOrder, sendText } = await import('@/lib/whatsapp')

          // Attempt native in-chat UPI payment order
          try {
            await sendInChatPaymentOrder({
              to: phone,
              amountInRs: advanceAmount,
              bookingRef: newBooking.booking_ref,
              bookingId: newBooking.id,
              customerName: custName,
              routeName: routeLabel,
              travelDate,
              pickupTime: rawTime,
            })
          } catch (orderErr) {
            console.warn('In-chat payment order notice:', orderErr)
          }

          // Always send the confirmation text message with the direct payment link
          // This guarantees WhatsApp Web (desktop) & all mobile devices receive the instant 1-minute checkout link
          await sendText({
            to: phone,
            body: `🚕 *Maruti Cab Booking Received!*\n\nHey ${custName}! Aapki *${routeLabel}* cab booking request record ho gayi hai. 🙏\n\n🧾 *Booking Ref:* #${newBooking.booking_ref}\n📅 *Travel Date:* ${travelDate} at ${rawTime}\n🚘 *Vehicle:* Maruti Dzire / Dedicated AC Sedan (4 Seater)\n💰 *Total Fare:* ₹${totalFare.toLocaleString('en-IN')}\n💵 *Advance Amount:* ₹${advanceAmount} (Baaki ₹${balanceAmount.toLocaleString('en-IN')} driver ko cab me dena hai)\n\nNeeche diye link par click karke 1 minute me advance payment karein taaki aapki cab confirm ho jaye:\n👉 https://www.maruticab.in/pay?ref=${newBooking.booking_ref}\n\n🛡️ 100% Refund Guarantee agar match confirm nahi hota.\n📞 24x7 Helpline: +91 72823 16090`,
            bookingId: newBooking.id,
            eventVersion: `flow_confirm:${newBooking.booking_ref}`,
          })

          void notifyAdmin(
            `flow-booking:${newBooking.id}`,
            newBooking.id,
            `🚨 New WhatsApp Flow Booking #${newBooking.booking_ref}: ${custName} (${custPhone}) - ${routeLabel} on ${travelDate} at ${rawTime}. Fare: ₹${totalFare}, Advance ₹${advanceAmount} pending.`
          )
          return
        }
      }
    } catch (e) {
      console.error('WhatsApp flow response processing error:', e)
    }
  }

  // ── IN-CHAT WHATSAPP PAYMENT COMPLETED (Meta WhatsApp Pay with Razorpay) ──
  if (message.type === 'order' || message.order) {
    const orderRef = String(message.order?.reference_id || message.order?.order_id || '')
    const transId = String(message.order?.payment?.transaction_id || '')
    const amountVal = Number(message.order?.payment?.amount?.value || 50000) / 100

    let targetBooking = booking
    if ((!targetBooking || targetBooking.status !== 'pending_payment') && orderRef) {
      const refMatch = orderRef.match(/KC\d+/)
      if (refMatch) {
        const { data: b } = await db.from('bookings').select('*').eq('booking_ref', refMatch[0]).limit(1).single()
        if (b) targetBooking = b
      }
    }

    if (targetBooking) {
      const willConfirm = targetBooking.status === 'pending_payment' || targetBooking.status === 'draft' || (targetBooking.advance_paid || 0) < 500
      if (willConfirm) {
        await db.from('bookings').update({
          status: 'waiting',
          advance_paid: amountVal,
          advance_amount: amountVal,
          balance_amount: Math.max(0, (targetBooking.total_fare || 1800) - amountVal),
          updated_at: new Date().toISOString(),
          extras: {
            ...(targetBooking.extras || {}),
            paid_via: 'whatsapp_in_chat_pay',
            payment_id: transId || `wa_pay_${Date.now()}`,
            payment_status: 'paid',
            whatsapp_order: message.order,
          },
        }).eq('id', targetBooking.id)

        // Record in payments table
        await db.from('payments').insert({
          booking_id: targetBooking.id,
          provider: 'razorpay',
          provider_order_id: String(message.order?.order_id || `order_${targetBooking.booking_ref}`),
          provider_payment_id: transId || `wa_pay_${Date.now()}`,
          amount: amountVal,
          payment_status: 'captured',
          verified_at: new Date().toISOString(),
        })

        // Try automatic return match
        try {
          const { tryAutomaticFIFOMatch } = await import('@/lib/matching-engine')
          await tryAutomaticFIFOMatch(targetBooking.id)
        } catch (matchErr) {
          console.error('Match engine auto FIFO error on WA payment:', matchErr)
        }

        // Send payment received template
        try {
          const { sendWhatsAppTemplateMessage } = await import('@/lib/whatsapp-templates')
          await sendWhatsAppTemplateMessage({
            toPhone: phone,
            templateCode: 'payment_received',
            variables: [
              targetBooking.passenger_name || 'Passenger',
              String(amountVal),
              targetBooking.booking_ref,
              transId || 'WhatsApp UPI',
              targetBooking.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone',
              targetBooking.travel_date,
            ],
            bookingId: targetBooking.id,
          })
        } catch (tplErr) {
          console.error('Failed to send payment confirmation WA template:', tplErr)
        }

        // Alert Admin
        await notifyAdmin(
          `wa_payment_received:${targetBooking.id}`,
          targetBooking.id,
          `💰 Advance ₹${amountVal} received via WhatsApp In-Chat UPI for Booking #${targetBooking.booking_ref}! Passenger: ${targetBooking.passenger_name} (${targetBooking.phone}).`
        )
      }
      return
    }
  }

  if (normalizedText === 'STOP' || normalizedText === 'UNSUBSCRIBE') {
    await db.from('whatsapp_phone_preferences').upsert({ wa_id: phone, opt_out: true, opted_out_at: receivedAt, last_inbound_at: receivedAt, updated_at: new Date().toISOString() }, { onConflict: 'wa_id' })
    await db.from('bookings').update({ opt_out: true }).eq('phone', phone.slice(-10))
    await sendText({ to: phone, body: 'You have been opted out of non-essential MarutiCab WhatsApp messages. Reply START if you want booking updates again.', bookingId: booking?.id, eventVersion: `stop:${message.id}` }).catch(() => null)
    return
  }
  if (normalizedText === 'START') {
    await db.from('whatsapp_phone_preferences').upsert({ wa_id: phone, opt_out: false, last_inbound_at: receivedAt, updated_at: new Date().toISOString() }, { onConflict: 'wa_id' })
    await db.from('bookings').update({ opt_out: false }).eq('phone', phone.slice(-10))
    await sendText({ to: phone, body: 'MarutiCab booking updates are enabled again.', bookingId: booking?.id, eventVersion: `start:${message.id}` }).catch(() => null)
    return
  }

  if (action?.action === 'REFUND') {
    try {
      const result = await refundWhatsAppBooking(action.token)
      await sendText({ to: phone, body: result.complete ? 'Your Rs 500 refund has been processed. It should reach your original payment method in 5-7 working days.' : 'Your refund request is recorded and is being processed.', bookingId: booking?.id, eventVersion: `refund-reply:${message.id}` })
    } catch (error) { await sendText({ to: phone, body: error instanceof Error ? error.message : 'We could not process that refund request. Our team will help you shortly.', bookingId: booking?.id, eventVersion: `refund-error:${message.id}` }) }
    return
  }
  if (action?.action === 'UPGRADE') {
    try {
      const link = await createWhatsAppUpgradeLink(action.token)
      await sendText({ to: phone, body: link.url ? `Pay Rs ${link.amount} here to upgrade to a guaranteed private ride: ${link.url}. Your ride becomes guaranteed after payment is confirmed.` : 'Your guaranteed ride upgrade is confirmed. We will share driver details before pickup.', bookingId: booking?.id, eventVersion: `upgrade-link:${message.id}` })
    } catch (error) { await sendText({ to: phone, body: error instanceof Error ? error.message : 'We could not create the upgrade link right now. Our team will help you shortly.', bookingId: booking?.id, eventVersion: `upgrade-error:${message.id}` }) }
    return
  }

  const isCancelCommand =
    normalizedText === 'CANCEL' ||
    normalizedText === 'CANCEL RIDE' ||
    normalizedText.startsWith('CANCEL ') ||
    normalizedText === 'रद्द' ||
    normalizedText.includes('CANCEL')

  const isStatusCommand =
    normalizedText === 'STATUS' ||
    normalizedText === 'RIDE STATUS' ||
    normalizedText.startsWith('STATUS ') ||
    normalizedText === 'स्थिति'

  if (isCancelCommand) {
    // Look for active booking for this phone
    const { data: activeBookings } = await db
      .from('bookings')
      .select('*')
      .eq('phone', phone.slice(-10))
      .in('status', ['waiting', 'matched', 'confirmed', 'pending_payment'])
      .order('created_at', { ascending: false })
      .limit(1)

    const targetBooking = activeBookings?.[0]

    if (targetBooking) {
      if (targetBooking.status === 'confirmed' || targetBooking.status === 'matched') {
        const cannotCancelReply = [
          `⚠️ *Booking Already Confirmed & Scheduled*`,
          `Booking Ref: *${targetBooking.booking_ref}*`,
          `Route: ${targetBooking.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'}`,
          `Date: ${targetBooking.travel_date} at ${targetBooking.pickup_time}`,
          `\n🙏 Aapki booking already confirm ho chuki hai aur opposite passenger ke saath dedicated cab lock ho chuki hai. Policy ke mutabik confirmed booking cancel ya refund nahi ho sakti.`,
          `\nKisi bhi emergency ya support ke liye hamare operations team se direct baat karein:`,
          `📞 Call / WhatsApp: +91 72823 16090`,
        ].join('\n')

        await sendText({
          to: phone,
          body: cannotCancelReply,
          bookingId: targetBooking.id,
          eventVersion: `cannot_cancel_confirmed:${message.id}`,
        })

        await notifyAdmin(
          `cancel_attempt_confirmed:${targetBooking.id}`,
          targetBooking.id,
          `⚠️ Customer attempted to cancel CONFIRMED booking ${targetBooking.booking_ref} via WhatsApp bot. Alerted that cancellation is disallowed.`
        )
        return
      }

      const willRefund = (targetBooking.advance_paid || 0) > 0
      await db
        .from('bookings')
        .update({
          status: 'cancelled',
          refund_status: willRefund ? 'pending' : 'not_applicable',
          updated_at: new Date().toISOString(),
          extras: {
            ...(targetBooking.extras || {}),
            cancelled_via: 'whatsapp_bot',
            cancelled_at: receivedAt,
          },
        })
        .eq('id', targetBooking.id)

      const cancelReply = [
        `✅ *Ride Cancelled Successfully*`,
        `Booking Ref: *${targetBooking.booking_ref}*`,
        `Route: ${targetBooking.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'}`,
        `Date: ${targetBooking.travel_date}`,
        willRefund
          ? `\n💰 *Advance Refund:* ₹${targetBooking.advance_paid} has been queued for refund to your payment source (5-7 business days).`
          : '',
        `\nThank you for notifying us. Need a ride later? Visit: https://maruticab.in or call +91 72823 16090.`,
      ]
        .filter(Boolean)
        .join('\n')

      await sendText({
        to: phone,
        body: cancelReply,
        bookingId: targetBooking.id,
        eventVersion: `cancelled:${message.id}`,
      })

      await notifyAdmin(
        `cancel_whatsapp:${targetBooking.id}`,
        targetBooking.id,
        `Customer cancelled booking ${targetBooking.booking_ref} via WhatsApp.${willRefund ? ` Refund of ₹${targetBooking.advance_paid} pending.` : ''}`
      )
    } else {
      await sendText({
        to: phone,
        body: `No active MarutiCab booking found to cancel for your number. If you need any assistance, please call +91 72823 16090 or visit https://maruticab.in.`,
        eventVersion: `cancel_none:${message.id}`,
      })
    }
  } else if (isStatusCommand && booking) {
    const routeName = booking.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'
    const statusBody = [
      `🚗 *MarutiCab Booking Status*`,
      `Ref: *${booking.booking_ref}*`,
      `Status: *${(booking.status || 'Active').toUpperCase()}*`,
      `Route: ${routeName}`,
      `Date & Time: ${booking.travel_date} at ${booking.pickup_time}`,
      booking.driver_name ? `Driver: ${booking.driver_name}` : 'Driver assignment: Under dispatch',
      booking.advance_paid ? `Advance Paid: ₹${booking.advance_paid} (Balance: ₹${booking.balance_amount || 0} in cab)` : 'Payment: Cash/UPI in cab',
      statusUrl ? `\nLive details: ${statusUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    await sendText({
      to: phone,
      body: statusBody,
      bookingId: booking.id,
      eventVersion: `status:${message.id}`,
    })
  } else {
    // Route into full WhatsApp conversational booking journey
    try {
      const { processWhatsAppInbound } = await import('@/lib/whatsapp-conversation')
      const reply = await processWhatsAppInbound(phone, message.text)
      if (reply) {
        await sendText({
          to: phone,
          body: reply,
          bookingId: booking?.id,
          eventVersion: `conv:${message.id}`,
        })
      }
    } catch (convErr) {
      console.error('Conversation processing error:', convErr)
      await sendText({
        to: phone,
        body: `Dhanyavad! MarutiCab dispatch team will assist you shortly. Call +91 72823 16090 for urgent booking.`,
        bookingId: booking?.id,
        eventVersion: `fallback:${message.id}`,
      })
    }
  }
}

export async function POST(request: NextRequest) {
  const raw = await request.text()
  if (!verifyWhatsAppWebhookSignature(raw, request.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 })
  }
  let body: any
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }) }
  if (body.object !== 'whatsapp_business_account') return NextResponse.json({ received: true })

  // Acknowledge quickly, then process within Next's request lifetime.
  const db = createServiceClient()
  const messages = body?.entry?.flatMap((entry: any) => entry?.changes ?? []).flatMap((change: any) => change?.value?.messages ?? []) ?? []
  const statuses = extractWhatsAppStatuses(body)
  const work = async () => {
    for (const status of statuses) await handleStatus(status)
    for (const message of messages) {
      if (!message?.id) continue
      const { error } = await db.from('whatsapp_webhook_events').insert({ wa_message_id: String(message.id), event_type: `inbound:${message.type || 'unknown'}` })
      if (!error || error.code !== '23505') {
        await handleInbound({ entry: [{ changes: [{ value: { messages: [message] } }] }] })
      }
    }
    for (const status of statuses) {
      if (!status?.id) continue
      const key = `${status.id}:${status.status}:${status.timestamp || ''}`
      await db.from('whatsapp_webhook_events').upsert({ wa_message_id: key, event_type: `status:${status.status}`, processed_at: new Date().toISOString() }, { onConflict: 'wa_message_id' })
    }
  }

  try {
    await work()
  } catch (error) {
    console.error('WhatsApp webhook event processing failed:', error instanceof Error ? error.message : 'unknown error')
  }

  return NextResponse.json({ received: true })
}
