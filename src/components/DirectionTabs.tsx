'use client'
// src/components/DirectionTabs.tsx

import type { Direction } from '@/types'

interface Props {
  dir: Direction
  onChange: (d: Direction) => void
}

export function DirectionTabs({ dir, onChange }: Props) {
  return (
    <div className="glass-panel" style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      borderRadius: 12,
      margin: '0 20px',
      overflow: 'hidden',
    }}>
      {(['KI', 'IK'] as Direction[]).map((d, i) => {
        const active = dir === d
        const city   = d === 'KI' ? 'Khargone' : 'Indore'
        const sub    = d === 'KI' ? '→ Indore' : '→ Khargone'
        return (
          <button
            key={d}
            onClick={() => onChange(d)}
            style={{
              padding: '16px 20px',
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: active ? 'var(--gold)' : 'var(--muted)',
              cursor: 'pointer',
              border: 'none',
              background: active ? 'var(--surface-hover)' : 'transparent',
              fontFamily: "'Geist Mono', monospace",
              textAlign: 'left',
              borderRight: i === 0 ? '1px solid var(--line)' : 'none',
              position: 'relative',
              transition: 'all 0.3s ease',
            }}
          >
            <span style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: 18,
              display: 'block',
              marginBottom: 4,
              letterSpacing: '-0.02em',
              color: active ? 'var(--text)' : 'inherit',
            }}>{city}</span>
            {sub}
            {active && (
              <span style={{
                position: 'absolute',
                bottom: 0,
                left: '15%',
                right: '15%',
                height: 2,
                background: 'var(--gold)',
                boxShadow: '0 -2px 10px var(--gold-glow)',
                borderRadius: '2px 2px 0 0',
              }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
