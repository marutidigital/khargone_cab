'use client'
// src/components/BookingCards.tsx

import type { Booking } from '@/types'

interface Props { bookings: Booking[] }

export function BookingCards({ bookings }: Props) {
  if (!bookings.length) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 28, opacity: 0.2, marginBottom: 10 }}>○</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
          No bookings yet.<br />Make the first one above.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {bookings.map(b => (
        <BookingCard key={b.id} b={b} />
      ))}
    </div>
  )
}

function BookingCard({ b }: { b: Booking }) {
  const confirmed = b.status === 'confirmed'
  const dirLabel  = b.direction === 'KI' ? 'Khargone → Indore' : 'Indore → Khargone'

  return (
    <div className="glass-panel" style={{
      borderRadius: 16,
      overflow: 'hidden',
      animation: 'fadeUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      marginBottom: 16,
      transition: 'transform 0.2s',
    }}
    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Head */}
      <div style={{
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10,
        borderBottom: '1px solid var(--line)',
      }}>
        <div>
          <div style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: 18,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
          }}>
            {dirLabel}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, letterSpacing: '0.02em' }}>
            ↳ {b.drop_name}{b.is_night ? ' · Night 🌙' : ''} · {b.travel_date} · {b.pickup_time}
          </div>
        </div>
        <StatusBadge status={b.status} />
      </div>

      {/* Meta */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1,
        background: 'var(--line)',
      }}>
        <MetaCell label="Passenger" value={b.passenger_name} />
        <MetaCell label="Mobile" value={b.phone} />
        <div style={{ gridColumn: 'span 2', background: 'var(--surface)', padding: '10px 14px' }}>
          <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>Amount</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: 18,
              color: 'var(--gold)',
            }}>
              ₹{b.total_fare.toLocaleString('en-IN')}
            </span>
            {b.discount > 0 && (
              <span style={{ fontSize: 11, color: 'var(--green)' }}>
                (−₹{b.discount.toLocaleString('en-IN')} early)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          flexShrink: 0,
          background: confirmed ? 'var(--green)' : 'var(--amber)',
          animation: confirmed ? 'none' : 'blink 1.4s ease-in-out infinite',
        }} />
        <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
        <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.4 }}>
          {confirmed
            ? <><strong style={{ color: 'var(--text)', fontWeight: 400 }}>Confirmed.</strong> Driver details will be shared on your mobile.</>
            : <><strong style={{ color: 'var(--text)', fontWeight: 400 }}>Waiting for opposite direction.</strong> Full refund if no match.</>
          }
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const conf = status === 'confirmed'
  return (
    <div style={{
      fontSize: 9,
      fontWeight: 500,
      padding: '4px 10px',
      borderRadius: 20,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      flexShrink: 0,
      background: conf ? 'var(--green-dim)' : 'var(--amber-dim)',
      color: conf ? 'var(--green)' : 'var(--amber)',
      border: conf ? '1px solid rgba(76,175,130,0.25)' : '1px solid rgba(212,132,58,0.25)',
    }}>
      {conf ? 'Confirmed' : 'Waiting'}
    </div>
  )
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--surface)', padding: '10px 14px' }}>
      <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text)' }}>{value}</div>
    </div>
  )
}
