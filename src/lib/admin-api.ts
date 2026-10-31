import { supabase } from '@/lib/supabase-client'

export async function getAdminApiHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  if (data.session?.access_token) {
    return { Authorization: `Bearer ${data.session.access_token}` }
  }

  if (process.env.NODE_ENV !== 'production') {
    return { 'x-admin-dev': 'true' }
  }

  throw new Error('Please sign in with your admin account again.')
}
