import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = createServiceClient()
    const { data: providers, error } = await db
      .from('providers')
      .select('*')
      .order('priority', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ providers: providers || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch providers.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const { id, name, phone, priority = 1, active = true, notes } = body || {}

    const cleanName = String(name || '').trim()
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10)
    const prio = Math.min(6, Math.max(1, Number(priority) || 1))

    if (!cleanName) {
      return NextResponse.json({ error: 'Provider name is required.' }, { status: 400 })
    }
    if (!cleanPhone || cleanPhone.length !== 10) {
      return NextResponse.json({ error: 'Valid 10-digit mobile number is required.' }, { status: 400 })
    }

    const db = createServiceClient()

    if (id) {
      // Update existing
      const { data, error } = await db
        .from('providers')
        .update({
          name: cleanName,
          phone: cleanPhone,
          priority: prio,
          active: Boolean(active),
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, provider: data })
    }

    // Insert new provider
    const { data, error } = await db
      .from('providers')
      .upsert({
        name: cleanName,
        phone: cleanPhone,
        priority: prio,
        active: Boolean(active),
        notes: notes || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'phone' })
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, provider: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to save provider.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Provider ID is required.' }, { status: 400 })

    const db = createServiceClient()
    const { error } = await db.from('providers').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete provider.' }, { status: 500 })
  }
}
