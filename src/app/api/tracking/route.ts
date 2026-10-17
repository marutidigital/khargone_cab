// src/app/api/tracking/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { session_id, event, source, meta } = body

    if (!event) {
      return NextResponse.json({ error: 'Event name is required' }, { status: 400 })
    }

    // Insert into lead_events using anon key (policy "anyone logs events" allows insert)
    await supabase.from('lead_events').insert({
      session_id: session_id || null,
      event,
      source: source || 'direct',
      meta: meta || {},
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
