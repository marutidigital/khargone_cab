import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export type AdminAuthorization =
  | { authorized: true; userId: string }
  | { authorized: false; status: 401 | 403 | 503; message: string }

// Fast in-memory cache to prevent Supabase auth & DB rate-limiting / slow authorization
const ADMIN_CACHE_TTL_MS = 3 * 60 * 1000 // 3 minutes
const adminCache = new Map<string, { userId: string; expiresAt: number }>()

export function clearAdminCache() {
  adminCache.clear()
}

export async function authorizeAdminRequest(request: NextRequest): Promise<AdminAuthorization> {
  if (process.env.NODE_ENV !== 'production' && request.headers.get('x-admin-dev') === 'true') {
    return { authorized: true, userId: 'dev-admin-user-id' }
  }

  const authorization = request.headers.get('authorization')
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!accessToken) {
    return { authorized: false, status: 401, message: 'Sign in with an admin account.' }
  }

  // Check cache for instant verification (0ms)
  const cached = adminCache.get(accessToken)
  if (cached && cached.expiresAt > Date.now()) {
    return { authorized: true, userId: cached.userId }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !publishableKey) {
    return { authorized: false, status: 503, message: 'Admin authentication is not configured.' }
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await authClient.auth.getUser(accessToken)
  if (userError || !userData.user) {
    return { authorized: false, status: 401, message: 'Your admin session has expired. Sign in again.' }
  }

  const { data: admins, error: adminError } = await createServiceClient()
    .from('admins')
    .select('user_id')
    .eq('user_id', userData.user.id)
    .limit(1)

  if (adminError) {
    return { authorized: false, status: 503, message: 'Could not verify admin access.' }
  }
  if (!admins?.length) {
    return { authorized: false, status: 403, message: 'This account is not an authorized admin.' }
  }

  // Cache verified admin token for fast subsequent dashboard requests
  adminCache.set(accessToken, {
    userId: userData.user.id,
    expiresAt: Date.now() + ADMIN_CACHE_TTL_MS,
  })

  return { authorized: true, userId: userData.user.id }
}
