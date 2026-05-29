'use client'
// src/app/admin/page.tsx

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Booking } from '@/types'

export default function AdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filter, setFilter]     = useState<'all' | 'waiting' | 'confirmed'>('all')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      let q = supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(100)
      if (filter !== 'all') q = q.eq('status', filter)
      const { data } = await q
      if (data) setBookings(data as Booking[])
      setLoading(false)
    }
    load()

    // Realtime subscription
    const sub = supabase
      .channel('admin-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [filter])

  const waiting   = bookings.filter(b => b.status === 'waiting').length
  const confirmed = bookings.filter(b => b.status === 'confirmed').length
  const revenue   = bookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + b.total_fare, 0)

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    background: active ? 'var(--gold-dim)' : 'transparent',
    border: active ? '1px solid var(--gold)' : '1px solid var(--line)',
    borderRadius: 8,
    fontSize: 11,
    color: active ? 'var(--gold)' : 'var(--muted)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: "'Geist Mono', monospace",
    transition: 'all 0.15s',
  })

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, letterSpacing: '-0.03em' }}>
          KC<em style={{ color: 'var(--gold)' }}>.</em> Admin
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Khargone Cabs
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
        <StatCard label="Waiting" value={waiting} color="var(--amber)" />
        <StatCard label="Confirmed" value={confirmed} color="var(--green)" />
        <StatCard label="Revenue" value={`₹${revenue.toLocaleString('en-IN')}`} color="var(--gold)" />
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['all', 'waiting', 'confirmed'] as const).map(f => (
          <button key={f} style={tabStyle(filter === f)} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading…</div>
      ) : bookings.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No bookings found.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {bookings.map(b => <AdminRow key={b.id} b={b} />)}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--line)', padding: '16px' }}>
      <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, color, letterSpacing: '-0.03em' }}>{value}</div>
    </div>
  )
}

function AdminRow({ b }: { b: Booking }) {
  const dir = b.direction === 'KI' ? 'KHG → IDR' : 'IDR → KHG'
  const conf = b.status === 'confirmed'
  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 10,
      border: '1px solid var(--line)',
      padding: '12px 16px',
      display: 'grid',
      gridTemplateColumns: '80px 1fr 1fr 100px 80px 80px',
      gap: 12,
      alignItems: 'center',
      fontSize: 12,
    }}>
      <span style={{ color: 'var(--gold)', fontFamily: "'Geist Mono', monospace" }}>{b.booking_ref}</span>
      <span style={{ color: 'var(--text)' }}>{b.passenger_name} · {b.phone}</span>
      <span style={{ color: 'var(--muted)' }}>{dir} · {b.drop_name}</span>
      <span style={{ color: 'var(--text)' }}>{b.travel_date} {b.pickup_time}</span>
      <span style={{ color: 'var(--gold)', fontFamily: "'Instrument Serif', serif", fontSize: 16 }}>
        ₹{b.total_fare.toLocaleString('en-IN')}
      </span>
      <span style={{
        padding: '3px 8px',
        borderRadius: 20,
        fontSize: 9,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        background: conf ? 'var(--green-dim)' : 'var(--amber-dim)',
        color: conf ? 'var(--green)' : 'var(--amber)',
        border: conf ? '1px solid rgba(76,175,130,0.25)' : '1px solid rgba(212,132,58,0.25)',
        textAlign: 'center',
      }}>
        {b.status}
      </span>
    </div>
  )
}
