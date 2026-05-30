'use client'
// src/app/admin/page.tsx — Khargone Cabs Admin Dashboard

import { useEffect, useState, useCallback, useRef } from 'react'
import type { Booking } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Driver {
  id: string
  name: string
  phone: string
  vehicle_type: string
  vehicle_number: string
  vehicle_model: string
  status: string
  rating: number
  trips_completed: number
  created_at: string
}

interface Agent {
  id: string
  name: string
  phone: string
  email: string
  area: string
  commission_pct: number
  status: string
  bookings_linked: number
  created_at: string
}

type Tab = 'dashboard' | 'bookings' | 'drivers' | 'agents' | 'analytics'

// ─── Status helpers ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  waiting:    { bg: '#FFF9E6', color: '#D97706', border: '#FCD34D' },
  confirmed:  { bg: '#ECFDF5', color: '#059669', border: '#6EE7B7' },
  cancelled:  { bg: '#FEF2F2', color: '#DC2626', border: '#FCA5A5' },
  linked:     { bg: '#EFF6FF', color: '#2563EB', border: '#93C5FD' },
  active:     { bg: '#ECFDF5', color: '#059669', border: '#6EE7B7' },
  inactive:   { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.inactive
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>{status}</span>
  )
}

// ─── Direction label ───────────────────────────────────────────────────────────

function dirLabel(d?: string) {
  if (d === 'KI') return 'Khargone → Indore'
  if (d === 'IK') return 'Indore → Khargone'
  return d || '—'
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 28, maxWidth: 520, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>{title}</h3>
          <button onClick={onClose} style={{ fontSize: 22, color: '#9CA3AF', cursor: 'pointer', lineHeight: 1, background: 'none', border: 'none' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Form Field ───────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8,
  fontSize: 14, color: '#111', background: '#FAFAFA', outline: 'none',
  fontFamily: 'Inter, sans-serif', transition: 'border-color 0.2s',
}

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: '1px solid #F0F0F0',
      padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 140px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#10B981' }}>{sub}</div>}
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, type, onDone }: { msg: string; type: 'success' | 'error'; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
      background: type === 'success' ? '#059669' : '#DC2626',
      color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500,
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)', animation: 'fadeIn 0.2s ease',
    }}>{msg}</div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ADMIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
  }, [])

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
    { id: 'bookings',  label: 'Bookings',  icon: '📋' },
    { id: 'drivers',   label: 'Drivers',   icon: '🚗' },
    { id: 'agents',    label: 'Agents',    icon: '👤' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F8FC', fontFamily: 'Inter, sans-serif' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, background: '#0F1117', display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
        boxShadow: '2px 0 20px rgba(0,0,0,0.15)',
      }}>
        {/* Brand */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: '#FFC107',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 900, color: '#000',
            }}>K</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Khargone</div>
              <div style={{ fontSize: 10, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cabs Admin</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', border: 'none',
                background: tab === t.id ? '#FFC107' : 'transparent',
                color: tab === t.id ? '#000' : '#9CA3AF',
                fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        {/* Date & Admin */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 8 }}>{dateStr}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: '#374151',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: '#D1D5DB', fontWeight: 700,
            }}>A</div>
            <div>
              <div style={{ fontSize: 12, color: '#E5E7EB', fontWeight: 600 }}>Admin User</div>
              <div style={{ fontSize: 10, color: '#6B7280' }}>Super Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main style={{ marginLeft: 220, flex: 1, padding: '28px 28px 60px', minWidth: 0 }}>
        {tab === 'dashboard' && <DashboardTab showToast={showToast} />}
        {tab === 'bookings'  && <BookingsTab  showToast={showToast} />}
        {tab === 'drivers'   && <DriversTab   showToast={showToast} />}
        {tab === 'agents'    && <AgentsTab    showToast={showToast} />}
        {tab === 'analytics' && <AnalyticsTab />}
      </main>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD TAB
// ─────────────────────────────────────────────────────────────────────────────

function DashboardTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [bRes, dRes, aRes] = await Promise.all([
        fetch('/api/admin/bookings?limit=200'),
        fetch('/api/drivers'),
        fetch('/api/agents'),
      ])
      const [bJson, dJson, aJson] = await Promise.all([bRes.json(), dRes.json(), aRes.json()])
      setBookings(bJson.bookings || [])
      setDrivers(dJson.drivers || [])
      setAgents(aJson.agents || [])
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const today = new Date().toISOString().split('T')[0]
  const todayBookings = bookings.filter(b => b.travel_date === today)
  const waitingCount  = bookings.filter(b => b.status === 'waiting').length
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length
  const revenue = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + (b.total_fare || 0), 0)
  const activeDrivers = drivers.filter(d => d.status === 'active').length
  const activeAgents = agents.filter(a => a.status === 'active').length

  // Suggestion: find unlinked waiting bookings that could be matched (opposite directions, same date)
  const waitingKI = bookings.filter(b => b.status === 'waiting' && b.direction === 'KI')
  const waitingIK = bookings.filter(b => b.status === 'waiting' && b.direction === 'IK')
  const suggestions: Array<{ b1: Booking; b2: Booking }> = []
  waitingKI.forEach(b1 => {
    const match = waitingIK.find(b2 => b2.travel_date === b1.travel_date)
    if (match && suggestions.length < 3) suggestions.push({ b1, b2: match })
  })

  const recentBookings = bookings.slice(0, 8)

  if (loading) return <LoadingSpinner />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111', letterSpacing: '-0.03em' }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>
            Welcome back — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={load} style={{
          padding: '9px 18px', background: '#FFC107', border: 'none', borderRadius: 10,
          fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#000',
        }}>⟳ Refresh</button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        <StatCard icon="📅" label="Today's Bookings"  value={todayBookings.length}                    color="#111"     sub="+8% vs yesterday" />
        <StatCard icon="💰" label="Total Revenue"      value={`₹${(revenue/1000).toFixed(1)}K`}        color="#059669"  sub="+12% vs yesterday" />
        <StatCard icon="⏳" label="Waiting"            value={waitingCount}                             color="#D97706"  sub="Needs attention" />
        <StatCard icon="✅" label="Confirmed"          value={confirmedCount}                           color="#2563EB" />
        <StatCard icon="❌" label="Cancelled"          value={cancelledCount}                           color="#DC2626" />
        <StatCard icon="🚗" label="Active Drivers"     value={activeDrivers}                            color="#7C3AED" />
        <StatCard icon="👤" label="Active Agents"      value={activeAgents}                             color="#DB2777" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Auto Ride Matching Suggestions */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F0F0F0', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>🔗 Auto Ride Matching</h2>
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Based on date, route & time</p>
            </div>
          </div>
          {suggestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CA3AF', fontSize: 13 }}>
              No matching suggestions right now
            </div>
          ) : suggestions.map(({ b1, b2 }) => (
            <SuggestionCard key={b1.id} b1={b1} b2={b2} onLink={async () => {
              await fetch('/api/admin/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ _action: 'link', id: b1.id, matched_with: b2.id }),
              })
              showToast('Bookings linked successfully!')
              load()
            }} />
          ))}
        </div>

        {/* Booking Status Pie */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F0F0F0', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 16 }}>📊 Booking Status (Today)</h2>
          <BookingStatusChart bookings={todayBookings.length ? todayBookings : bookings} />
        </div>
      </div>

      {/* Recent Bookings */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F0F0F0', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 14 }}>🕒 Recent Bookings</h2>
        <BookingsTable bookings={recentBookings} drivers={drivers} agents={agents} onAction={load} showToast={showToast} compact />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOKING STATUS CHART (Simple visual bars)
// ─────────────────────────────────────────────────────────────────────────────

function BookingStatusChart({ bookings }: { bookings: Booking[] }) {
  const total = bookings.length || 1
  const counts = {
    waiting:   bookings.filter(b => b.status === 'waiting').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  }
  const items = [
    { label: 'Waiting',   count: counts.waiting,   color: '#F59E0B' },
    { label: 'Confirmed', count: counts.confirmed,  color: '#10B981' },
    { label: 'Cancelled', count: counts.cancelled,  color: '#EF4444' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        <div style={{
          width: 120, height: 120, borderRadius: '50%',
          background: `conic-gradient(
            #F59E0B 0% ${counts.waiting/total*100}%,
            #10B981 ${counts.waiting/total*100}% ${(counts.waiting+counts.confirmed)/total*100}%,
            #EF4444 ${(counts.waiting+counts.confirmed)/total*100}% 100%
          )`,
          position: 'relative',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        }}>
          <div style={{
            position: 'absolute', inset: '20%', borderRadius: '50%', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column',
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111' }}>{bookings.length}</div>
            <div style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</div>
          </div>
        </div>
      </div>
      {items.map(it => (
        <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: it.color, flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 12, color: '#374151', fontWeight: 500 }}>{it.label}</div>
          <div style={{ fontSize: 12, color: '#9CA3AF' }}>{it.count} ({total ? Math.round(it.count/total*100) : 0}%)</div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUGGESTION CARD
// ─────────────────────────────────────────────────────────────────────────────

function SuggestionCard({ b1, b2, onLink }: { b1: Booking; b2: Booking; onLink: () => void }) {
  return (
    <div style={{
      background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 12, padding: 14,
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#FFC107' }}>#{b1.booking_ref}</div>
          <div style={{ fontSize: 12, color: '#374151' }}>{b1.passenger_name} · {dirLabel(b1.direction)}</div>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>{b1.travel_date} {b1.pickup_time}</div>
        </div>
        <div style={{ fontSize: 18 }}>↔</div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#FFC107' }}>#{b2.booking_ref}</div>
          <div style={{ fontSize: 12, color: '#374151' }}>{b2.passenger_name} · {dirLabel(b2.direction)}</div>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>{b2.travel_date} {b2.pickup_time}</div>
        </div>
      </div>
      <button onClick={onLink} style={{
        marginTop: 10, width: '100%', padding: '8px', background: '#FFC107', border: 'none',
        borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#000',
      }}>🔗 Link Rides</button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOKINGS TAB
// ─────────────────────────────────────────────────────────────────────────────

function BookingsTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [drivers,  setDrivers]  = useState<Driver[]>([])
  const [agents,   setAgents]   = useState<Agent[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDir,    setFilterDir]    = useState('all')
  const [filterDate,   setFilterDate]   = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 15

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterDir !== 'all') params.set('direction', filterDir)
      if (filterDate) params.set('date', filterDate)

      const [bRes, dRes, aRes] = await Promise.all([
        fetch(`/api/admin/bookings?${params}`),
        fetch('/api/drivers'),
        fetch('/api/agents'),
      ])
      const [bJson, dJson, aJson] = await Promise.all([bRes.json(), dRes.json(), aRes.json()])
      setBookings(bJson.bookings || [])
      setDrivers(dJson.drivers || [])
      setAgents(aJson.agents || [])
    } catch { }
    setLoading(false)
    setPage(1)
  }, [filterStatus, filterDir, filterDate])

  useEffect(() => { load() }, [load])

  const filtered = bookings.filter(b => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      b.booking_ref?.toLowerCase().includes(q) ||
      b.passenger_name?.toLowerCase().includes(q) ||
      b.phone?.includes(q) ||
      b.drop_name?.toLowerCase().includes(q)
    )
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111', letterSpacing: '-0.03em' }}>Bookings</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>{filtered.length} bookings found</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: '#fff', borderRadius: 14, border: '1px solid #F0F0F0',
        padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end',
      }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Search</label>
          <input
            placeholder="Booking ID, passenger, phone…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...selectStyle, width: 140 }}>
            <option value="all">All Status</option>
            <option value="waiting">Waiting</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Route</label>
          <select value={filterDir} onChange={e => setFilterDir(e.target.value)} style={{ ...selectStyle, width: 180 }}>
            <option value="all">All Routes</option>
            <option value="KI">Khargone → Indore</option>
            <option value="IK">Indore → Khargone</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</label>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ ...inputStyle, width: 160 }} />
        </div>
        <button onClick={() => { setFilterStatus('all'); setFilterDir('all'); setFilterDate(''); setSearch('') }} style={{
          padding: '9px 16px', background: '#F3F4F6', border: 'none', borderRadius: 8,
          fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151',
        }}>Reset</button>
        <button onClick={load} style={{
          padding: '9px 18px', background: '#FFC107', border: 'none', borderRadius: 8,
          fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#000',
        }}>Apply Filters</button>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F0F0F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {loading ? <LoadingSpinner /> : (
          <>
            <BookingsTable bookings={paginated} drivers={drivers} agents={agents} onAction={load} showToast={showToast} />
            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ padding: '14px 20px', borderTop: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                  Showing {(page-1)*PER_PAGE + 1}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                    style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 12, background: page===1?'#F9FAFB':'#fff', color: page===1?'#9CA3AF':'#374151', fontFamily:'Inter,sans-serif' }}>‹</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setPage(n)}
                      style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid ' + (page===n?'#FFC107':'#E5E7EB'), cursor: 'pointer', fontSize: 12, background: page===n?'#FFC107':'#fff', color: page===n?'#000':'#374151', fontWeight: page===n?700:400, fontFamily:'Inter,sans-serif' }}>{n}</button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                    style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 12, background: page===totalPages?'#F9FAFB':'#fff', color: page===totalPages?'#9CA3AF':'#374151', fontFamily:'Inter,sans-serif' }}>›</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOKINGS TABLE (shared between Dashboard & Bookings tab)
// ─────────────────────────────────────────────────────────────────────────────

function BookingsTable({
  bookings, drivers, agents, onAction, showToast, compact = false
}: {
  bookings: Booking[]; drivers: Driver[]; agents: Agent[]
  onAction: () => void; showToast: (m: string, t?: 'success' | 'error') => void
  compact?: boolean
}) {
  const [selected, setSelected] = useState<Booking | null>(null)
  const [modal, setModal] = useState<'assign_driver' | 'assign_agent' | 'cancel' | 'detail' | 'link' | null>(null)
  const [allBookings, setAllBookings] = useState<Booking[]>([])
  const [form, setForm] = useState<any>({})

  const openModal = async (type: typeof modal, b: Booking) => {
    setSelected(b)
    setModal(type)
    setForm({})
    if (type === 'link') {
      const res = await fetch('/api/admin/bookings?limit=200')
      const json = await res.json()
      setAllBookings(json.bookings || [])
    }
  }

  const closeModal = () => { setModal(null); setSelected(null); setForm({}) }

  const action = async (act: string, extra?: any) => {
    if (!selected) return
    const res = await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _action: act, id: selected.id, ...extra }),
    })
    const json = await res.json()
    if (json.error) { showToast(json.error, 'error'); return }
    showToast('Done!', 'success')
    closeModal()
    onAction()
  }

  if (bookings.length === 0) {
    return <div style={{ padding: '40px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>No bookings found</div>
  }

  const ths = compact
    ? ['Booking ID', 'Route', 'Passenger', 'Date & Time', 'Fare', 'Status', 'Actions']
    : ['Booking ID', 'Route', 'Date & Time', 'Passenger', 'Contact', 'Fare', 'Status', 'Actions']

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #F0F0F0' }}>
              {ths.map(h => (
                <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map(b => (
              <tr key={b.id} style={{ borderBottom: '1px solid #F9FAFB', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                  <span style={{ fontWeight: 700, color: '#FFC107', fontFamily: 'monospace' }}>#{b.booking_ref}</span>
                </td>
                <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 12, color: '#374151' }}>{dirLabel(b.direction)}</span>
                  {(b as any).drop_name && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{(b as any).drop_name}</div>}
                </td>
                {!compact && (
                  <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: 12 }}>{b.travel_date}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{b.pickup_time}</div>
                  </td>
                )}
                <td style={{ padding: '11px 16px' }}>
                  <div style={{ fontWeight: 600, color: '#111', fontSize: 13 }}>{b.passenger_name}</div>
                  {compact && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{b.travel_date} {b.pickup_time}</div>}
                </td>
                {!compact && (
                  <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: 12, color: '#374151' }}>📱 {b.phone}</div>
                  </td>
                )}
                <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                  <span style={{ fontWeight: 700, color: '#059669' }}>₹{(b.total_fare || 0).toLocaleString('en-IN')}</span>
                </td>
                <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                  <StatusBadge status={b.status} />
                </td>
                <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openModal('detail', b)} title="View Details"
                      style={{ padding: '5px 10px', fontSize: 11, borderRadius: 6, border: '1px solid #E5E7EB', cursor: 'pointer', background: '#F9FAFB', fontFamily:'Inter,sans-serif', color:'#374151' }}>👁 Detail</button>
                    <button onClick={() => openModal('assign_driver', b)} title="Assign Driver"
                      style={{ padding: '5px 10px', fontSize: 11, borderRadius: 6, border: '1px solid #E5E7EB', cursor: 'pointer', background: '#EFF6FF', fontFamily:'Inter,sans-serif', color:'#2563EB' }}>🚗 Driver</button>
                    <button onClick={() => openModal('assign_agent', b)} title="Assign Agent"
                      style={{ padding: '5px 10px', fontSize: 11, borderRadius: 6, border: '1px solid #E5E7EB', cursor: 'pointer', background: '#FAF5FF', fontFamily:'Inter,sans-serif', color:'#7C3AED' }}>👤 Agent</button>
                    {b.status !== 'cancelled' && (
                      <button onClick={() => openModal('cancel', b)} title="Cancel Booking"
                        style={{ padding: '5px 10px', fontSize: 11, borderRadius: 6, border: '1px solid #FCA5A5', cursor: 'pointer', background: '#FEF2F2', fontFamily:'Inter,sans-serif', color:'#DC2626' }}>✕ Cancel</button>
                    )}
                    <button onClick={() => openModal('link', b)} title="Link Booking"
                      style={{ padding: '5px 10px', fontSize: 11, borderRadius: 6, border: '1px solid #6EE7B7', cursor: 'pointer', background: '#ECFDF5', fontFamily:'Inter,sans-serif', color:'#059669' }}>🔗 Link</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── MODALS ── */}
      {modal === 'detail' && selected && (
        <Modal title={`Booking #${selected.booking_ref}`} onClose={closeModal}>
          <BookingDetailView b={selected} />
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 13, fontFamily:'Inter,sans-serif', background:'#F9FAFB', color:'#374151' }}>Close</button>
          </div>
        </Modal>
      )}

      {modal === 'assign_driver' && selected && (
        <Modal title="Assign Driver" onClose={closeModal}>
          <Field label="Select Driver">
            <select value={form.driver_id || ''} onChange={e => {
              const d = drivers.find(x => x.id === e.target.value)
              setForm({ driver_id: e.target.value, driver_name: d?.name || '' })
            }} style={selectStyle}>
              <option value="">Choose a driver…</option>
              {drivers.filter(d => d.status === 'active').map(d => (
                <option key={d.id} value={d.id}>{d.name} · {d.vehicle_model} ({d.vehicle_number})</option>
              ))}
            </select>
          </Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 13, fontFamily:'Inter,sans-serif', background:'#F9FAFB', color:'#374151' }}>Cancel</button>
            <button onClick={() => action('assign_driver', form)} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily:'Inter,sans-serif', background:'#FFC107', color:'#000' }}>Assign Driver</button>
          </div>
        </Modal>
      )}

      {modal === 'assign_agent' && selected && (
        <Modal title="Assign Agent" onClose={closeModal}>
          <Field label="Select Agent">
            <select value={form.agent_id || ''} onChange={e => {
              const a = agents.find(x => x.id === e.target.value)
              setForm({ agent_id: e.target.value, agent_name: a?.name || '' })
            }} style={selectStyle}>
              <option value="">Choose an agent…</option>
              {agents.filter(a => a.status === 'active').map(a => (
                <option key={a.id} value={a.id}>{a.name} · {a.area}</option>
              ))}
            </select>
          </Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 13, fontFamily:'Inter,sans-serif', background:'#F9FAFB', color:'#374151' }}>Cancel</button>
            <button onClick={() => action('assign_agent', form)} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily:'Inter,sans-serif', background:'#7C3AED', color:'#fff' }}>Assign Agent</button>
          </div>
        </Modal>
      )}

      {modal === 'cancel' && selected && (
        <Modal title="Cancel Booking" onClose={closeModal}>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ fontSize: 15, color: '#374151', marginBottom: 8 }}>
              Cancel booking <strong>#{selected.booking_ref}</strong>?
            </p>
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>
              {selected.passenger_name} · {dirLabel(selected.direction)} · {selected.travel_date}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 13, fontFamily:'Inter,sans-serif', background:'#F9FAFB', color:'#374151' }}>Keep Booking</button>
            <button onClick={() => action('cancel')} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily:'Inter,sans-serif', background:'#DC2626', color:'#fff' }}>Yes, Cancel</button>
          </div>
        </Modal>
      )}

      {modal === 'link' && selected && (
        <Modal title={`Link Booking #${selected.booking_ref}`} onClose={closeModal}>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
            Select a booking from the <strong>opposite direction</strong> to link with #{selected.booking_ref}
          </p>
          <Field label="Link With Booking">
            <select value={form.matched_with || ''} onChange={e => setForm({ matched_with: e.target.value })} style={selectStyle}>
              <option value="">Choose booking to link…</option>
              {allBookings
                .filter(b => b.id !== selected.id && b.direction !== selected.direction && b.status !== 'cancelled' && b.travel_date === selected.travel_date)
                .map(b => (
                  <option key={b.id} value={b.id}>#{b.booking_ref} · {b.passenger_name} · {dirLabel(b.direction)} · {b.travel_date}</option>
                ))}
            </select>
          </Field>
          {!allBookings.filter(b => b.id !== selected.id && b.direction !== selected.direction && b.status !== 'cancelled' && b.travel_date === selected.travel_date).length && (
            <p style={{ fontSize: 12, color: '#EF4444', marginBottom: 10 }}>No matching bookings found for the same date and opposite direction.</p>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 13, fontFamily:'Inter,sans-serif', background:'#F9FAFB', color:'#374151' }}>Cancel</button>
            <button onClick={() => action('link', form)} disabled={!form.matched_with} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', cursor: form.matched_with?'pointer':'not-allowed', fontSize: 13, fontWeight: 700, fontFamily:'Inter,sans-serif', background: form.matched_with?'#059669':'#D1FAE5', color: form.matched_with?'#fff':'#9CA3AF' }}>🔗 Link Bookings</button>
          </div>
        </Modal>
      )}
    </>
  )
}

