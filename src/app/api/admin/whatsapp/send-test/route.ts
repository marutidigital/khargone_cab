import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  const phoneParam = req.nextUrl.searchParams.get('phone') || '9406633778'
  const templateName = req.nextUrl.searchParams.get('template') || 'testflow'

  if (secret !== 'maruti2026' && secret !== 'maruti') {
    return NextResponse.json({ error: 'Unauthorized. Use ?secret=maruti' }, { status: 401 })
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '1379464058575093'
  const wabaId = process.env.WHATSAPP_WABA_ID

  if (!token || token.includes('dummy')) {
    return NextResponse.json({
      error: 'WHATSAPP_ACCESS_TOKEN is not configured on this environment.',
    }, { status: 500 })
  }

  const rawDigits = phoneParam.replace(/\D/g, '')
  const targetPhone = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits

  if (req.nextUrl.searchParams.get('list') === 'true') {
    if (!wabaId) {
      return NextResponse.json({ error: 'WHATSAPP_WABA_ID is not configured' }, { status: 400 })
    }
    const res = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    return NextResponse.json({ success: res.ok, wabaId, data })
  }

  // 1. Fetch template details from Meta Graph API
  let templateMeta: any = null
  let matchedTemplate: any = null
  if (wabaId) {
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates?name=${templateName}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        templateMeta = await res.json()
        matchedTemplate = templateMeta?.data?.find((t: any) => t.name === templateName) || templateMeta?.data?.[0]
      }
    } catch (e: any) {
      console.warn('Could not fetch template details:', e.message)
    }
  }

  const langCode = matchedTemplate?.language || 'en'
  const components: any[] = []

  // Check body parameters if any
  const bodyComp = matchedTemplate?.components?.find((c: any) => c.type === 'BODY')
  if (bodyComp?.example?.body_text?.[0]) {
    const exampleValues = bodyComp.example.body_text[0]
    components.push({
      type: 'body',
      parameters: exampleValues.map((val: string) => ({ type: 'text', text: val })),
    })
  }

  // Check button parameters if Flow button
  const buttonsComp = matchedTemplate?.components?.find((c: any) => c.type === 'BUTTONS')
  if (buttonsComp?.buttons) {
    buttonsComp.buttons.forEach((btn: any, index: number) => {
      if (btn.type === 'FLOW') {
        components.push({
          type: 'button',
          sub_type: 'flow',
          index: String(index),
          parameters: [
            {
              type: 'action',
              action: {
                flow_token: `token_${Date.now()}`,
              },
            },
          ],
        })
      }
    })
  }

  const payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: targetPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: langCode },
      ...(components.length ? { components } : {}),
    },
  }

  const sendRes = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const sendResult = await sendRes.json()

  // If language code mismatch (e.g. en vs en_US), retry with alternative
  if (sendResult?.error?.code === 132001 && langCode !== 'en_US') {
    payload.template.language.code = 'en_US'
    const retryRes = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const retryResult = await retryRes.json()
    return NextResponse.json({
      success: retryRes.ok,
      sendResult: retryResult,
      matchedTemplate,
      payload,
    })
  }

  return NextResponse.json({
    success: sendRes.ok,
    sendResult,
    matchedTemplate,
    payload,
  })
}
