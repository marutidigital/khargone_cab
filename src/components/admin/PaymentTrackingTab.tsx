'use client'
// src/components/admin/PaymentTrackingTab.tsx

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CreditCard,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  MessageCircle,
  AlertCircle,
  Car,
  MapPin,
  Calendar,
  Users,
  Check,
  X
} from 'lucide-react'
import { formatRs, PRICING_CONFIG } from '@/config/pricing'

interface TrackingEvent {
  id: string
  created_at: string
  session_id: string
  event: string
  direction: 'KI' | 'IK' | null
  vehicle: 'sedan' | 'suv' | null
  point: string | null
  travel_date: string | null
  time_slot: string | null
  price: number | null
  phone: string | null
  name: string | null
  paid: boolean
}

interface TrackingCounts {
  total: number
  paidTokens: number
  byDirection: Record<string, number>
  byVehicle: Record<string, number>
  byPoint: Record<string, number>
  byDate: Record<string, number>
}

export function PaymentTrackingTab() {
  const [events, setEvents] = useState<TrackingEvent[]>([])
  const [counts, setCounts] = useState<TrackingCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPaid, setFilterPaid] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/tracking?event=payment_screen_reached&limit=150', {
        cache: 'no-store',
      })
      const json = await res.json()
      if (json.events) setEvents(json.events)
      if (json.counts) setCounts(json.counts)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load tracking records')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Toggle paid status
  const handleTogglePaid = async (eventItem: TrackingEvent) => {
    const newStatus = !eventItem.paid
    setUpdatingId(eventItem.id)

    try {
      const res = await fetch('/api/tracking', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventItem.id, paid: newStatus }),
      })

      if (!res.ok) throw new Error('Failed to update status')

      // Optimistic update
      setEvents((prev) =>
        prev.map((e) => (e.id === eventItem.id ? { ...e, paid: newStatus } : e))
      )

      if (counts) {
        setCounts({
          ...counts,
          paidTokens: newStatus ? counts.paidTokens + 1 : Math.max(0, counts.paidTokens - 1),
        })
      }
    } catch (err: any) {
      alert(err.message || 'Could not update paid status')
    } finally {
      setUpdatingId(null)
    }
  }

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Status filter
      if (filterPaid === 'paid' && !e.paid) return false
      if (filterPaid === 'unpaid' && e.paid) return false

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchesName = e.name?.toLowerCase().includes(q)
        const matchesPhone = e.phone?.toLowerCase().includes(q)
        const matchesPoint = e.point?.toLowerCase().includes(q)
        const matchesDate = e.travel_date?.toLowerCase().includes(q)
        return matchesName || matchesPhone || matchesPoint || matchesDate
      }

      return true
    })
  }, [events, filterPaid, searchTerm])

  const totalAdvanceCollected = (counts?.paidTokens || 0) * PRICING_CONFIG.advanceDeposit

  return (
    <div className="space-y-6">
      {/* ── Heading ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-[#F5B841]" />
            Payment Leads & Token Tracker
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tracking users who reached the review/payment step, their details, and paid Rs 500 advance tokens.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all w-fit min-h-[40px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Leads</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Aggregated Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Payment Screen Reached */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Total Leads Reached
          </div>
          <div className="text-3xl font-black text-white mt-1">
            {counts?.total ?? events.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Reached confirmation screen</div>
        </div>

        {/* Paid Tokens */}
        <div className="bg-slate-800/80 border border-emerald-500/30 rounded-2xl p-4">
          <div className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            Paid Tokens (Rs 500)
          </div>
          <div className="text-3xl font-black text-emerald-400 mt-1">
            {counts?.paidTokens ?? events.filter((e) => e.paid).length}
          </div>
          <div className="text-[11px] text-emerald-500/80 mt-1">
            Total: {formatRs(totalAdvanceCollected)} collected
          </div>
        </div>

        {/* By Direction */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            By Direction
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-sm font-bold text-white">
            <span className="text-[#F5B841]">KI: {counts?.byDirection.KI || 0}</span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400">IK: {counts?.byDirection.IK || 0}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Khargone vs Indore route</div>
        </div>

        {/* By Vehicle */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            By Vehicle
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-sm font-bold text-white">
            <span>Sedan: {counts?.byVehicle.sedan || 0}</span>
            <span className="text-slate-600">|</span>
            <span>SUV: {counts?.byVehicle.suv || 0}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Economy vs Premium SUV</div>
        </div>
      </div>

      {/* ── Sub-breakdowns: Points & Upcoming Dates ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By Point breakdown */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#F5B841]" />
            Leads by Indore Location
          </h3>
          <div className="flex flex-wrap gap-2">
            {PRICING_CONFIG.points.map((p) => {
              const count = counts?.byPoint[p.id] || 0
              return (
                <div
                  key={p.id}
                  className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs flex items-center gap-2"
                >
                  <span className="text-slate-300 font-medium">{p.name}:</span>
                  <span className="font-extrabold text-[#F5B841]">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* By Travel Date breakdown */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#F5B841]" />
            Leads by Travel Date (Top Dates)
          </h3>
          <div className="flex flex-wrap gap-2">
            {counts?.byDate && Object.keys(counts.byDate).length > 0 ? (
              Object.entries(counts.byDate)
                .slice(0, 6)
                .map(([d, cnt]) => (
                  <div
                    key={d}
                    className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs flex items-center gap-2"
                  >
                    <span className="text-slate-300 font-medium">{d}:</span>
                    <span className="font-extrabold text-emerald-400">{cnt}</span>
                  </div>
                ))
            ) : (
              <span className="text-xs text-slate-500">No date bookings recorded yet</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/60 border border-slate-700 p-3 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search passenger, phone, date, point..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#F5B841]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-semibold">Token Status:</span>
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setFilterPaid('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filterPaid === 'all' ? 'bg-[#F5B841] text-slate-950' : 'text-slate-400'
              }`}
            >
              All ({events.length})
            </button>
            <button
              onClick={() => setFilterPaid('paid')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filterPaid === 'paid' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              Paid ({events.filter((e) => e.paid).length})
            </button>
            <button
              onClick={() => setFilterPaid('unpaid')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filterPaid === 'unpaid' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              Unpaid ({events.filter((e) => !e.paid).length})
            </button>
          </div>
        </div>
      </div>

      {/* ── Table of payment_screen_reached Rows ── */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-slate-900/90 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">Time Logged</th>
                <th className="py-3 px-4">Passenger Name</th>
                <th className="py-3 px-4">Phone / WhatsApp</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Travel Date & Time</th>
                <th className="py-3 px-4">Total Fare</th>
                <th className="py-3 px-4">Rs 500 Paid Token</th>
                <th className="py-3 px-4 text-right">Quick Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500">
                    No payment screen leads found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((row) => {
                  const isUpdating = updatingId === row.id
                  const formattedTime = new Date(row.created_at).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })
                  const pointConfig = PRICING_CONFIG.points.find((p) => p.id === row.point)
                  const waChatUrl = row.phone
                    ? `https://wa.me/91${row.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hi ${row.name || 'Customer'}, Hanscab here regarding your cab booking for ${row.travel_date}. Would you like to confirm your car?`
                      )}`
                    : null

                  return (
                    <tr key={row.id} className="hover:bg-slate-700/30 transition-colors">
                      {/* Logged time */}
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {formattedTime}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4 font-bold text-white">
                        {row.name || <span className="text-slate-500 italic">Not entered</span>}
                      </td>

                      {/* Phone + Consent */}
                      <td className="py-3 px-4">
                        {row.phone ? (
                          <div className="flex flex-col">
                            <span className="font-mono text-slate-200">+91 {row.phone}</span>
                            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                              <Check className="w-3 h-3" /> WhatsApp Consent
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">No consent given</span>
                        )}
                      </td>

                      {/* Direction */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.direction === 'KI'
                              ? 'bg-amber-500/20 text-[#F5B841]'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {row.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'}
                        </span>
                      </td>

                      {/* Vehicle */}
                      <td className="py-3 px-4 capitalize font-medium">
                        {row.vehicle === 'suv' ? 'Premium SUV' : 'Economy Sedan'}
                      </td>

                      {/* Point */}
                      <td className="py-3 px-4 text-slate-300">
                        {pointConfig?.name || row.point || '—'}
                      </td>

                      {/* Date & Slot */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{row.travel_date || '—'}</div>
                        <div className="text-[11px] text-slate-400">{row.time_slot || '—'}</div>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 font-bold text-white">
                        {row.price ? formatRs(row.price) : '—'}
                      </td>

                      {/* Paid Token Toggle */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleTogglePaid(row)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                            row.paid
                              ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                              : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600'
                          }`}
                        >
                          {row.paid ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Paid (Rs 500)</span>
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full bg-amber-400" />
                              <span>Mark as Paid</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Quick Contact */}
                      <td className="py-3 px-4 text-right">
                        {waChatUrl ? (
                          <a
                            href={waChatUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-current" />
                            <span>WhatsApp</span>
                          </a>
                        ) : (
                          <span className="text-slate-600 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
