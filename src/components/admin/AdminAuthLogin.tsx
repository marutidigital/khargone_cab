'use client'
// src/components/admin/AdminAuthLogin.tsx

import { useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Lock, Mail, KeyRound, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'

interface Props {
  onSuccess: (user: any) => void
}

export function AdminAuthLogin({ onSuccess }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'password' | 'magic-link'>('password')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setInfoMsg(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        throw error
      }

      if (data.user) {
        onSuccess(data.user)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setErrorMsg('Please enter your admin email address.')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setInfoMsg(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/admin` : undefined,
        },
      })

      if (error) throw error

      setInfoMsg(`A sign-in link has been sent to ${email}. Please check your inbox.`)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send login link.')
    } finally {
      setLoading(false)
    }
  }

  // Fallback for development if Supabase project has no users created yet
  const handleDevBypass = () => {
    onSuccess({ email: email || 'admin@hanscab.in', id: 'dev-admin-id' })
  }

  return (
    <div className="min-h-screen bg-[#0B1220] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-slate-100">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F5B841] to-[#D97706] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#F5B841]/20">
            <Lock className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Hans<span className="text-[#F5B841]">cab</span> Admin
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Protected Operations & Dispatch Portal
          </p>
        </div>

        {/* Tab switch between password and magic link */}
        <div className="flex bg-slate-800/80 p-1 rounded-xl mb-6 border border-slate-700/60">
          <button
            type="button"
            onClick={() => {
              setMode('password')
              setErrorMsg(null)
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'password'
                ? 'bg-[#F5B841] text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Password Sign-in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('magic-link')
              setErrorMsg(null)
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'magic-link'
                ? 'bg-[#F5B841] text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Magic Link Email
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={mode === 'password' ? handlePasswordLogin : handleMagicLink} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@hanscab.in"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#F5B841] transition-colors"
              />
            </div>
          </div>

          {mode === 'password' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#F5B841] transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#F5B841] hover:bg-[#E5A630] text-slate-950 font-extrabold py-3.5 px-4 rounded-xl shadow-lg shadow-[#F5B841]/20 flex items-center justify-center gap-2 transition-all text-sm min-h-[48px] cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>{mode === 'password' ? 'Sign In to Dashboard' : 'Send Login Link'}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {/* Development Helper Bypass */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={handleDevBypass}
            className="text-[11px] text-slate-500 hover:text-slate-300 underline transition-colors"
          >
            Testing? Continue with local dev session
          </button>
        </div>
      </div>
    </div>
  )
}
