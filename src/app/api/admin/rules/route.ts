import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET() {
  const db = createServiceClient()
  const { data: rules, error } = await db
    .from('booking_rules')
    .select('*')
    .order('priority', { ascending: true })

  const { data: versions } = await db
    .from('booking_rule_versions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ rules: rules || [], versions: versions || [] })
}

export async function PUT(request: NextRequest) {
  const db = createServiceClient()
  const body = await request.json().catch(() => null)

  if (!body || !body.id) {
    return NextResponse.json({ error: 'Missing rule ID.' }, { status: 400 })
  }

  // 1. Fetch current rule for versioning
  const { data: currentRule, error: fetchErr } = await db
    .from('booking_rules')
    .select('*')
    .eq('id', body.id)
    .single()

  if (fetchErr || !currentRule) {
    return NextResponse.json({ error: 'Rule not found.' }, { status: 404 })
  }

  const updatedFields: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (typeof body.matching_deadline_hours === 'number') {
    updatedFields.matching_deadline_hours = body.matching_deadline_hours
  }
  if (typeof body.advance_amount === 'number') {
    updatedFields.advance_amount = body.advance_amount
  }
  if (typeof body.active === 'boolean') {
    updatedFields.active = body.active
  }
  if (typeof body.customer_message === 'string') {
    updatedFields.customer_message = body.customer_message
  }
  if (typeof body.description === 'string') {
    updatedFields.description = body.description
  }

  // 2. Update rule
  const { data: updatedRule, error: updateErr } = await db
    .from('booking_rules')
    .update(updatedFields)
    .eq('id', body.id)
    .select('*')
    .single()

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // 3. Record in booking_rule_versions
  const { count } = await db
    .from('booking_rule_versions')
    .select('*', { count: 'exact', head: true })
    .eq('rule_id', body.id)

  const nextVersion = (count || 0) + 1

  await db.from('booking_rule_versions').insert({
    rule_id: body.id,
    version_number: nextVersion,
    previous_values: currentRule,
    new_values: updatedRule,
    changed_by: body.changed_by || 'admin',
    change_reason: body.change_reason || 'Updated via Admin Dashboard',
  })

  return NextResponse.json({ success: true, rule: updatedRule, version: nextVersion })
}