// ─── Booking Detail View ───────────────────────────────────────────────────────

function BookingDetailView({ b }: { b: Booking }) {
  const rows: [string, string][] = [
    ['Booking Ref',  `#${b.booking_ref}`],
    ['Route',        dirLabel(b.direction)],
    ['Drop Point',   (b as any).drop_name || '—'],
    ['Date',         b.travel_date],
    ['Pickup Time',  b.pickup_time],
    ['Passenger',    b.passenger_name],
    ['Phone',        b.phone],
    ['Email',        (b as any).email || '—'],
    ['Status',       b.status],
    ['Base Fare',    `₹${(b as any).base_fare || 0}`],
    ['Discount',     `₹${(b as any).discount || 0}`],
    ['Night Extra',  `₹${(b as any).night_extra || 0}`],
    ['Total Fare',   `₹${b.total_fare}`],
    ['Created',      new Date(b.created_at).toLocaleString('en-IN')],
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ borderBottom: '1px solid #F3F4F6', paddingBottom: 8 }}>
          <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{k}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{v}</div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DRIVERS TAB
// ─────────────────────────────────────────────────────────────────────────────

function DriversTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selected, setSelected] = useState<Driver | null>(null)
  const [form, setForm] = useState<Partial<Driver>>({})
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/drivers')
      const json = await res.json()
      setDrivers(json.drivers || [])
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = drivers.filter(d => {
    const q = search.toLowerCase()
    const matchSearch = !search || d.name?.toLowerCase().includes(q) || d.phone?.includes(q) || d.vehicle_number?.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'all' || d.status === filterStatus
    return matchSearch && matchStatus
  })

  const openCreate = () => { setForm({}); setSelected(null); setModal('create') }
  const openEdit   = (d: Driver) => { setForm(d); setSelected(d); setModal('edit') }
  const openDelete = (d: Driver) => { setSelected(d); setModal('delete') }

  const save = async () => {
    const body = selected ? { _action: 'update', id: selected.id, ...form } : form
    const res = await fetch('/api/drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (json.error) { showToast(json.error, 'error'); return }
    showToast(selected ? 'Driver updated!' : 'Driver created!')
    setModal(null); load()
  }

  const del = async () => {
    if (!selected) return
    await fetch('/api/drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _action: 'delete', id: selected.id }),
    })
    showToast('Driver removed!')
    setModal(null); load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111', letterSpacing: '-0.03em' }}>Drivers</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>{filtered.length} drivers</p>
        </div>
        <button onClick={openCreate} style={{
          padding: '10px 20px', background: '#FFC107', border: 'none', borderRadius: 10,
          fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#000',
        }}>+ Add Driver</button>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #F0F0F0', padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <input placeholder="Search by name, phone, vehicle…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, maxWidth: 320 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...selectStyle, width: 140 }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Driver Cards Grid */}
      {loading ? <LoadingSpinner /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 14 }}>No drivers found. Add your first driver!</div>
          ) : filtered.map(d => (
            <div key={d.id} style={{
              background: '#fff', borderRadius: 16, border: '1px solid #F0F0F0', padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'transform 0.15s, box-shadow 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: '#FFF9E6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    border: '2px solid #FCD34D',
                  }}>🚗</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>📱 {d.phone}</div>
                  </div>
                </div>
                <StatusBadge status={d.status} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginBottom: 16 }}>
                <InfoItem label="Vehicle" value={d.vehicle_model || '—'} />
                <InfoItem label="Number" value={d.vehicle_number || '—'} />
                <InfoItem label="Type" value={d.vehicle_type || '—'} />
                <InfoItem label="Trips" value={String(d.trips_completed || 0)} />
                <InfoItem label="Rating" value={`⭐ ${d.rating || '4.5'}`} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openEdit(d)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1.5px solid #FCD34D', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: '#FFFBEB', color: '#D97706', fontFamily:'Inter,sans-serif' }}>✏️ Edit</button>
                <button onClick={() => openDelete(d)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1.5px solid #FCA5A5', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: '#FEF2F2', color: '#DC2626', fontFamily:'Inter,sans-serif' }}>🗑 Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'Add New Driver' : 'Edit Driver'} onClose={() => setModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Field label="Full Name *">
              <input value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Driver name" style={inputStyle} />
            </Field>
            <Field label="Phone *">
              <input value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="10-digit mobile" style={inputStyle} />
            </Field>
            <Field label="Vehicle Model">
              <input value={form.vehicle_model || ''} onChange={e => setForm(p => ({ ...p, vehicle_model: e.target.value }))} placeholder="e.g. Maruti Dzire" style={inputStyle} />
            </Field>
            <Field label="Vehicle Number">
              <input value={form.vehicle_number || ''} onChange={e => setForm(p => ({ ...p, vehicle_number: e.target.value }))} placeholder="e.g. MP09 AB 1234" style={inputStyle} />
            </Field>
            <Field label="Vehicle Type">
              <select value={form.vehicle_type || 'sedan'} onChange={e => setForm(p => ({ ...p, vehicle_type: e.target.value }))} style={selectStyle}>
                <option value="sedan">Sedan</option>
                <option value="suv">SUV</option>
                <option value="innova">Innova</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status || 'active'} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={selectStyle}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={() => setModal(null)} style={{ flex: 1, padding: 11, borderRadius: 8, border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 13, fontFamily:'Inter,sans-serif', background:'#F9FAFB', color:'#374151' }}>Cancel</button>
            <button onClick={save} style={{ flex: 1, padding: 11, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily:'Inter,sans-serif', background:'#FFC107', color:'#000' }}>
              {modal === 'create' ? '+ Create Driver' : '✓ Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {modal === 'delete' && selected && (
        <Modal title="Remove Driver" onClose={() => setModal(null)}>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <p style={{ fontSize: 15, color: '#374151' }}>Remove driver <strong>{selected.name}</strong>?</p>
            <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6 }}>They will be marked inactive and won't appear in assignments.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={() => setModal(null)} style={{ flex: 1, padding: 11, borderRadius: 8, border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 13, fontFamily:'Inter,sans-serif', background:'#F9FAFB', color:'#374151' }}>Keep</button>
            <button onClick={del} style={{ flex: 1, padding: 11, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily:'Inter,sans-serif', background:'#DC2626', color:'#fff' }}>Remove Driver</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENTS TAB
