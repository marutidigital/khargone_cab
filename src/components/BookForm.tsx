'use client'
// src/components/BookForm.tsx

import { useState } from 'react'
import type { PriceBreakdown } from '@/types'

interface Props {
  disabled: boolean
  loading: boolean
  price: PriceBreakdown | null
  onSubmit: (name: string, phone: string, email: string) => void
}

export function BookForm({ disabled, loading, price, onSubmit }: Props) {
  const [name,  setName]  = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})

  const validate = () => {
    const e: typeof errors = {}
    if (!name.trim())          e.name  = 'Enter your name'
    if (!/^\d{10}$/.test(phone)) e.phone = 'Enter 10-digit mobile number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (disabled || loading) return
    if (!validate()) return
    onSubmit(name.trim(), phone.trim(), email.trim())
  }

  const btnLabel = disabled
    ? !price ? 'Select drop point to continue'
      : 'Select date & time to continue'
    : loading ? 'Placing booking…'
    : price
      ? `Book — ₹${price.total.toLocaleString('en-IN')}${price.discount > 0 ? ` (−₹${price.discount} off)` : ''}`
      : 'Book'

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Name */}
        <Field label="Passenger Name" error={errors.name}>
          <input
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: undefined })) }}
            style={inputStyle}
            autoComplete="name"
          />
        </Field>

        {/* Phone */}
        <Field label="Mobile Number" error={errors.phone}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, color: 'var(--muted)', flexShrink: 0 }}>+91</span>
            <input
              type="tel"
              placeholder="10-digit number"
              value={phone}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 10)
                setPhone(v)
                setErrors(p => ({ ...p, phone: undefined }))
              }}
              style={inputStyle}
              inputMode="numeric"
              autoComplete="tel"
            />
          </div>
        </Field>

        {/* Email (optional) */}
        <Field label="Email (optional — for receipt)">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
            autoComplete="email"
          />
        </Field>
      </div>

      {/* Book button */}
      <button
        onClick={handleSubmit}
        disabled={disabled || loading}
        style={{
          width: '100%',
          padding: 16,
          background: 'linear-gradient(135deg, var(--gold) 0%, var(--amber) 100%)',
          color: '#050505',
          border: 'none',
          borderRadius: 12,
          fontFamily: "'Geist Mono', monospace",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          opacity: disabled || loading ? 0.3 : 1,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          marginTop: 16,
          boxShadow: disabled || loading ? 'none' : '0 6px 20px rgba(212, 175, 55, 0.3)',
        }}
        onMouseEnter={(e) => {
          if (!disabled && !loading) {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(212, 175, 55, 0.4)'
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !loading) {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(212, 175, 55, 0.3)'
          }
        }}
      >
        {btnLabel}
      </button>

      {/* WhatsApp booking option */}
      <div style={{
        marginTop: 16,
        textAlign: 'center',
        fontSize: 11,
        color: 'var(--muted)',
        letterSpacing: '0.04em',
      }}>
        or{' '}
        <a
          href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '91XXXXXXXXXX'}?text=Hi%2C%20I%20want%20to%20book%20a%20cab`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--green)', textDecoration: 'none', fontWeight: 500, borderBottom: '1px solid var(--green-dim)', paddingBottom: 2 }}
        >
          book via WhatsApp ↗
        </a>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  outline: 'none',
  fontFamily: "'Geist Mono', monospace",
  fontSize: 15,
  color: 'var(--text)',
  width: '100%',
  padding: '4px 0',
}

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel" style={{
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      border: error ? '1px solid rgba(178,34,34,0.4)' : '1px solid var(--line)',
      transition: 'all 0.3s ease',
    }}>
      <div style={{
        fontSize: 9,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: error ? 'var(--red)' : 'var(--muted)',
        fontWeight: 500,
      }}>
        {error ?? label}
      </div>
      {children}
    </div>
  )
}
