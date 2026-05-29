'use client'
// src/components/BookForm.tsx

import { useState } from 'react'
import type { PriceBreakdown } from '@/types'
import { Loader2 } from 'lucide-react'

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
    if (!name.trim())           e.name  = 'Enter your name'
    if (!/^\d{10}$/.test(phone)) e.phone = 'Enter 10-digit mobile number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (disabled || loading) return
    if (!validate()) return
    onSubmit(name.trim(), phone.trim(), email.trim())
  }

  const btnLabel = loading
    ? 'Placing booking…'
    : price
    ? `Book Now — ₹${price.total.toLocaleString('en-IN')}`
    : 'Book Now'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Name */}
      <Field label="Passenger Name" error={errors.name}>
        <input
          id="passenger-name"
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 13, fontWeight: 600, color: '#555',
            background: '#F0F0F0', padding: '0 10px',
            borderRadius: 6, height: 36,
            display: 'flex', alignItems: 'center',
            flexShrink: 0,
          }}>+91</span>
          <input
            id="passenger-phone"
            type="tel"
            placeholder="10-digit mobile number"
            value={phone}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 10)
              setPhone(v)
              setErrors(p => ({ ...p, phone: undefined }))
            }}
            style={{ ...inputStyle, flex: 1 }}
            inputMode="numeric"
            autoComplete="tel"
          />
        </div>
      </Field>

      {/* Email */}
      <Field label="Email (optional — for receipt)">
        <input
          id="passenger-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
          autoComplete="email"
        />
      </Field>

      {/* Submit */}
      <button
        id="confirm-booking-btn"
        onClick={handleSubmit}
        disabled={disabled || loading}
        style={{
          width: '100%',
          padding: '15px 20px',
          background: disabled || loading ? '#E0E0E0' : '#FFC107',
          color: disabled || loading ? '#AAA' : '#000',
          border: 'none',
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: '-0.01em',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          marginTop: 4,
          boxShadow: disabled || loading ? 'none' : '0 4px 14px rgba(255,193,7,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
        onMouseEnter={e => {
          if (!disabled && !loading) {
            e.currentTarget.style.background = '#F9A825'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }
        }}
        onMouseLeave={e => {
          if (!disabled && !loading) {
            e.currentTarget.style.background = '#FFC107'
            e.currentTarget.style.transform = 'translateY(0)'
          }
        }}
      >
        {loading && (
          <Loader2 size={16} strokeWidth={2.5} style={{ animation: 'spin 1s linear infinite' }} />
        )}
        {btnLabel}
      </button>

      {/* WhatsApp alternative */}
      <div style={{
        textAlign: 'center',
        fontSize: 12,
        color: '#999',
        marginTop: 4,
      }}>
        or{' '}
        <a
          href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '919999999999'}?text=Hi%2C%20I%20want%20to%20book%20a%20cab`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#16A34A',
            fontWeight: 600,
            textDecoration: 'underline',
            textDecorationColor: 'rgba(22,163,74,0.3)',
          }}
        >
          book via WhatsApp ↗
        </a>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  outline: 'none',
  fontSize: 14,
  color: '#111',
  fontFamily: 'Inter, sans-serif',
  fontWeight: 500,
  padding: '4px 0',
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff',
      border: `1.5px solid ${error ? '#FCA5A5' : '#E8E8E8'}`,
      borderRadius: 10,
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      transition: 'border-color 0.2s',
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: error ? '#EF4444' : '#888',
      }}>
        {error ?? label}
      </div>
      {children}
    </div>
  )
}
