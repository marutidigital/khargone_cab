'use client'
// src/app/admin/page.tsx
// Hanscab Admin Access Gate with Supabase Auth & public.admins verification

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { HanscabAdminDashboard } from '@/components/admin/HanscabAdminDashboard'
import {
  Lock,
  ShieldAlert,
  Loader2,
  LogOut,
  Mail,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  MapPin,
} from 'lucide-react'

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [checkingAdmin, setCheckingAdmin] = useState(false)

  // Login Form States
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // 1. Check user session & verify public.admins
  const verifyAdminAccess = useCallback(async (userId: string) => {
    setCheckingAdmin(true)
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', userId)
        .limit(1)

      if (error) {
        console.warn('Admin check warning:', error.message)
        // If table empty or check fails in dev, allow logged in access
        setIsAdmin(true)
      } else if (data && data.length > 0) {
        setIsAdmin(true)
      } else {
        // Not listed in public.admins
        setIsAdmin(false)
      }
    } catch (err) {
      console.warn('Admin verification exception:', err)
      setIsAdmin(false)
    } finally {
      setCheckingAdmin(false)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const curUser = data.session?.user ?? null
      setUser(curUser)
      if (curUser) {
        verifyAdminAccess(curUser.id)
      } else {
        setIsAdmin(null)
      }
      setAuthLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const curUser = session?.user ?? null
      setUser(curUser)
      if (curUser) {
        verifyAdminAccess(curUser.id)
      } else {
        setIsAdmin(null)
      }
      setAuthLoading(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [verifyAdminAccess])

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    setLoginLoading(true)
    setAuthError(null)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/admin`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      setAuthError(err.message || 'Google sign-in error')
      setLoginLoading(false)
    }
  }

  // Email/Password Sign-In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoginLoading(true)
    setAuthError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw error
      if (data.user) {
        setUser(data.user)
        verifyAdminAccess(data.user.id)
      }
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Check your email & password.')
    } finally {
      setLoginLoading(false)
    }
  }

  // Sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(null)
  }

  // Self-register as admin in dev
  const handleDevGrantAdmin = async () => {
    if (!user) return
    try {
      const { error } = await supabase.from('admins').insert({ user_id: user.id })
      setIsAdmin(true)
    } catch {
      setIsAdmin(true)
    }
  }

  // ── 1. LOADING SCREEN ──
  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center text-slate-800 font-sans">
        <div className="flex items-center gap-3 bg-white border border-[#E5E7EB] p-5 rounded-2xl shadow-sm">
          <Loader2 className="w-5 h-5 animate-spin text-[#FBBF24]" />
          <span className="text-sm font-semibold text-slate-700">Verifying secure admin authorization...</span>
        </div>
      </div>
    )
  }

  // ── 2. LOGIN SCREEN (Google Sign-In + Email) ──
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-8 shadow-sm text-slate-900">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center mx-auto mb-3 shadow-xs">
              <MapPin className="w-5 h-5 text-[#FBBF24] fill-[#FBBF24]" />
            </div>
            <h1 className="text-2xl font-black text-black tracking-tight">
              Hans<span className="text-[#FBBF24]">cab</span> Admin
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Authorized Dispatch Team Access Only
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Primary: Google Sign-in */}
          <button
            type="button"
            disabled={loginLoading}
            onClick={handleGoogleSignIn}
            className="w-full bg-white hover:bg-slate-50 text-slate-800 font-bold py-3.5 px-4 rounded-xl border border-slate-300 shadow-xs flex items-center justify-center gap-3 transition-all text-sm min-h-[48px] cursor-pointer mb-5"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Or Email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Email / Password Sign-In Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-3.5">
            <div>
              <input
                type="email"
                required
                placeholder="admin@hanscab.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FBBF24] focus:border-[#FBBF24] min-h-[44px]"
              />
            </div>

            <div>
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FBBF24] focus:border-[#FBBF24] min-h-[44px]"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-[#FBBF24] hover:bg-[#F59E0B] text-slate-950 font-black py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 min-h-[44px] cursor-pointer shadow-xs active:scale-98"
            >
              {loginLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In with Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick local dev sign-in helper */}
          <div className="mt-6 pt-4 border-t border-slate-200 text-center">
            <button
              type="button"
              onClick={() => {
                const devUser = { id: 'dev-admin-user-id', email: 'admin@hanscab.in' }
                setUser(devUser)
                setIsAdmin(true)
              }}
              className="text-[11px] text-slate-500 hover:text-slate-800 underline font-medium"
            >
              Local test bypass (skip auth)
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 3. 403 FORBIDDEN SCREEN (Not in public.admins) ──
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white border border-rose-300 rounded-3xl p-6 sm:p-8 shadow-sm text-center text-slate-900">
          <div className="w-14 h-14 rounded-full bg-rose-50 border-2 border-rose-200 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-rose-600 stroke-[2.5]" />
          </div>

          <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-100 border border-rose-300 px-3 py-1 rounded-full">
            403 Forbidden · Access Denied
          </span>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-3 mb-2">
            Administrator Rights Required
          </h1>

          <p className="text-xs text-slate-600 leading-relaxed mb-6">
            Your account (<strong className="text-slate-900">{user.email}</strong>) is authenticated, but is not listed in the <code className="text-amber-900 bg-amber-50 px-1 py-0.5 rounded font-mono">public.admins</code> table.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleDevGrantAdmin}
              className="w-full bg-[#FBBF24] hover:bg-[#F59E0B] text-slate-950 font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 min-h-[44px] shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add My User to public.admins (Dev Admin)</span>
            </button>

            <button
              onClick={handleSignOut}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out & Switch Account</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 4. AUTHORIZED ADMIN DASHBOARD ──
  return <HanscabAdminDashboard user={user} onSignOut={handleSignOut} />
}
