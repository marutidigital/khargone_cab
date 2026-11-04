import { createHmac } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase-server'
import { normalizeWhatsAppPhone, sendTemplate } from '@/lib/whatsapp'
import { getTemplateName, mapTemplateVariables, type BuiltInTemplate, type WhatsAppEvent, WHATSAPP_TEMPLATES } from '@/lib/whatsapp-templates'
import { getWhatsAppAutomationConfig, getWhatsAppReadiness } from '@/lib/whatsapp-automation'

const APP_URL = () => process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://maruticab.in'

function shouldSendOutsideOptIn(template: BuiltInTemplate) {
  return template === 'match_confirmed_customer' || template === 'no_match_options' || template === 'ride_reminder_customer' || template === 'refund_processed'
}

async function postN8n(event: WhatsAppEvent | string, booking: Record<string, any>) {
  const hook = process.env.N8N_WEBHOOK_URL
  if (!hook) return
  const payload = JSON.stringify({ event, booking_id: booking.id, booking_ref: booking.booking_ref, mode: booking.mode, status: booking.status, direction: booking.direction, travel_date: booking.travel_date, pickup_time: booking.pickup_time, created_at: new Date().toISOString() })
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (process.env.N8N_WEBHOOK_SECRET) headers['X-MarutiCab-Signature'] = `sha256=${createHmac('sha256', process.env.N8N_WEBHOOK_SECRET).update(payload).digest('hex')}`
  try {
    const url = new URL(hook)
    if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') return
    await fetch(url, { method: 'POST', headers, body: payload, signal: AbortSignal.timeout(5000) })
  } catch (error) { console.error('n8n booking event failed:', error instanceof Error ? error.message : 'network error') }
}

