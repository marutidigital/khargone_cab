import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '').trim()
    const db = createServiceClient()

    // 1. Verify token with Supabase Auth
    const { data: userData, error: userError } = await db.auth.getUser(token)
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Invalid or expired session token.' }, { status: 401 })
    }

    const user = userData.user
    const userId = user.id
    const userEmail = (user.email || '').toLowerCase().trim()

    // 2. Check if user is already in public.admins
    const { data: adminRows, error: adminQueryError } = await db
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .limit(1)

    if (adminRows && adminRows.length > 0) {
      return NextResponse.json({ isAdmin: true, user: { id: userId, email: userEmail } })
    }

    // 3. Fallback: If email is admin@maruticab.in or authorized admin email, auto-register into public.admins
    const authorizedEmails = [
      'admin@maruticab.in',
      'avadhbajaj@gmail.com',
      'shikhabajaj@gmail.com',
    ]

    if (authorizedEmails.includes(userEmail) || userEmail.endsWith('@maruticab.in')) {
      const { error: insertError } = await db.from('admins').insert({ user_id: userId })
      if (!insertError) {
        return NextResponse.json({ isAdmin: true, user: { id: userId, email: userEmail } })
      }
    }

    return NextResponse.json({ isAdmin: false, user: { id: userId, email: userEmail } }, { status: 403 })
  } catch (err: any) {
    console.error('Admin verify error:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error.' }, { status: 500 })
  }
}
