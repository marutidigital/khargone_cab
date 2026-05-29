'use client'
// src/components/Nav.tsx

import Link from 'next/link'
import { MapPin } from 'lucide-react'

export function Nav() {
  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 40px',
      height: 64,
      background: '#FFFFFF',
      borderBottom: '1px solid var(--line)',
      position: 'sticky',
      top: 0,
      zIndex: 200,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34,
          height: 34,
          background: '#111',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <MapPin size={18} fill="#FFC107" color="#FFC107" />
        </div>
        <span style={{ fontSize: 20, fontWeight: 800, color: '#111', letterSpacing: '-0.03em' }}>
          Khargone<span style={{ color: '#FFC107' }}>_Cab</span>
        </span>
      </Link>

      {/* Nav Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        <Link href="/" style={{ fontSize: 14, fontWeight: 500, color: '#111', letterSpacing: '-0.01em' }}>Home</Link>
        <Link href="#" style={{ fontSize: 14, fontWeight: 500, color: '#666', letterSpacing: '-0.01em' }}>About</Link>
        <Link href="#" style={{ fontSize: 14, fontWeight: 500, color: '#666', letterSpacing: '-0.01em' }}>Services</Link>
        <Link href="#" style={{ fontSize: 14, fontWeight: 500, color: '#666', letterSpacing: '-0.01em' }}>Help</Link>

        <button style={{
          background: '#FFC107',
          color: '#000',
          padding: '10px 26px',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: '-0.01em',
          boxShadow: '0 2px 8px rgba(255,193,7,0.35)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#F9A825'; e.currentTarget.style.transform = 'translateY(-1px)' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#FFC107'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          Sign In
        </button>
      </div>
    </nav>
  )
}
