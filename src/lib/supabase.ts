// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Detect if env keys are dummy or missing
const useLocalFallback = !supabaseUrl || supabaseUrl.includes('dummy');

// Client-safe dummy setup if local mode is detected
export const supabase = createClient(
  useLocalFallback ? 'https://dummy-project.supabase.co' : supabaseUrl,
  useLocalFallback ? 'dummy-anon-key' : supabaseAnon
)
