import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-auth'
import { getWhatsAppAutomationConfig, getWhatsAppReadiness } from '@/lib/whatsapp-automation'
import { sendTemplateMessage } from '@/lib/whatsapp'
import { createServiceClient } from '@/lib/supabase-server'
import { randomUUID } from 'node:crypto'

export async function POST(req: NextRequest) {
  const auth = await authorizeAdminRequest(req)
  if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status })

  try {
    const readiness = getWhatsAppReadiness()
    if (!readiness.canSend) {
      return NextResponse.json({
        error: 'Sending is paused. Verify the number, resolve its quality status, and configure the server credentials first.',
      }, { status: 409 })
    }

    const body = await req.json()
    const templateId = typeof body?.templateId === 'string' ? body.templateId : ''
    const rawPhone = typeof body?.phone === 'string' ? body.phone : ''
    const digits = rawPhone.replace(/\D/g, '')
    const phone = digits.length === 10 ? `91${digits}` : digits
    const parameters = Array.isArray(body?.parameters)
      ? body.parameters.filter((item: unknown) => typeof item === 'string').map((item: string) => item.trim())
      : []

    if (!/^91[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: 'Enter a valid Indian WhatsApp number.' }, { status: 400 })
    }

    const config = await getWhatsAppAutomationConfig()
    const template = config.templates.find((item: { id: string; approved: boolean }) => item.id === templateId && item.approved)
    if (!template) {
      return NextResponse.json({ error: 'Choose a template marked approved in WhatsApp Manager.' }, { status: 400 })
    }
    if (parameters.length !== template.parameterFields.length || parameters.some((item: string) => item.length > 1024)) {
      return NextResponse.json({ error: 'Enter one value for each template parameter.' }, { status: 400 })
    }

    const db = createServiceClient()
    const idempotencyKey = `admin-manual:${randomUUID()}`
    const { error: logError } = await db.from('notifications').insert({ booking_id: null, recipient_type: 'customer', template: template.metaName, status: 'queued', idempotency_key: idempotencyKey, event_version: 'admin-manual' })
    if (logError) return NextResponse.json({ error: 'Could not create a send log. Apply the WhatsApp migration and retry.' }, { status: 503 })
    try {
      const result = await sendTemplateMessage({ to: phone, template, parameters }) as { messages?: { id?: string }[] }
      const messageId = result?.messages?.[0]?.id ?? null
      await db.from('notifications').update({ status: 'sent', wa_message_id: messageId, provider_message_id: messageId, sent_at: new Date().toISOString() }).eq('idempotency_key', idempotencyKey)
      return NextResponse.json({ success: true, messageId })
    } catch (error) {
      await db.from('notifications').update({ status: 'failed', error: error instanceof Error ? error.message.slice(0, 500) : 'WhatsApp send failed.' }).eq('idempotency_key', idempotencyKey)
      throw error
    }
  } catch (error) {
    console.error('WhatsApp template send failed:', error)
    return NextResponse.json({ error: 'WhatsApp could not send this template message.' }, { status: 502 })
  }
}
