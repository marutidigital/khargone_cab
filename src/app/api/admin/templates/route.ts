import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

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
      approval_status: body.approval_status || undefined,
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

export async function POST(request: NextRequest) {
  const db = createServiceClient()
  const body = await request.json().catch(() => null)

  if (!body?.template_code || !body?.body_text) {
    return NextResponse.json({ error: 'template_code and body_text are required.' }, { status: 400 })
  }

  const { data: created, error } = await db
    .from('whatsapp_message_templates')
    .insert({
      template_code: body.template_code.trim().toLowerCase().replace(/\s+/g, '_'),
      meta_template_name: body.meta_template_name?.trim() || body.template_code.trim(),
      category: body.category || 'UTILITY',
      header_text: body.header_text || null,
      body_text: body.body_text,
      footer_text: body.footer_text || null,
      language: body.language || 'en',
      variables: body.variables || [],
      active: body.active !== undefined ? body.active : true,
      approval_status: body.approval_status || 'APPROVED',
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, template: created })
}

export async function DELETE(request: NextRequest) {
  const db = createServiceClient()
  const { searchParams } = new URL(request.url)
  const templateCode = searchParams.get('template_code')

  if (!templateCode) {
    return NextResponse.json({ error: 'Missing template_code query param' }, { status: 400 })
  }

  const { error } = await db
    .from('whatsapp_message_templates')
    .delete()
    .eq('template_code', templateCode)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, deleted: templateCode })
}