async function deliver(event: WhatsAppEvent, booking: Record<string, any>, recipientType: 'customer' | 'driver' | 'admin' = 'customer', options: { resend?: boolean; eventVersion?: string; driver?: Record<string, any> | null } = {}) {
  const db = createServiceClient()
  const templateName = getTemplateName(event, booking.mode, recipientType)
  const template = WHATSAPP_TEMPLATES[templateName]
  const recipient = recipientType === 'driver' ? options.driver?.phone || booking.driver_phone : recipientType === 'admin' ? (process.env.ADMIN_WHATSAPP_NUMBER || '918878933778') : booking.phone
  const eventVersion = options.eventVersion || (event === 'match_confirmed' ? `driver:${booking.driver_id || options.driver?.id || 'unassigned'}` : 'v1')
  const idempotencyKey = `${booking.id}:${recipientType}:${templateName}:${eventVersion}`
  if (!recipient) {
    await db.from('notifications').insert({ booking_id: booking.id, recipient_type: recipientType, template: templateName, status: 'skipped', error: 'Recipient number is not configured.', event_version: eventVersion, idempotency_key: idempotencyKey })
    return { status: 'skipped', reason: 'Recipient number is not configured.' }
  }

  let phone: string
  try { phone = normalizeWhatsAppPhone(String(recipient)) }
  catch (error) {
    await db.from('notifications').insert({ booking_id: booking.id, recipient_type: recipientType, template: templateName, status: 'failed', error: 'Invalid recipient number.', event_version: eventVersion, idempotency_key: idempotencyKey })
    return { status: 'failed', reason: error instanceof Error ? error.message : 'Invalid recipient number.' }
  }

  const { error: reservationError } = await db.from('notifications').insert({ booking_id: booking.id, recipient_type: recipientType, template: templateName, status: 'queued', event_version: eventVersion, idempotency_key: idempotencyKey })
  if (reservationError) {
    const { data: prior } = await db.from('notifications').select('status').eq('idempotency_key', idempotencyKey).limit(1).single()
    if (prior?.status !== 'failed') return { status: 'duplicate', reason: 'This event was already queued.' }
    const { data: retried } = await db.from('notifications').update({ status: 'queued', error: null }).eq('idempotency_key', idempotencyKey).eq('status', 'failed').select('id')
    if (!retried?.length) return { status: 'duplicate', reason: 'Another retry is already processing this event.' }
  }

  if (recipientType === 'customer') {
    if (booking.consent_whatsapp !== true && !shouldSendOutsideOptIn(templateName)) {
      await db.from('notifications').update({ status: 'skipped', error: 'Customer has not opted in to WhatsApp updates.' }).eq('idempotency_key', idempotencyKey)
      return { status: 'skipped', reason: 'Customer has not opted in to WhatsApp updates.' }
    }
    const { data: pref } = await db.from('whatsapp_phone_preferences').select('opt_out').eq('wa_id', phone).limit(1).single()
    if (pref?.opt_out && !shouldSendOutsideOptIn(templateName)) {
      await db.from('notifications').update({ status: 'skipped', error: 'Customer opted out of non-essential WhatsApp messages.' }).eq('idempotency_key', idempotencyKey)
      return { status: 'skipped', reason: 'Customer opted out of non-essential WhatsApp messages.' }
    }
  }

  const readiness = getWhatsAppReadiness()
  if (!readiness.canSend || (!readiness.automationEnvEnabled && process.env.WHATSAPP_MOCK !== 'true')) {
    const reason = !readiness.canSend ? 'Meta account credentials, verification, or quality status are not ready.' : 'WhatsApp automation is disabled by the server setting.'
    await db.from('notifications').update({ status: 'skipped', error: reason }).eq('idempotency_key', idempotencyKey)
    return { status: 'skipped', reason }
  }
  if (process.env.WHATSAPP_MOCK !== 'true') {
    const config = await getWhatsAppAutomationConfig()
    const isApproved = config.templates.some((item) => item.metaName === templateName && item.approved && item.enabled)
    if (!config.enabled || !isApproved) {
      const reason = !config.enabled ? 'WhatsApp automation is switched off in admin.' : 'This Meta template is not marked enabled and approved in admin.'
      await db.from('notifications').update({ status: 'skipped', error: reason }).eq('idempotency_key', idempotencyKey)
      return { status: 'skipped', reason }
    }
  }

  const driver = options.driver || null
  const variables = mapTemplateVariables(templateName, booking, driver)
  const statusToken = String(booking.public_token || '')
  const quickReplyPayloads = templateName === 'no_match_options' && statusToken
    ? [`REFUND:${statusToken}`, `UPGRADE:${statusToken}`]
    : undefined
  try {
    const response = await sendTemplate({
      to: phone,
      template: templateName,
      language: template.language,
      variables,
      ...(templateName === 'booking_received_match' || templateName === 'booking_received_guaranteed' || templateName === 'match_confirmed_customer'
        ? { buttonUrlSuffix: statusToken }
        : {}),
      quickReplyPayloads,
    }) as { messages?: { id?: string }[] }
    const messageId = response.messages?.[0]?.id || null
    await db.from('notifications').update({ status: 'sent', wa_message_id: messageId, provider_message_id: messageId, sent_at: new Date().toISOString(), error: null }).eq('idempotency_key', idempotencyKey)
    return { status: 'sent', messageId }
  } catch (error) {
    const text = error instanceof Error ? error.message.slice(0, 500) : 'WhatsApp send failed.'
    await db.from('notifications').update({ status: 'failed', error: text }).eq('idempotency_key', idempotencyKey)
    if (recipientType !== 'admin' && process.env.ADMIN_WHATSAPP_NUMBER && event !== 'admin_alert') {
      void deliver('admin_alert', { ...booking, alert_event: `WhatsApp send failed: ${templateName}` }, 'admin', { eventVersion: `${eventVersion}:failure` })
    }
    return { status: 'failed', reason: text }
  }
}

