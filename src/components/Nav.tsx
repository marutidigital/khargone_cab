'use client'
// src/components/Nav.tsx

import Link from 'next/link'

export function Nav() {
  return (
    <nav className="glass-panel" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '18px 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderRadius: '0 0 16px 16px',
      borderTop: 'none',
      marginBottom: 20,
    }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <div style={{
          fontFamily: "'Instrument Serif', serif",
          fontSize: 26,
          color: 'var(--text)',
          letterSpacing: '-0.03em',
          textShadow: '0 2px 10px rgba(0,0,0,0.5)',
        }}>
          KC<em style={{ color: 'var(--gold)', fontStyle: 'italic', textShadow: '0 0 10px var(--gold-glow)' }}>.</em>
        </div>
      </Link>
      <div style={{
        fontSize: 10,
        color: 'var(--gold)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        fontWeight: 500,
        background: 'var(--gold-dim)',
        padding: '6px 12px',
        borderRadius: 20,
        border: '1px solid var(--gold-glow)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      }}>
        Khargone ↔ Indore
      </div>
    </nav>
  )
}
