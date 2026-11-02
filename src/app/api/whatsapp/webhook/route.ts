import { after, NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { extractWhatsAppStatuses, formatIncomingMessage, normalizeWhatsAppPhone, parseWhatsAppActionPayload, sendText, verifyWhatsAppWebhookSignature } from '@/lib/whatsapp'
import { notifyAdmin, notify } from '@/lib/booking-notifications'
import { createWhatsAppUpgradeLink, refundWhatsAppBooking } from '@/lib/whatsapp-booking-actions'
import { recordCapturedUpgrade } from '@/lib/payment-state'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const configuredToken = process.env.WHATSAPP_VERIFY_TOKEN
  if (configuredToken && params.get('hub.mode') === 'subscribe' && params.get('hub.verify_token') === configuredToken) {
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
  if (insertError) return // Meta can redeliver the same message.
  await db.from('whatsapp_phone_preferences').upsert({ wa_id: phone, last_inbound_at: receivedAt, updated_at: new Date().toISOString() }, { onConflict: 'wa_id' })
  if (booking) await db.from('bookings').update({ last_inbound_at: receivedAt }).eq('phone', phone.slice(-10))

  const normalizedText = message.text.trim().toUpperCase()
  const action = parseWhatsAppActionPayload(message.text)
  const statusUrl = booking?.public_token ? `${process.env.APP_BASE_URL || 'https://maruticab.in'}/booking/${booking.public_token}` : null

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

  if (normalizedText === 'STATUS' && statusUrl) {
    await sendText({ to: phone, body: `Your MarutiCab booking status: ${statusUrl}`, bookingId: booking?.id, eventVersion: `status:${message.id}` })
  } else if (normalizedText === 'CANCEL' && statusUrl) {
    await sendText({ to: phone, body: `To request a cancellation, reply with your booking reference or contact MarutiCab support. Your booking status is here: ${statusUrl}`, bookingId: booking?.id, eventVersion: `cancel:${message.id}` })
  } else {
    await notifyAdmin(`inbound:${message.id}`, booking?.id || '', `New WhatsApp message from ${phone.slice(0, 4)}••••${phone.slice(-2)}${booking ? ` for ${booking.booking_ref}` : ''}`)
    const { data: pref } = await db.from('whatsapp_phone_preferences').select('last_auto_reply_at').eq('wa_id', phone).limit(1).single()
    if (!pref?.last_auto_reply_at) {
      await sendText({ to: phone, body: `Dhanyavad! Hamari team jaldi reply karegi.${statusUrl ? ` Booking status: ${statusUrl}` : ''}`, bookingId: booking?.id, eventVersion: `auto-reply:${message.id}` }).catch(() => null)
      await db.from('whatsapp_phone_preferences').update({ last_auto_reply_at: receivedAt, updated_at: new Date().toISOString() }).eq('wa_id', phone)
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
      if (!error) await handleInbound({ entry: [{ changes: [{ value: { messages: [message] } }] }] })
    }
    for (const status of statuses) {
      if (!status?.id) continue
      const key = `${status.id}:${status.status}:${status.timestamp || ''}`
      await db.from('whatsapp_webhook_events').upsert({ wa_message_id: key, event_type: `status:${status.status}`, processed_at: new Date().toISOString() }, { onConflict: 'wa_message_id' })
    }
  }
  after(async () => {
    await work().catch((error) => { console.error('WhatsApp webhook event processing failed:', error instanceof Error ? error.message : 'unknown error') })
  })
  return NextResponse.json({ received: true })
}
