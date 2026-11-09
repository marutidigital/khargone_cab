import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await authorizeAdminRequest(req)
  if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status })

  try {
    const body = await req.json()
    const templateName = String(body?.templateName || body?.templateId || '').trim()
    const rawPhone = typeof body?.phone === 'string' ? body.phone : ''
    const digits = rawPhone.replace(/\D/g, '')
    const phone = digits.length === 10 ? `91${digits}` : digits
    const parameters = Array.isArray(body?.parameters)
      ? body.parameters.map((item: unknown) => String(item ?? '').trim())
      : []

    if (!/^91[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: 'Enter a valid 10-digit Indian WhatsApp number.' }, { status: 400 })
    }

    if (!templateName) {
      return NextResponse.json({ error: 'Please select a template to send.' }, { status: 400 })
    }

    const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '1379464058575093'
    const wabaId = process.env.WHATSAPP_WABA_ID

    if (!token || token.includes('dummy')) {
      if (process.env.WHATSAPP_MOCK === 'true') {
        return NextResponse.json({ success: true, messageId: `mock_${Date.now()}`, mock: true })
      }
      return NextResponse.json({ error: 'WhatsApp API credentials are not configured on the server.' }, { status: 500 })
    }

    const db = createServiceClient()

    // 1. Try to find template in Supabase whatsapp_message_templates table
    const { data: dbTpl } = await db
      .from('whatsapp_message_templates')
      .select('*')
      .or(`template_code.eq.${templateName.toLowerCase()},meta_template_name.eq.${templateName}`)
      .limit(1)
      .maybeSingle()

    let metaName = dbTpl?.meta_template_name || templateName
    let langCode = dbTpl?.language || 'en'
    let hasFlow = Boolean(
      dbTpl?.category === 'FLOW' ||
      dbTpl?.variables?.includes('__has_flow__') ||
      templateName.toLowerCase().includes('flow')
    )

    // 2. If not found in DB or flow status unknown, inspect Meta Graph API
    if (wabaId && (!dbTpl || !hasFlow)) {
      try {
        const metaRes = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates?name=${templateName}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (metaRes.ok) {
          const metaJson = await metaRes.json()
          const mt = metaJson?.data?.find((t: any) => t.name === templateName) || metaJson?.data?.[0]
          if (mt) {
            metaName = mt.name
            langCode = mt.language || langCode
            const buttonsComp = mt.components?.find((c: any) => c.type === 'BUTTONS')
            if (buttonsComp?.buttons?.some((b: any) => b.type === 'FLOW')) {
              hasFlow = true
            }
          }
        }
      } catch (metaErr) {
        console.warn('Meta template lookup warning:', metaErr)
      }
    }

    // 3. Build payload components
    const components: any[] = []

    if (parameters.length > 0) {
      components.push({
        type: 'body',
        parameters: parameters.map((val: string) => ({ type: 'text', text: val })),
      })
    }

    if (hasFlow) {
      components.push({
        type: 'button',
        sub_type: 'flow',
        index: '0',
        parameters: [
          {
            type: 'action',
            action: {
              flow_token: `flow_${Date.now()}`,
            },
          },
        ],
      })
    }

    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'template',
      template: {
        name: metaName,
        language: { code: langCode },
        ...(components.length ? { components } : {}),
      },
    }

    const sendUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`

    let sendRes = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    let sendJson = await sendRes.json()

    // Auto-retry with language fallback (en <-> en_US)
    if (!sendRes.ok && sendJson?.error?.code === 132001) {
      const fallbackLang = langCode === 'en' ? 'en_US' : 'en'
      payload.template.language.code = fallbackLang
      sendRes = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      sendJson = await sendRes.json()
    }

    if (!sendRes.ok) {
      const msg = sendJson?.error?.message || 'Failed to send template.'
      const details = sendJson?.error?.error_data?.details || ''
      return NextResponse.json({
        error: `${msg} ${details}`.trim(),
        details: sendJson?.error,
      }, { status: 400 })
    }

    const messageId = sendJson?.messages?.[0]?.id || null

    // Record notification log safely
    try {
      await db.from('notifications').insert({
        booking_id: null,
        recipient_type: 'customer',
        template: metaName,
        status: 'sent',
        wa_message_id: messageId,
        provider_message_id: messageId,
        idempotency_key: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        event_version: 'admin_manual',
      })
    } catch {}

    return NextResponse.json({
      success: true,
      messageId,
      template: metaName,
      phone,
    })
  } catch (error: any) {
    console.error('WhatsApp template send failed:', error)
    return NextResponse.json({ error: error.message || 'WhatsApp send failed.' }, { status: 500 })
  }
}
