import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-auth'
import {
  getWhatsAppAutomationConfig,
  getWhatsAppReadiness,
  saveWhatsAppAutomationConfig,
  type WhatsAppAutomationConfig,
  type WhatsAppTemplate,
} from '@/lib/whatsapp-automation'

const ALLOWED_TRIGGERS = new Set([
  'booking_received',
  'booking_waiting',
  'booking_confirmed',
  'booking_cancelled',
  'match_confirmed',
  'no_match',
  'refund_processed',
  'ride_reminder',
  'feedback_request',
])
const ALLOWED_FIELDS = new Set([
  'passenger_name',
  'booking_ref',
  'route',
  'drop_name',
  'travel_date',
  'pickup_time',
  'total_fare',
  'vehicle',
  'status',
])

function validateConfig(input: unknown): WhatsAppAutomationConfig | null {
  if (!input || typeof input !== 'object') return null
  const value = input as Partial<WhatsAppAutomationConfig>
  if (typeof value.enabled !== 'boolean' || !Array.isArray(value.templates) || value.templates.length > 50) return null

  const templates: WhatsAppTemplate[] = []
  for (const raw of value.templates) {
    if (!raw || typeof raw !== 'object') return null
    const item = raw as Partial<WhatsAppTemplate>
    if (
      typeof item.id !== 'string' || item.id.length > 100 ||
      typeof item.label !== 'string' || item.label.trim().length < 2 || item.label.length > 100 ||
      typeof item.metaName !== 'string' || !/^[a-z0-9_]{1,128}$/.test(item.metaName) ||
      typeof item.language !== 'string' || !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(item.language) ||
      typeof item.body !== 'string' || item.body.trim().length < 2 || item.body.length > 1024 ||
      typeof item.trigger !== 'string' || !ALLOWED_TRIGGERS.has(item.trigger) ||
      !Array.isArray(item.parameterFields) || item.parameterFields.length > 20 ||
      !item.parameterFields.every((field) => typeof field === 'string' && ALLOWED_FIELDS.has(field)) ||
      typeof item.approved !== 'boolean' || typeof item.enabled !== 'boolean'
    ) return null

    templates.push({
      id: item.id,
      label: item.label.trim(),
      metaName: item.metaName,
      language: item.language,
      body: item.body.trim(),
      trigger: item.trigger as WhatsAppTemplate['trigger'],
      parameterFields: item.parameterFields as string[],
      approved: item.approved,
      enabled: item.enabled,
    })
  }

  return { enabled: value.enabled, templates }
}

export async function GET(req: NextRequest) {
  const auth = await authorizeAdminRequest(req)
  if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status })

  try {
    const [config, readiness] = await Promise.all([
      getWhatsAppAutomationConfig(),
      Promise.resolve(getWhatsAppReadiness()),
    ])
    return NextResponse.json({ config, readiness })
  } catch (error) {
    console.error('WhatsApp template config read failed:', error)
    return NextResponse.json({ error: 'Could not load WhatsApp templates.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authorizeAdminRequest(req)
  if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status })

  try {
    const body = await req.json()
    const config = validateConfig(body?.config)
    if (!config) return NextResponse.json({ error: 'Template settings are invalid.' }, { status: 400 })

    const readiness = getWhatsAppReadiness()
    if (config.enabled && (!readiness.canSend || !readiness.automationEnvEnabled)) {
      return NextResponse.json({
        error: 'Automation stays paused until the WhatsApp number is verified, quality is above red, credentials are configured, and automation is enabled in the server environment.',
      }, { status: 409 })
    }

    await saveWhatsAppAutomationConfig(config)
    return NextResponse.json({ success: true, config, readiness })
  } catch (error) {
    console.error('WhatsApp template config save failed:', error)
    return NextResponse.json({ error: 'Could not save WhatsApp templates.' }, { status: 500 })
  }
}