// ─────────────────────────────────────────────────────────────────────────────

function AgentsTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selected, setSelected] = useState<Agent | null>(null)
  const [form, setForm] = useState<Partial<Agent>>({})
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/agents')
      const json = await res.json()
      setAgents(json.agents || [])
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = agents.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !search || a.name?.toLowerCase().includes(q) || a.phone?.includes(q) || a.area?.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'all' || a.status === filterStatus
    return matchSearch && matchStatus
  })

  const openCreate = () => { setForm({ commission_pct: 10, area: 'Khargone' }); setSelected(null); setModal('create') }
  const openEdit   = (a: Agent) => { setForm(a); setSelected(a); setModal('edit') }
  const openDelete = (a: Agent) => { setSelected(a); setModal('delete') }

  const save = async () => {
    const body = selected ? { _action: 'update', id: selected.id, ...form } : form
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (json.error) { showToast(json.error, 'error'); return }
    showToast(selected ? 'Agent updated!' : 'Agent created!')
    setModal(null); load()
  }

  const del = async () => {
    if (!selected) return
    await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _action: 'delete', id: selected.id }),
    })
    showToast('Agent removed!')
    setModal(null); load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111', letterSpacing: '-0.03em' }}>Agents</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>{filtered.length} agents</p>
        </div>
        <button onClick={openCreate} style={{
          padding: '10px 20px', background: '#7C3AED', border: 'none', borderRadius: 10,
          fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#fff',
        }}>+ Add Agent</button>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #F0F0F0', padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <input placeholder="Search by name, phone, area…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, maxWidth: 320 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...selectStyle, width: 140 }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Agent Cards */}
      {loading ? <LoadingSpinner /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 14 }}>No agents found. Add your first agent!</div>
          ) : filtered.map(a => (
            <div key={a.id} style={{
              background: '#fff', borderRadius: 16, border: '1px solid #F0F0F0', padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'transform 0.15s, box-shadow 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: '#F5F3FF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    border: '2px solid #DDD6FE',
                  }}>👤</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>📱 {a.phone}</div>
                  </div>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginBottom: 16 }}>
                <InfoItem label="Area" value={a.area || '—'} />
                <InfoItem label="Commission" value={`${a.commission_pct || 10}%`} />
                <InfoItem label="Email" value={a.email || '—'} />
                <InfoItem label="Bookings Linked" value={String(a.bookings_linked || 0)} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openEdit(a)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1.5px solid #DDD6FE', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: '#F5F3FF', color: '#7C3AED', fontFamily:'Inter,sans-serif' }}>✏️ Edit</button>
                <button onClick={() => openDelete(a)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1.5px solid #FCA5A5', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: '#FEF2F2', color: '#DC2626', fontFamily:'Inter,sans-serif' }}>🗑 Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'Add New Agent' : 'Edit Agent'} onClose={() => setModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Field label="Full Name *">
              <input value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Agent name" style={inputStyle} />
            </Field>
            <Field label="Phone *">
              <input value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="10-digit mobile" style={inputStyle} />
            </Field>
            <Field label="Email">
              <input value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="agent@email.com" type="email" style={inputStyle} />
            </Field>
            <Field label="Area / Zone">
              <input value={form.area || ''} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} placeholder="e.g. Khargone City" style={inputStyle} />
            </Field>
            <Field label="Commission (%)">
              <input value={form.commission_pct || ''} onChange={e => setForm(p => ({ ...p, commission_pct: Number(e.target.value) }))} placeholder="e.g. 10" type="number" min="0" max="50" style={inputStyle} />
            </Field>
            <Field label="Status">
              <select value={form.status || 'active'} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={selectStyle}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={() => setModal(null)} style={{ flex: 1, padding: 11, borderRadius: 8, border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 13, fontFamily:'Inter,sans-serif', background:'#F9FAFB', color:'#374151' }}>Cancel</button>
            <button onClick={save} style={{ flex: 1, padding: 11, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily:'Inter,sans-serif', background:'#7C3AED', color:'#fff' }}>
              {modal === 'create' ? '+ Create Agent' : '✓ Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {modal === 'delete' && selected && (
        <Modal title="Remove Agent" onClose={() => setModal(null)}>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <p style={{ fontSize: 15, color: '#374151' }}>Remove agent <strong>{selected.name}</strong>?</p>
            <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6 }}>They will be marked inactive.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={() => setModal(null)} style={{ flex: 1, padding: 11, borderRadius: 8, border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 13, fontFamily:'Inter,sans-serif', background:'#F9FAFB', color:'#374151' }}>Keep</button>
            <button onClick={del} style={{ flex: 1, padding: 11, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily:'Inter,sans-serif', background:'#DC2626', color:'#fff' }}>Remove Agent</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS TAB
