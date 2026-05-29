'use client'
// src/components/DirectionTabs.tsx

import type { Direction } from '@/types'

interface Props {
  dir: Direction
  onChange: (d: Direction) => void
}

export function DirectionTabs({ dir, onChange }: Props) {
  const isKI = dir === 'KI'
  const from = isKI ? 'Indore, Madhya Pradesh' : 'Khargone, Madhya Pradesh'
  const to   = isKI ? 'Khargone, Madhya Pradesh' : 'Indore, Madhya Pradesh'

  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--line)',
      borderRadius: 12,
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      {/* From */}
      <div style={{
        flex: 1,
        background: '#F8F9FA',
        border: '1px solid var(--line)',
        borderRadius: 8,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        cursor: 'default',
      }}>
        <span style={{ fontSize: 10, color: '#999', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>From</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: '#22C55E', flexShrink: 0,
            boxShadow: '0 0 0 2px rgba(34,197,94,0.2)',
          }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111', letterSpacing: '-0.01em' }}>{from}</span>
        </div>
      </div>

      {/* Swap Button */}
      <button
        onClick={() => onChange(isKI ? 'IK' : 'KI')}
        title="Swap direction"
        style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: '#fff',
          border: '1.5px solid var(--line2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#FFC107'; e.currentTarget.style.background = '#FFFDE7' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line2)'; e.currentTarget.style.background = '#fff' }}
      >
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
          <path d="M1 4h14M11 1l4 3-4 3" stroke="#555" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M17 10H3M7 7l-4 3 4 3" stroke="#555" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* To */}
      <div style={{
        flex: 1,
        background: '#F8F9FA',
        border: '1px solid var(--line)',
        borderRadius: 8,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        cursor: 'default',
      }}>
        <span style={{ fontSize: 10, color: '#999', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>To</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="10" height="13" viewBox="0 0 10 13" fill="none" style={{ flexShrink: 0 }}>
            <path d="M5 0C2.24 0 0 2.24 0 5c0 3.75 5 8 5 8s5-4.25 5-8c0-2.76-2.24-5-5-5zm0 6.5A1.5 1.5 0 1 1 5 3.5a1.5 1.5 0 0 1 0 3z" fill="#EF4444"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111', letterSpacing: '-0.01em' }}>{to}</span>
        </div>
      </div>
    </div>
  )
}