/** Single event entry point used by payment, dispatch and cron handlers. */
export async function notify(event: WhatsAppEvent, bookingId: string, options: { resend?: boolean; eventVersion?: string } = {}) {
  const db = createServiceClient()
  const { data: booking, error } = await db.from('bookings').select('*').eq('id', bookingId).limit(1).single()
  if (error || !booking) throw new Error('Booking not found for WhatsApp event.')
  const { data: driver } = booking.driver_id
    ? await db.from('drivers').select('id,name,phone,vehicle_number').eq('id', booking.driver_id).limit(1).single()
    : { data: null }
  const enriched = { ...booking, status_link: booking.public_token ? `${APP_URL()}/booking/${booking.public_token}` : '' }
  const customerResult = await deliver(event, enriched, 'customer', { ...options, driver })
  if (event === 'match_confirmed' || event === 'ride_reminder') {
    if (driver?.phone) await deliver(event, enriched, 'driver', { ...options, driver })
  }
  await postN8n(event, enriched)
  return customerResult
}

/** Send to an admin-configured number for operational alerts. */
export async function notifyAdmin(event: string, bookingId: string, alertText: string) {
  const db = createServiceClient()
  const { data: booking } = await db.from('bookings').select('*').eq('id', bookingId).limit(1).single()
  if (booking) return deliver('admin_alert', { ...booking, alert_event: alertText }, 'admin', { eventVersion: event })
  const recipient = process.env.ADMIN_WHATSAPP_NUMBER || '918878933778'
  if (!recipient) return { status: 'skipped', reason: 'Admin number is not configured.' }
  const idempotencyKey = `admin:${event}`
  const { error } = await db.from('notifications').insert({ booking_id: null, recipient_type: 'admin', template: 'admin_alert', status: 'queued', idempotency_key: idempotencyKey, event_version: event })
  if (error) return { status: 'duplicate' }
  const readiness = getWhatsAppReadiness()
  if (!readiness.canSend || (!readiness.automationEnvEnabled && process.env.WHATSAPP_MOCK !== 'true')) {
    await db.from('notifications').update({ status: 'skipped', error: 'Meta account is not ready or WhatsApp automation is disabled.' }).eq('idempotency_key', idempotencyKey)
    return { status: 'skipped' }
  }
  if (process.env.WHATSAPP_MOCK !== 'true') {
    const config = await getWhatsAppAutomationConfig()
    if (!config.enabled || !config.templates.some((item) => item.metaName === 'admin_alert' && item.approved && item.enabled)) {
      await db.from('notifications').update({ status: 'skipped', error: 'Admin alert template is not enabled and approved.' }).eq('idempotency_key', idempotencyKey)
      return { status: 'skipped' }
    }
  }
  try {
    const response = await sendTemplate({ to: recipient, template: 'admin_alert', language: 'en', variables: [alertText.slice(0, 500), '—', '—', '—', '—'] }) as { messages?: { id?: string }[] }
    await db.from('notifications').update({ status: 'sent', wa_message_id: response.messages?.[0]?.id || null, sent_at: new Date().toISOString() }).eq('idempotency_key', idempotencyKey)
    return { status: 'sent' }
  } catch (error) {
    await db.from('notifications').update({ status: 'failed', error: error instanceof Error ? error.message.slice(0, 500) : 'Admin alert failed.' }).eq('idempotency_key', idempotencyKey)
    return { status: 'failed' }
  }
}

// Compatibility bridge for earlier admin actions; all templates now use the same durable sender.
export async function notifyBooking(booking: Record<string, any>, trigger: string) {
  const eventMap: Record<string, WhatsAppEvent> = {
    booking_received: 'payment_captured', booking_waiting: 'payment_captured', booking_confirmed: 'match_confirmed',
    match_confirmed: 'match_confirmed', no_match: 'no_match', refund_processed: 'refund_processed',
    ride_reminder: 'ride_reminder', feedback_request: 'feedback_request',
  }
  const event = eventMap[trigger]
  if (!event || !booking.id) return { status: 'skipped' }
  return notify(event, String(booking.id))
}
