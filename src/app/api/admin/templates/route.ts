import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET() {
  const db = createServiceClient()
  const { data: templates, error } = await db
    .from('whatsapp_message_templates')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ templates: templates || [] })
}

export async function PUT(request: NextRequest) {
  const db = createServiceClient()
  const body = await request.json().catch(() => null)

  if (!body?.template_code) {
    return NextResponse.json({ error: 'Missing template_code' }, { status: 400 })
  }

  const { data: updated, error } = await db
    .from('whatsapp_message_templates')
    .update({
      header_text: body.header_text,
      body_text: body.body_text,
      footer_text: body.footer_text,
      active: body.active !== undefined ? body.active : true,
      updated_at: new Date().toISOString(),
    })
    .eq('template_code', body.template_code)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, template: updated })
}
