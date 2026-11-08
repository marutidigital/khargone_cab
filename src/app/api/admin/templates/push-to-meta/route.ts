import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { TEMPLATE_DEFINITIONS, WhatsAppTemplateRecord } from '@/lib/whatsapp-templates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SAMPLE_CATALOG: Record<string, string> = {
  customer_name: 'Avadh Bajaj',
  passenger_name: 'Avadh Bajaj',
  booking_id: 'KC99381',
  booking_ref: 'KC99381',
  route: 'Khargone to Indore',
  travel_date: '10 Nov 2026',
  departure_time: '09:00 AM',
  pickup_time: '09:00 AM',
  pickup_location: 'Bus Stand Khargone',
  pickup_point: 'Bus Stand Khargone',
  amount_paid: '500',
  advance_paid: '500',
  balance_fare: '1700',
  balance_amount: '1700',
  total_fare: '2200',
  driver_name: 'Ramesh Sharma',
  driver_phone: '+91 98765 43210',
  car_model: 'Swift Dzire AC',
  vehicle_number: 'MP10 CA 1234',
  payment_reference: 'PAY_993812',
  refund_amount: '500',
  refund_reference: 'RFD_884920',
  hours_left: '2',
  reason: 'Opposite schedule match not found',
  provider_name: 'Goyal Travels',
  leg1_route: 'Khargone to Indore',
  leg1_pickup: '09:00 AM',
  leg2_route: 'Indore to Khargone',
  leg2_pickup: '05:00 PM',
  out_ref: 'KC99381',
  out_route: 'Khargone to Indore',
  out_time: '09:00 AM',
  back_ref: 'KC99382',
  back_route: 'Indore to Khargone',
  back_time: '05:00 PM',
  message_text: 'Need to adjust pickup location',
  phone: '+91 98765 43210',
}

interface PushTemplateResult {
  template_code: string
  meta_name: string
  success: boolean
  status: string
  meta_id?: string
  message: string
}

