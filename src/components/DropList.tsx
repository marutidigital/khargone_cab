'use client'
// src/components/DropList.tsx

import type { DropOption, DropPoint } from '@/types'
import { BASE_FARE } from '@/lib/constants'

interface Props {
  points: DropOption[]
  selected: DropPoint | null
  onSelect: (id: DropPoint) => void
}

export function DropList({ points, selected, onSelect }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {points.map((p, i) => {
        const sel = selected === p.id
        const first = i === 0
        const last  = i === points.length - 1
        const only  = points.length === 1
        const radius = only
          ? '10px'
          : first ? '10px 10px 0 0'
          : last  ? '0 0 10px 10px'
          : '0'
        return (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: sel ? 'var(--gold-dim)' : 'var(--surface)',
              cursor: 'pointer',
              borderRadius: radius,
              position: 'relative',
              gap: 12,
              transition: 'background 0.15s',
              borderLeft: sel ? '2px solid var(--gold)' : '2px solid transparent',
            }}
          >
            {/* Check circle */}
            <div style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: sel ? 'none' : '1px solid var(--line2)',
              background: sel ? 'var(--gold)' : 'transparent',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}>
              {sel && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="#0C0C0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>

            {/* Label */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: 17,
                color: 'var(--text)',
                letterSpacing: '-0.02em',
              }}>{p.name}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, letterSpacing: '0.02em' }}>
                {p.sub}
              </div>
            </div>

            {/* Price */}
            <div style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: 22,
              color: 'var(--gold)',
              letterSpacing: '-0.03em',
              flexShrink: 0,
            }}>
              ₹{(BASE_FARE + p.extra).toLocaleString('en-IN')}
            </div>
          </div>
        )
      })}
    </div>
  )
}
