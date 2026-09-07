'use client'
// src/components/DirectionTabs.tsx

import type { Direction } from '@/types'
import { ArrowLeftRight, CircleDot, MapPin } from 'lucide-react'

interface Props {
  dir: Direction
  onChange: (d: Direction) => void
}

export function DirectionTabs({ dir, onChange }: Props) {
  const isKI = dir === 'KI'
  const from = isKI ? 'Khargone, Madhya Pradesh' : 'Indore, Madhya Pradesh'
  const to   = isKI ? 'Indore, Madhya Pradesh' : 'Khargone, Madhya Pradesh'

  return (
    <div className="direction-route" style={{
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
          <CircleDot size={14} color="#22C55E" strokeWidth={3} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111', letterSpacing: '-0.01em' }}>{from}</span>
        </div>
      </div>

      {/* Swap Button */}
      <button
        type="button"
        onClick={() => onChange(isKI ? 'IK' : 'KI')}
        title="Swap direction"
        aria-label="Swap pickup and destination"
        className="direction-swap"
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
        <ArrowLeftRight size={16} color="#555" strokeWidth={2} />
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
          <MapPin size={14} color="#EF4444" fill="#EF4444" strokeWidth={1} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111', letterSpacing: '-0.01em' }}>{to}</span>
        </div>
      </div>
    </div>
  )
}
