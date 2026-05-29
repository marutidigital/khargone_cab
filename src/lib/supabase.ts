// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Browser client (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnon)

// Server client (service role — only used in API routes)
export function createServiceClient() {
  return createClient(supabaseUrl, supabaseService, {
    auth: { persistSession: false }
  })
}
