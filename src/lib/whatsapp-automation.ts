import { createServiceClient } from '@/lib/supabase-server'
import { sendTemplateMessage } from '@/lib/whatsapp'

export type WhatsAppTrigger =
  | 'booking_received'
  | 'booking_waiting'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'match_confirmed'
  | 'no_match'
  | 'refund_processed'
  | 'ride_reminder'
  | 'feedback_request'

export interface WhatsAppTemplate {
  id: string
  label: string
  metaName: string
  language: string
  trigger: WhatsAppTrigger
  body: string
  parameterFields: string[]
  approved: boolean
  enabled: boolean
}

export interface WhatsAppAutomationConfig {
  enabled: boolean
  templates: WhatsAppTemplate[]
}

const CONFIG_KEY = 'whatsapp_automation'

export function getWhatsAppReadiness() {
  const qualityRating = (process.env.WHATSAPP_QUALITY_RATING || 'RED').toUpperCase()
  const verificationStatus = (process.env.WHATSAPP_CODE_VERIFICATION_STATUS || 'EXPIRED').toUpperCase()
  const hasCredentials = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && (process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN))
  const mockEnabled = process.env.WHATSAPP_MOCK === 'true'
  const verified = verificationStatus === 'VERIFIED'
  const qualityOkay = qualityRating === 'GREEN' || qualityRating === 'YELLOW'

  return {
    qualityRating,
    verificationStatus,
    hasCredentials,
    mockEnabled,
    canSend: mockEnabled || (hasCredentials && verified && qualityOkay),
    automationEnvEnabled: process.env.WHATSAPP_AUTOMATION_ENABLED === 'true',
  }
}

export async function getWhatsAppAutomationConfig(): Promise<WhatsAppAutomationConfig> {
  const { data, error } = await createServiceClient()
    .from('app_config')
    .select('value')
    .eq('key', CONFIG_KEY)
    .limit(1)

  if (error) throw error
  const value = data?.[0]?.value
  if (!value || typeof value !== 'object') return { enabled: false, templates: [] }

  return {
    enabled: value.enabled === true,
    templates: Array.isArray(value.templates) ? value.templates : [],
  }
}

export async function saveWhatsAppAutomationConfig(config: WhatsAppAutomationConfig) {
  const { error } = await createServiceClient()
    .from('app_config')
    .upsert({ key: CONFIG_KEY, value: config }, { onConflict: 'key' })

  if (error) throw error
}

export function getTemplateFieldValue(field: string, booking: Record<string, unknown>): string {
  const direction = booking.direction === 'KI' ? 'Khargone to Indore' : 'Indore to Khargone'
  const values: Record<string, unknown> = {
    passenger_name: booking.passenger_name,
    booking_ref: booking.booking_ref,
    route: direction,
    drop_name: booking.drop_name,
    travel_date: booking.travel_date,
    pickup_time: booking.pickup_time,
    total_fare: booking.total_fare == null ? '' : `Rs ${Number(booking.total_fare).toLocaleString('en-IN')}`,
    vehicle: booking.vehicle_type,
    status: booking.status,
    status_link: booking.status_link,
    advance_amount: booking.advance_amount == null ? '' : `Rs ${Number(booking.advance_amount).toLocaleString('en-IN')}`,
    balance_amount: booking.balance_amount == null ? '' : `Rs ${Number(booking.balance_amount).toLocaleString('en-IN')}`,
    driver_name: booking.driver_name,
    driver_phone: booking.driver_phone,
    vehicle_number: booking.vehicle_number,
    pickup_address: booking.address || booking.drop_name,
    booking_message: booking.mode === 'match'
      ? booking.status === 'matched' || booking.status === 'confirmed'
        ? 'We found a compatible Match Deal. Our team is confirming your driver.'
        : 'We are looking for your opposite-direction Match Deal'
      : 'Your guaranteed ride is reserved',
  }
  const value = values[field]
  return value == null ? '' : String(value)
}

export async function sendBookingAutomation(trigger: WhatsAppTrigger, booking: Record<string, unknown>) {
  const config = await getWhatsAppAutomationConfig()
  const readiness = getWhatsAppReadiness()
  const template = config.templates.find((item) =>
    item.trigger === trigger && item.enabled && item.approved
  )

  if (!config.enabled || !readiness.automationEnvEnabled || !readiness.canSend || !template) {
    return false
  }

  const digits = String(booking.phone || '').replace(/\D/g, '')
  const phone = digits.length === 10 ? `91${digits}` : digits
  if (!/^91[6-9]\d{9}$/.test(phone)) return false

  const db = createServiceClient()
  const idempotencyKey = `${String(booking.id || 'legacy')}:customer:${template.metaName}:${trigger}:v1`
  const { error: reservationError } = await db.from('notifications').insert({
    booking_id: typeof booking.id === 'string' ? booking.id : null,
    recipient_type: 'customer', template: template.metaName, status: 'queued',
    idempotency_key: idempotencyKey, event_version: `${trigger}:v1`,
  })
  if (reservationError) return false

  const parameters = template.parameterFields.map((field) => getTemplateFieldValue(field, booking))
  try {
    const result = await sendTemplateMessage({ to: phone, template, parameters }) as { messages?: { id?: string }[] }
    const messageId = result.messages?.[0]?.id || null
    await db.from('notifications').update({ status: 'sent', wa_message_id: messageId, provider_message_id: messageId, sent_at: new Date().toISOString() }).eq('idempotency_key', idempotencyKey)
    return true
  } catch (error) {
    await db.from('notifications').update({ status: 'failed', error: error instanceof Error ? error.message.slice(0, 500) : 'WhatsApp send failed.' }).eq('idempotency_key', idempotencyKey)
    return false
  }
}
