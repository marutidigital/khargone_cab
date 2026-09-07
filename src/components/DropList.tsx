'use client'
// src/components/DropList.tsx

import type { DropOption, DropPoint } from '@/types'

interface Props {
  points: DropOption[]
  selected: DropPoint | null
  onSelect: (id: DropPoint) => void
}

export function DropList({ points, selected, onSelect }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {points.map(p => {
        const sel = selected === p.id
        return (
          <button
            type="button"
            key={p.id}
            onClick={() => onSelect(p.id)}
            aria-pressed={sel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 16px',
              background: sel ? '#FFFDE7' : '#fff',
              border: sel ? '1.5px solid #FFC107' : '1.5px solid #E8E8E8',
              borderRadius: 10,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              boxShadow: sel ? '0 2px 10px rgba(255,193,7,0.12)' : 'none',
              width: '100%',
              textAlign: 'left',
            }}
            onMouseEnter={e => { if (!sel) e.currentTarget.style.borderColor = '#CCC' }}
            onMouseLeave={e => { if (!sel) e.currentTarget.style.borderColor = '#E8E8E8' }}
          >
            {/* Radio dot */}
            <div style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: sel ? '2px solid #FFC107' : '2px solid #CCC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: '#fff',
              transition: 'all 0.15s',
            }}>
              {sel && (
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFC107' }} />
              )}
            </div>

            {/* Label */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111', letterSpacing: '-0.01em' }}>
                {p.name}
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{p.sub}</div>
            </div>

            {/* Extra price badge */}
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              color: p.extra === 0 ? '#22C55E' : '#F59E0B',
              background: p.extra === 0 ? '#F0FDF4' : '#FFFBEB',
              border: `1px solid ${p.extra === 0 ? '#BBF7D0' : '#FDE68A'}`,
              padding: '4px 10px',
              borderRadius: 20,
              letterSpacing: '-0.01em',
            }}>
              {p.extra === 0 ? '+₹0' : `+₹${p.extra}`}
            </div>
          </button>
        )
      })}
    </div>
  )
}