async function pushSingleTemplate(
  tpl: {
    template_code: string
    meta_template_name?: string
    header_text?: string | null
    body_text: string
    footer_text?: string | null
    language?: string
    category?: string
    variables?: string[]
  },
  wabaId: string,
  accessToken: string,
  db: ReturnType<typeof createServiceClient>
): Promise<PushTemplateResult> {
  const metaName = (tpl.meta_template_name || tpl.template_code)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
  const category = (tpl.category || 'UTILITY').toUpperCase()
  const language = tpl.language || 'en'

  const components: any[] = []

  // 1. Header component (if present)
  if (tpl.header_text && tpl.header_text.trim()) {
    components.push({
      type: 'HEADER',
      format: 'TEXT',
      text: tpl.header_text.trim(),
    })
  }

  // 2. Body component (mandatory)
  const bodyText = tpl.body_text.trim()
  const bodyComponent: any = {
    type: 'BODY',
    text: bodyText,
  }

  // Meta requires sample values for {{1}}, {{2}}...
  const varMatches = bodyText.match(/\{\{(\d+)\}\}/g) || []
  const varCount = varMatches.length

  if (varCount > 0) {
    const definedVars = tpl.variables || []
    const sampleRow: string[] = []

    for (let i = 0; i < varCount; i++) {
      const varKey = definedVars[i] || ''
      sampleRow.push(SAMPLE_CATALOG[varKey] || `Sample ${i + 1}`)
    }

    bodyComponent.example = {
      body_text: [sampleRow],
    }
  }

  components.push(bodyComponent)

  // 3. Footer component (if present)
  if (tpl.footer_text && tpl.footer_text.trim()) {
    components.push({
      type: 'FOOTER',
      text: tpl.footer_text.trim(),
    })
  }

  const metaPayload = {
    name: metaName,
    category,
    language,
    components,
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metaPayload),
    })

    const json = await response.json().catch(() => ({}))

    if (response.ok && json.id) {
      const approvalStatus = json.status || 'PENDING'

      // Update in Supabase
      await db.from('whatsapp_message_templates').upsert(
        {
          template_code: tpl.template_code,
          meta_template_name: metaName,
          category,
          header_text: tpl.header_text || null,
          body_text: tpl.body_text,
          footer_text: tpl.footer_text || null,
          language,
          variables: tpl.variables || [],
          active: true,
          approval_status: approvalStatus,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'template_code' }
      )

      return {
        template_code: tpl.template_code,
        meta_name: metaName,
        success: true,
        status: approvalStatus,
        meta_id: json.id,
        message: `Successfully submitted to Meta! Status: ${approvalStatus}`,
      }
    }

    // Check if template already exists on Meta
    const errorMessage = json.error?.message || ''
    const isAlreadyExists =
      json.error?.code === 100 &&
      (errorMessage.includes('already exists') || json.error?.error_subcode === 2388042)

    if (isAlreadyExists) {
      // Fetch live status from Meta for this existing template
      let liveStatus = 'APPROVED'
      try {
        const getRes = await fetch(
          `https://graph.facebook.com/v21.0/${wabaId}/message_templates?name=${encodeURIComponent(metaName)}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        )
        if (getRes.ok) {
          const getJson = await getRes.json()
          const matched = (getJson.data || []).find((m: any) => m.name === metaName)
          if (matched?.status) liveStatus = matched.status
        }
      } catch (checkErr) {
        console.warn('Failed to query existing template status from Meta:', checkErr)
      }

      // Update in Supabase
      await db.from('whatsapp_message_templates').upsert(
        {
          template_code: tpl.template_code,
          meta_template_name: metaName,
          category,
          header_text: tpl.header_text || null,
          body_text: tpl.body_text,
          footer_text: tpl.footer_text || null,
          language,
          variables: tpl.variables || [],
          active: true,
          approval_status: liveStatus,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'template_code' }
      )

      return {
        template_code: tpl.template_code,
        meta_name: metaName,
        success: true,
        status: liveStatus,
        message: `Already registered in Meta! Live Status: ${liveStatus}`,
      }
    }

    // Meta error
    return {
      template_code: tpl.template_code,
      meta_name: metaName,
      success: false,
      status: 'ERROR',
      message: errorMessage || 'Failed to submit template to Meta API.',
    }
  } catch (err: any) {
    return {
      template_code: tpl.template_code,
      meta_name: metaName,
      success: false,
      status: 'NETWORK_ERROR',
      message: err?.message || 'Network exception connecting to Meta Graph API.',
    }
  }
}

export async function POST(req: NextRequest) {
  const wabaId = process.env.WHATSAPP_WABA_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN

  if (!wabaId || !accessToken || accessToken.includes('dummy')) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Meta WhatsApp Cloud API credentials (WHATSAPP_WABA_ID and WHATSAPP_ACCESS_TOKEN) are not configured in environment variables.',
      },
      { status: 400 }
    )
  }

  const db = createServiceClient()
  const body = await req.json().catch(() => ({}))
  const { template_code, push_all } = body

  const results: PushTemplateResult[] = []

  if (push_all) {
    // 1. Fetch all defined templates from code
    const allDefs = Object.values(TEMPLATE_DEFINITIONS)

    // 2. Also fetch any custom templates saved in DB
    const { data: dbTemplates } = await db.from('whatsapp_message_templates').select('*')
    const dbMap = new Map((dbTemplates || []).map((t: any) => [t.template_code, t]))

    for (const def of allDefs) {
      const merged = {
        ...def,
        ...(dbMap.get(def.template_code) || {}),
      }
      const res = await pushSingleTemplate(merged, wabaId, accessToken, db)
      results.push(res)
    }

    // Also push any DB templates not in code definitions
    for (const dbTpl of dbTemplates || []) {
      if (!TEMPLATE_DEFINITIONS[dbTpl.template_code]) {
        const res = await pushSingleTemplate(dbTpl, wabaId, accessToken, db)
        results.push(res)
      }
    }

    const successCount = results.filter((r) => r.success).length
    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} templates (${successCount} active/submitted on Meta).`,
      results,
    })
  }

  // Push single template
  if (!template_code) {
    return NextResponse.json(
      { success: false, error: 'template_code or push_all: true is required.' },
      { status: 400 }
    )
  }

  // Look up in DB first
  const { data: existing } = await db
    .from('whatsapp_message_templates')
    .select('*')
    .eq('template_code', template_code)
    .single()

  const defaultDef = TEMPLATE_DEFINITIONS[template_code]

  if (!existing && !defaultDef) {
    return NextResponse.json(
      { success: false, error: `Template "${template_code}" not found.` },
      { status: 404 }
    )
  }

  const tplToPush = {
    ...(defaultDef || {}),
    ...(existing || {}),
    template_code,
  }

  const result = await pushSingleTemplate(tplToPush, wabaId, accessToken, db)

  return NextResponse.json({
    success: result.success,
    result,
    message: result.message,
  })
}
