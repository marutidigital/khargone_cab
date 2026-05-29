'use client'
// src/components/MatchPrompt.tsx

import { Zap } from 'lucide-react'

interface Props {
  count: number
  matchOnDate: boolean
  dateStr?: string
  onScrollToForm: () => void
}

export function MatchPrompt({ count, matchOnDate, dateStr, onScrollToForm }: Props) {
  return (
    <div style={{
      background: 'var(--green-dim)',
      border: '1px solid rgba(76,175,130,0.2)',
      borderRadius: 10,
      padding: '14px 16px',
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
    }}>
      <Zap size={20} color="#16A34A" fill="#16A34A" strokeWidth={1} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: "'Instrument Serif', serif",
          fontSize: 17,
          color: 'var(--green)',
          marginBottom: 3,
        }}>
          {matchOnDate && dateStr
            ? `Instant match on ${dateStr}!`
            : `${count} booking${count > 1 ? 's' : ''} waiting for match`}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
          {matchOnDate
            ? 'A booking exists in the opposite direction for the same date. Book now — both get confirmed instantly.'
            : 'Someone booked the opposite direction. Pick the same date to get instant confirmation.'}
        </div>
        <button
          onClick={onScrollToForm}
          style={{
            marginTop: 10,
            padding: '10px 14px',
            background: 'var(--green)',
            color: '#0C0C0B',
            border: 'none',
            borderRadius: 8,
            fontFamily: "'Geist Mono', monospace",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'block',
            transition: 'opacity 0.2s',
          }}
        >
          Book & Get Instant Confirmation →
        </button>
      </div>
    </div>
  )
}
