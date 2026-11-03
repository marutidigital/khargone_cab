'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Users,
  Search,
  Phone,
  MessageCircle,
  Star,
  Repeat,
  Sparkles,
  Calendar,
  MapPin,
  ChevronDown,
  ChevronUp,
  Save,
  Clock,
  Car
} from 'lucide-react'
import { getAdminApiHeaders } from '@/lib/admin-api'
import { formatRs } from '@/config/pricing'

export interface CustomerRide {
  id: string
  booking_ref: string
  passenger_name: string
  phone: string
  direction: 'KI' | 'IK'
  drop_name: string
  travel_date: string
  pickup_time: string
  total_fare: number
  status: string
  created_at: string
}

export interface CustomerProfile {
  id: string
  phone: string
  name: string
  tier: 'new' | 'frequent' | 'vip'
  total_bookings: number
  completed_bookings: number
  cancelled_bookings: number
  total_spend: number
  first_booking_at: string
  last_booking_at: string
  preferred_direction: string
  preferred_drop_point: string
  tags: string[]
  notes: string | null
  rides?: CustomerRide[]
}

export function AdminCustomersPanel() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<'all' | 'vip' | 'frequent' | 'new'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [notesState, setNotesState] = useState<Record<string, string>>({})
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 3000)
  }

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const headers = await getAdminApiHeaders()
      const res = await fetch('/api/admin/customers', { headers, cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load customers')
      setCustomers(data.customers || [])

      const notesMap: Record<string, string> = {}
      for (const c of data.customers || []) {
        notesMap[c.id] = c.notes || ''
      }
      setNotesState(notesMap)
    } catch (err: any) {
      showToast(err.message || 'Could not fetch customers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCustomers()
  }, [loadCustomers])

  const handleSaveNote = async (customerId: string) => {
    setSavingNoteId(customerId)
    try {
      const headers = await getAdminApiHeaders()
      const res = await fetch('/api/admin/customers', {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: customerId, notes: notesState[customerId] || '' }),
      })
      if (!res.ok) throw new Error('Could not save note')
      showToast('Note updated successfully')
    } catch (err: any) {
      showToast(err.message || 'Failed to update note')
    } finally {
      setSavingNoteId(null)
    }
  }

  const handleUpdateTier = async (customerId: string, newTier: 'new' | 'frequent' | 'vip') => {
    try {
      const headers = await getAdminApiHeaders()
      const res = await fetch('/api/admin/customers', {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: customerId, tier: newTier }),
      })
      if (!res.ok) throw new Error('Could not update tier')
      setCustomers((prev) => prev.map((c) => (c.id === customerId ? { ...c, tier: newTier } : c)))
      showToast(`Customer tier updated to ${newTier.toUpperCase()}`)
    } catch (err: any) {
      showToast(err.message || 'Failed to update tier')
    }
  }

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (tierFilter !== 'all' && c.tier !== tierFilter) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (notesState[c.id] || '').toLowerCase().includes(q)
      )
    })
  }, [customers, search, tierFilter, notesState])

  const stats = useMemo(() => {
    const total = customers.length
    const vips = customers.filter((c) => c.tier === 'vip').length
    const frequent = customers.filter((c) => c.tier === 'frequent').length
    const totalSpend = customers.reduce((sum, c) => sum + (c.total_spend || 0), 0)
    return { total, vips, frequent, totalSpend }
  }, [customers])

  return (
    <div className="space-y-6">
      {notice && (
        <div className="fixed top-4 right-4 z-50 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-xs font-bold shadow-xl border border-slate-700 animate-in fade-in">
          {notice}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Customers
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {stats.total}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Registered in CRM</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
            Repeat Riders
          </span>
          <div className="text-2xl sm:text-3xl font-black text-amber-800 mt-1">
            {stats.frequent + stats.vips}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">2+ rides completed</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
            VIP Clients
          </span>
          <div className="text-2xl sm:text-3xl font-black text-purple-700 mt-1">
            {stats.vips}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">High frequency</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
            Total LTV Spend
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
            {formatRs(stats.totalSpend)}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Customer lifetime value</span>
        </div>
      </div>

      {/* Search & Tier Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, phone, or notes…"
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#FBBF24]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(['all', 'vip', 'frequent', 'new'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setTierFilter(tier)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tierFilter === tier
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tier === 'all' ? 'All Customers' : tier === 'vip' ? '⭐ VIP' : tier === 'frequent' ? '🔄 Repeat' : '🌱 New'}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Directory Cards */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-xs font-bold animate-pulse">
          Loading customer CRM records…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-sm text-slate-700">No customer records match your filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => {
            const isExpanded = expandedId === c.id
            const waGreeting = c.total_bookings > 1
              ? `Hi ${c.name}, thank you for riding with MarutiCab! How can we assist you with your next trip?`
              : `Hi ${c.name}, welcome to MarutiCab! How can we assist you today?`
            const waUrl = `https://wa.me/91${c.phone}?text=${encodeURIComponent(waGreeting)}`

            return (
              <div
                key={c.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-all"
              >
                {/* Header Row */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      c.tier === 'vip'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : c.tier === 'frequent'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {c.tier === 'vip' ? <Star className="w-5 h-5 fill-amber-500" /> : c.tier === 'frequent' ? <Repeat className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-base text-slate-900 truncate">{c.name}</span>
                        <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                          c.tier === 'vip'
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : c.tier === 'frequent'
                            ? 'bg-purple-50 text-purple-900 border-purple-200'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        }`}>
                          {c.tier === 'vip' ? '⭐ VIP Client' : c.tier === 'frequent' ? '🔄 Repeat Rider' : '🌱 New Customer'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          +91 {c.phone}
                        </span>
                        <span>·</span>
                        <span>{c.total_bookings} {c.total_bookings === 1 ? 'ride' : 'rides'}</span>
                        <span>·</span>
                        <span className="font-bold text-slate-900">{formatRs(c.total_spend)} lifetime spend</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Details */}
                  <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
                    {/* Tier selector */}
                    <select
                      value={c.tier}
                      onChange={(e) => handleUpdateTier(c.id, e.target.value as any)}
                      className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none"
                    >
                      <option value="new">Tier: New</option>
                      <option value="frequent">Tier: Repeat</option>
                      <option value="vip">Tier: VIP</option>
                    </select>

                    {/* WhatsApp Direct Chat */}
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                      title="Open WhatsApp chat with prefilled personalized greeting"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                      <span>Greet on WhatsApp</span>
                    </a>

                    {/* Expand History Button */}
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : c.id)}
                      className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <span>Journey ({c.rides?.length || 0})</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Journey Timeline & Notes */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5 space-y-4">
                    {/* Private Admin Notes */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Internal Customer Notes
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSaveNote(c.id)}
                          disabled={savingNoteId === c.id}
                          className="flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-900 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{savingNoteId === c.id ? 'Saving…' : 'Save Notes'}</span>
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={notesState[c.id] || ''}
                        onChange={(e) => setNotesState((prev) => ({ ...prev, [c.id]: e.target.value }))}
                        placeholder="e.g. VIP business passenger, always prefers pickup at 6 AM from Khargone bus stand…"
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Past Rides Timeline */}
                    <div>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2.5">
                        Ride History & Journey Records ({c.rides?.length || 0})
                      </span>

                      {!c.rides || c.rides.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No previous bookings found for this number.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {c.rides.map((ride) => (
                            <div
                              key={ride.id}
                              className="bg-white border border-slate-200 rounded-xl p-3 text-xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-900 flex items-center gap-1">
                                  <Car className="w-3.5 h-3.5 text-amber-600" />
                                  {ride.booking_ref}
                                </span>
                                <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
                                  {formatRs(ride.total_fare)} · {ride.status}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-slate-600">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{ride.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'} ({ride.drop_name})</span>
                              </div>

                              <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{ride.travel_date} at {ride.pickup_time}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