// ─────────────────────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/bookings?limit=500')
        const json = await res.json()
        setBookings(json.bookings || [])
      } catch { }
      setLoading(false)
    })()
  }, [])

  if (loading) return <LoadingSpinner />

  const total   = bookings.length
  const revenue = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + (b.total_fare || 0), 0)
  const avgFare = total ? Math.round(revenue / total) : 0

  // Route stats
  const ki = bookings.filter(b => b.direction === 'KI').length
  const ik = bookings.filter(b => b.direction === 'IK').length
  const routes = [
    { label: 'Khargone → Indore', count: ki, color: '#FFC107', pct: total ? Math.round(ki/total*100) : 0 },
    { label: 'Indore → Khargone', count: ik, color: '#3B82F6', pct: total ? Math.round(ik/total*100) : 0 },
  ]

  // Status breakdown
  const statuses = ['waiting', 'confirmed', 'cancelled'].map(s => ({
    label: s, count: bookings.filter(b => b.status === s).length,
    color: STATUS_COLORS[s]?.color || '#000',
    bg: STATUS_COLORS[s]?.bg || '#F3F4F6',
  }))

  // Revenue by day (last 7 days)
  const days: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    days[key] = 0
  }
  bookings.filter(b => b.status !== 'cancelled').forEach(b => {
    if (days[b.travel_date] !== undefined) {
      days[b.travel_date] += b.total_fare || 0
    }
  })
  const dayEntries = Object.entries(days)
  const maxRev = Math.max(...dayEntries.map(([, v]) => v), 1)

  // Top routes by drop point
  const dropCounts: Record<string, number> = {}
  bookings.forEach(b => {
    const k = (b as any).drop_name || 'Other'
    dropCounts[k] = (dropCounts[k] || 0) + 1
  })
  const topDrops = Object.entries(dropCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxDrop = Math.max(...topDrops.map(([, v]) => v), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111', letterSpacing: '-0.03em' }}>Analytics</h1>
        <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Insights based on all bookings data</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        <StatCard icon="🎟️" label="Total Bookings"   value={total}                                       color="#111" />
        <StatCard icon="💰" label="Total Revenue"      value={`₹${revenue.toLocaleString('en-IN')}`}      color="#059669" />
        <StatCard icon="📈" label="Average Fare"       value={`₹${avgFare.toLocaleString('en-IN')}`}      color="#7C3AED" />
        <StatCard icon="✅" label="Completion Rate"    value={`${total ? Math.round(bookings.filter(b=>b.status==='confirmed').length/total*100) : 0}%`} color="#2563EB" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Revenue Chart */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F0F0F0', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 18 }}>📈 Revenue (Last 7 Days)</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140 }}>
            {dayEntries.map(([date, rev]) => (
              <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>
                  {rev > 0 ? `₹${(rev/1000).toFixed(1)}k` : '—'}
                </div>
                <div style={{
                  width: '100%', background: rev > 0 ? '#FFC107' : '#F3F4F6',
                  borderRadius: '4px 4px 0 0',
                  height: `${(rev / maxRev) * 100}px`,
                  minHeight: 4,
                  transition: 'height 0.3s ease',
                }} />
                <div style={{ fontSize: 9, color: '#9CA3AF', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Route Distribution */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F0F0F0', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 18 }}>🗺️ Route Distribution</h2>
          {routes.map(r => (
            <div key={r.label} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{r.count} ({r.pct}%)</span>
              </div>
              <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${r.pct}%`, background: r.color, borderRadius: 4, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          ))}

          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Status Breakdown</h3>
            {statuses.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: '#374151', textTransform: 'capitalize' }}>{s.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{s.count}</span>
                <span style={{ fontSize: 11, color: '#9CA3AF', minWidth: 36, textAlign: 'right' }}>
                  {total ? Math.round(s.count/total*100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Drop Points */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F0F0F0', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 18 }}>📍 Top Drop Points</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {topDrops.map(([name, count]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 120, fontSize: 13, color: '#374151', fontWeight: 500, flexShrink: 0 }}>{name}</div>
              <div style={{ flex: 1, height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${count/maxDrop*100}%`, background: '#FFC107', borderRadius: 4, transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ width: 40, textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#111' }}>{count}</div>
            </div>
          ))}
          {topDrops.length === 0 && <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '20px 0' }}>No data yet</div>}
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{value}</div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        border: '3px solid #F3F4F6', borderTopColor: '#FFC107',
        animation: 'spin 0.7s linear infinite',
      }} />
      <span style={{ fontSize: 14, color: '#9CA3AF' }}>Loading…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity:0; transform:translateY(6px);} to {opacity:1;transform:translateY(0);} }`}</style>
    </div>
  )
}
