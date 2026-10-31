import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase-server'

export type WhatsAppComponentParameter = {
  type: 'text' | 'payload'
  text?: string
  payload?: string
}

export function normalizeWhatsAppPhone(value: string): string {
  const raw = value.trim()
  const digits = raw.replace(/\D/g, '')
  const normalized = digits.length === 10 ? `91${digits}` : digits.startsWith('00') ? digits.slice(2) : digits
  if (!/^91[6-9]\d{9}$/.test(normalized)) throw new Error('Invalid WhatsApp phone number.')
  return normalized
}

function getConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN
  const version = process.env.WHATSAPP_API_VERSION || process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0'
  if (!phoneNumberId || !token) throw new Error('WhatsApp Cloud API credentials are not configured.')
  return { token, url: `https://graph.facebook.com/${version}/${phoneNumberId}/messages` }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function postToMeta(body: Record<string, unknown>) {
  if (process.env.WHATSAPP_MOCK === 'true') {
    const template = (body.template as { name?: string } | undefined)?.name
    const type = String(body.type || 'message')
    const recipient = String(body.to || '')
    console.info('[WhatsApp mock] outbound', { type, template, recipient: recipient ? `…${recipient.slice(-4)}` : 'unknown' })
    return { messages: [{ id: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 9)}` }], mock: true }
  }
  const { token, url } = getConfig()
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      })
    } catch (error) {
      if (attempt === 2) throw error
      await sleep(250 * 2 ** attempt)
      continue
    }
    const json = await response.json().catch(() => ({})) as { messages?: { id?: string }[]; error?: { message?: string; code?: number } }
    if (response.ok) return json
    if (response.status === 429 || response.status >= 500) {
      if (attempt < 2) {
        const retryAfter = Number(response.headers.get('retry-after'))
        await sleep(retryAfter > 0 ? Math.min(retryAfter * 1000, 5000) : 250 * 2 ** attempt)
        continue
      }
    }
    const error = new Error(`WhatsApp API error (${response.status}, code ${json.error?.code ?? 'unknown'}).`)
    Object.assign(error, { status: response.status, code: json.error?.code })
    throw error
  }
  throw new Error('WhatsApp send failed after retries.')
}

export async function sendTemplate({
  to, template, language = 'en', variables = [], buttonUrlSuffix, quickReplyPayloads,
}: {
  to: string
  template: string
  language?: string
  variables?: string[]
  buttonUrlSuffix?: string
  quickReplyPayloads?: string[]
}) {
  const components: Record<string, unknown>[] = []
  if (variables.length) components.push({ type: 'body', parameters: variables.map((text) => ({ type: 'text', text })) })
  if (buttonUrlSuffix) components.push({ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: buttonUrlSuffix }] })
  quickReplyPayloads?.forEach((payload, index) => components.push({ type: 'button', sub_type: 'quick_reply', index: String(index), parameters: [{ type: 'payload', payload }] }))
  return postToMeta({
    messaging_product: 'whatsapp', to: normalizeWhatsAppPhone(to), type: 'template',
    template: { name: template, language: { code: language }, ...(components.length ? { components } : {}) },
  })
}

export async function sendInteractiveButtons({ to, body, buttons, bookingId, eventVersion }: {
  to: string
  body: string
  buttons: { id: string; title: string }[]
  bookingId?: string | null
  eventVersion?: string
}) {
  const phone = normalizeWhatsAppPhone(to)
  return sendLoggedFreeform({ phone, message: { type: 'interactive', interactive: {
    type: 'button', body: { text: body }, action: { buttons: buttons.slice(0, 3).map(({ id, title }) => ({ type: 'reply', reply: { id, title } })) },
  } }, bookingId, eventVersion })
}

export async function sendText({ to, body, bookingId, eventVersion }: { to: string; body: string; bookingId?: string | null; eventVersion?: string }) {
  const phone = normalizeWhatsAppPhone(to)
  return sendLoggedFreeform({ phone, message: { type: 'text', text: { body } }, bookingId, eventVersion })
}

async function sendLoggedFreeform({ phone, message, bookingId, eventVersion }: {
  phone: string
  message: Record<string, unknown>
  bookingId?: string | null
  eventVersion?: string
}) {
  const db = createServiceClient()
  const version = eventVersion || randomUUID()
  const idempotencyKey = `freeform:${bookingId || phone}:${version}`
  const { error } = await db.from('notifications').insert({ booking_id: bookingId || null, recipient_type: 'customer', template: 'free_text_reply', status: 'queued', idempotency_key: idempotencyKey, event_version: version })
  if (error) return { skipped: true, reason: 'This reply was already logged or notification storage is unavailable.' }
  if (!await isCustomerServiceWindowOpen(phone)) {
    console.warn(`WhatsApp free-text skipped outside service window for …${phone.slice(-4)}.`)
    await db.from('notifications').update({ status: 'skipped', error: 'No open 24-hour customer-service window.' }).eq('idempotency_key', idempotencyKey)
    return { skipped: true, reason: 'No open 24-hour customer-service window.' }
  }
  try {
    const response = await postToMeta({ messaging_product: 'whatsapp', to: phone, ...message }) as { messages?: { id?: string }[] }
    const messageId = response.messages?.[0]?.id || null
    await db.from('notifications').update({ status: 'sent', wa_message_id: messageId, provider_message_id: messageId, sent_at: new Date().toISOString() }).eq('idempotency_key', idempotencyKey)
    return response
  } catch (error) {
    await db.from('notifications').update({ status: 'failed', error: error instanceof Error ? error.message.slice(0, 500) : 'WhatsApp free-text failed.' }).eq('idempotency_key', idempotencyKey)
    throw error
  }
}

export async function isCustomerServiceWindowOpen(phoneInput: string, now = new Date()) {
  const phone = normalizeWhatsAppPhone(phoneInput)
  const { data } = await createServiceClient().from('whatsapp_phone_preferences').select('last_inbound_at').eq('wa_id', phone).limit(1).single()
  return isWithinWhatsAppServiceWindow(data?.last_inbound_at, now)
}

export function isWithinWhatsAppServiceWindow(lastInboundAt: string | null | undefined, now = new Date()) {
  const timestamp = lastInboundAt ? new Date(lastInboundAt).getTime() : 0
  return Number.isFinite(timestamp) && timestamp > 0 && now.getTime() - timestamp >= 0 && now.getTime() - timestamp < 24 * 60 * 60 * 1000
}

// Backwards-compatible aliases used by the original admin tools.
export async function sendTextMessage({ to, text }: { to: string; text: string }) {
  return sendText({ to, body: text })
}
export async function sendTemplateMessage({ to, template, parameters }: {
  to: string
  template: { metaName: string; language: string }
  parameters: string[]
}) {
  return sendTemplate({ to, template: template.metaName, language: template.language, variables: parameters })
}

export function verifyWhatsAppWebhookSignature(rawBody: string, signature: string | null, secret = process.env.WHATSAPP_APP_SECRET) {
  if (!secret || !signature?.startsWith('sha256=')) return false
  const expected = Buffer.from(`sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`)
  const actual = Buffer.from(signature)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function parseWhatsAppActionPayload(value: string): { action: 'REFUND' | 'UPGRADE'; token: string } | null {
  const match = /^(REFUND|UPGRADE):([A-Za-z0-9_-]{20,128})$/.exec(value.trim())
  return match ? { action: match[1] as 'REFUND' | 'UPGRADE', token: match[2] } : null
}

export function formatIncomingMessage(body: any): { id: string; phone: string; text: string; timestamp: string; type: string } | null {
  const message = body?.entry?.flatMap((entry: any) => entry?.changes ?? [])
    .flatMap((change: any) => change?.value?.messages ?? [])[0]
  if (!message?.id || !message?.from) return null
  const text = message.text?.body
    ?? message.button?.text
    ?? message.interactive?.button_reply?.title
    ?? message.interactive?.list_reply?.title
    ?? ''
  const payload = message.button?.payload ?? message.interactive?.button_reply?.id ?? message.interactive?.list_reply?.id
  return { id: String(message.id), phone: String(message.from), text: String(payload || text), timestamp: String(message.timestamp || ''), type: String(message.type || 'unknown') }
}

export function extractWhatsAppStatuses(body: any) {
  return (body?.entry ?? []).flatMap((entry: any) => entry?.changes ?? [])
    .flatMap((change: any) => change?.value?.statuses ?? [])
}
