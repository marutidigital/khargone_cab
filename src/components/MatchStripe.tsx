'use client'

import React from 'react'
import type { Booking } from '@/types'
import { CheckCircle, Clock, Zap } from 'lucide-react'

interface Props {
  bookings: Booking[]
  onSelectMatch: (booking: Booking) => void
}

export function MatchStripe({ bookings, onSelectMatch }: Props) {
  if (!bookings || bookings.length === 0) return null

  return (
    <div style={{
      background: 'linear-gradient(145deg, #FFF9C4 0%, #FFF59D 100%)',
      border: '1.5px solid #FDE047',
      borderRadius: 14,
      padding: '16px 20px',
      marginBottom: 24,
      boxShadow: '0 4px 12px rgba(253,224,71,0.2)',
      animation: 'fadeInDown 0.4s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Zap size={20} color="#D97706" fill="#F59E0B" />
        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#92400E', margin: 0, letterSpacing: '-0.01em' }}>
          Available for Instant Confirmation!
        </h3>
      </div>
      
      <p style={{ fontSize: 13, color: '#B45309', marginBottom: 16, fontWeight: 500 }}>
        Other passengers have already booked these dates. Book the opposite route now for an instant confirmed match!
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {bookings.map(b => (
          <div key={b.id} style={{
            background: '#fff',
            border: '1px solid #FEF08A',
            borderRadius: 10,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', flex: 1 }}>
              <div>
                <span style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 2 }}>Route</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
                  {b.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'}
                </span>
              </div>
              
              <div>
                <span style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 2 }}>Date</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
                  {b.travel_date}
                </span>
              </div>
              

            </div>

            <button
              onClick={() => onSelectMatch(b)}
              style={{
                background: '#10B981',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 16px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 10px rgba(16,185,129,0.3)'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#059669'}
              onMouseLeave={e => e.currentTarget.style.background = '#10B981'}
            >
              <CheckCircle size={16} />
              Confirm Booking
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
