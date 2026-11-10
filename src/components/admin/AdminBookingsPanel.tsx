'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CarFront,
  ExternalLink,
  RefreshCw,
  Search,
  Clock,
  Edit3,
  Layers,
  Table as TableIcon,
  CheckCircle2,
  AlertCircle,
  Car,
  User,
  ArrowRight,
} from 'lucide-react'
import { getAdminApiHeaders } from '@/lib/admin-api'
import { formatRs } from '@/config/pricing'
import type { Booking, BookingStatus } from '@/types'
import { MatchDealBoard } from '@/components/admin/MatchDealBoard'
import { BookingWhatsAppLog } from '@/components/admin/BookingWhatsAppLog'
import { EditTimeModal } from '@/components/admin/EditTimeModal'
import { AssignDriverModal } from '@/components/admin/AssignDriverModal'

const STATUS_OPTIONS: BookingStatus[] = ['waiting', 'confirmed', 'completed', 'cancelled']

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending_payment: 'bg-slate-50 text-slate-700 border-slate-200',
  waiting: 'bg-amber-50 text-amber-800 border-amber-200',
  matched: 'bg-sky-50 text-sky-800 border-sky-200',
  confirmed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  no_match_decision: 'bg-orange-50 text-orange-800 border-orange-200',
  completed: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  refunded: 'bg-violet-50 text-violet-800 border-violet-200',
  cancelled: 'bg-rose-50 text-rose-800 border-rose-200',
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `91${digits}` : digits
}

export function AdminBookingsPanel() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped')
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string; phone?: string; vehicle_number: string; vehicle_model?: string; status?: string }>>([])
  const [vehicles, setVehicles] = useState<any[]>([])

  // Modals & notes state
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [assigningMatch, setAssigningMatch] = useState<any | null>(null)
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({})
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null)

  const handleSaveNote = async (bookingId: string) => {
    setSavingNoteId(bookingId)
    setNotice(null)
    setError(null)
    try {
      const headers = await getAdminApiHeaders()
      const noteText = notesDrafts[bookingId] ?? ''
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _action: 'save_note',
          id: bookingId,
          notes: noteText,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Could not save note.')
      setNotice('Booking note saved successfully.')
      await loadBookings()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save note.')
    } finally {
      setSavingNoteId(null)
    }
  }

  const loadBookings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await getAdminApiHeaders()
      const [response, driverResponse, vehicleResponse] = await Promise.all([
        fetch('/api/admin/bookings?limit=500', { headers, cache: 'no-store' }),
        fetch('/api/drivers?status=active', { headers, cache: 'no-store' }),
        fetch('/api/admin/vehicles', { headers, cache: 'no-store' }),
      ])
      const [result, driverResult, vehicleResult] = await Promise.all([
        response.json(),
        driverResponse.json(),
        vehicleResponse.json(),
      ])
      if (!response.ok || !driverResponse.ok) {
        throw new Error(result.error || driverResult.error || 'Could not load bookings.')
      }
      setBookings(result.bookings || [])
      setMatches(result.matches || [])
      setDrivers(driverResult.drivers || [])
      setVehicles(vehicleResult.vehicles || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load bookings.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadBookings() }, [loadBookings])

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase()
    const list = bookings.filter((booking) => {
      if (statusFilter !== 'all' && booking.status !== statusFilter) return false
      if (!query) return true
      return [booking.booking_ref, booking.passenger_name, booking.phone, booking.drop_name]
        .some((value) => value?.toLowerCase().includes(query))
    })

    return list.sort((a, b) => {
      const getRank = (bkg: Booking) => {
        if (bkg.status === 'waiting') return 0
        if (bkg.status === 'confirmed' || bkg.status === 'matched') {
          return bkg.driver_id ? 2 : 1
        }
        return 3
      }
      const rankDiff = getRank(a) - getRank(b)
      if (rankDiff !== 0) return rankDiff
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
      return timeB - timeA
    })
  }, [bookings, search, statusFilter])

  // Group bookings into Pairs and Unpaired
  const { pairedGroups, unpairedBookings } = useMemo(() => {
    const bookingMap = new Map(bookings.map((b) => [b.id, b]))
    const pairedBookingIds = new Set<string>()

    const pairs: Array<{
      match: any
      bookingOut: Booking | null
      bookingBack: Booking | null
      driver: any | null
      isDriverPending: boolean
    }> = []

    for (const m of matches) {
      const bOut = bookingMap.get(m.booking_out) || null
      const bBack = bookingMap.get(m.booking_back) || null

      if (bOut) pairedBookingIds.add(bOut.id)
      if (bBack) pairedBookingIds.add(bBack.id)

      // Only include if at least one booking matches search/status filters
      const matchesSearch = (b: Booking | null) => {
        if (!b) return false
        if (statusFilter !== 'all' && b.status !== statusFilter) return false
        if (!search.trim()) return true
        const q = search.trim().toLowerCase()
        return [b.booking_ref, b.passenger_name, b.phone, b.drop_name].some((v) => v?.toLowerCase().includes(q))
      }

      if (!search.trim() && statusFilter === 'all') {
        if (bOut || bBack) {
          const isPending = !m.driver_id && ((bOut?.status === 'confirmed') || (bBack?.status === 'confirmed'))
          pairs.push({
            match: m,
            bookingOut: bOut,
            bookingBack: bBack,
            driver: m.drivers || drivers.find((d) => d.id === m.driver_id) || null,
            isDriverPending: isPending,
          })
        }
      } else {
        if (matchesSearch(bOut) || matchesSearch(bBack)) {
          const isPending = !m.driver_id && ((bOut?.status === 'confirmed') || (bBack?.status === 'confirmed'))
          pairs.push({
            match: m,
            bookingOut: bOut,
            bookingBack: bBack,
            driver: m.drivers || drivers.find((d) => d.id === m.driver_id) || null,
            isDriverPending: isPending,
          })
        }
      }
    }

    const unpaired = filteredBookings.filter((b) => !pairedBookingIds.has(b.id) && !b.match_id)

    return { pairedGroups: pairs, unpairedBookings: unpaired }
  }, [bookings, matches, drivers, filteredBookings, search, statusFilter])

  // Active waiting bookings (excluding refunded/cancelled so they never clutter top queues!)
  const activeUnpaired = useMemo(() => {
    return unpairedBookings.filter((b) => b.status === 'waiting')
  }, [unpairedBookings])

  // Dedicated list of refunded bookings (displayed at the bottom with explicit "Refund Done" & note options)
  const refundedBookings = useMemo(() => {
    return bookings.filter((b) => b.status === 'refunded' || b.refund_status === 'processed')
  }, [bookings])

  const updateStatus = async (booking: Booking, status: BookingStatus) => {
    setSavingId(booking.id)
    setNotice(null)
    setError(null)
    try {
      const headers = await getAdminApiHeaders()
      const action = status === 'cancelled' ? 'cancel' : status === 'completed' ? 'complete' : 'update_status'
      const response = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: action, id: booking.id, status }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not update booking.')
      setNotice(`${booking.booking_ref} status updated to ${status}.`)
      await loadBookings()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update booking.')
    } finally {
      setSavingId(null)
    }
  }

  const assignDriver = async (booking: Booking, driverId: string) => {
    setSavingId(booking.id)
    setNotice(null)
    setError(null)
    try {
      const headers = await getAdminApiHeaders()
      const response = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'assign_driver', id: booking.id, driver_id: driverId || null }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not assign driver.')
      setNotice(`Driver assigned to ${booking.booking_ref}. Customer notified via WhatsApp.`)
      await loadBookings()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not assign driver.')
    } finally {
      setSavingId(null)
    }
  }

  const sendInChatPayment = async (booking: Booking, testAmount?: number, testCoupon?: string) => {
    setSavingId(booking.id)
    setNotice(null)
    setError(null)
    try {
      const headers = await getAdminApiHeaders()
      const response = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _action: 'send_payment_link',
          id: booking.id,
          phone: booking.phone,
          ...(testAmount ? { test_amount: testAmount, coupon: testCoupon } : {}),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not send WhatsApp payment order.')
      setNotice(`WhatsApp UPI payment order sent to ${booking.phone} (${booking.passenger_name})!`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send payment order.')
    } finally {
      setSavingId(null)
    }
  }

  const refundBooking = async (booking: Booking) => {
    setSavingId(booking.id)
    setNotice(null)
    setError(null)
    try {
      const headers = await getAdminApiHeaders()
      const response = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'refund', id: booking.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not request refund.')
      setNotice(`${booking.booking_ref} refund status: ${result.status}.`)
      await loadBookings()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not request refund.')
    } finally {
      setSavingId(null)
    }
  }

  const handleQuickPairBookings = async (b1: Booking, b2: Booking) => {
    const outBooking = b1.direction === 'KI' ? b1 : b2
    const backBooking = b1.direction === 'KI' ? b2 : b1
    if (!window.confirm(`Pair #${outBooking.booking_ref} (${outBooking.passenger_name}) with #${backBooking.booking_ref} (${backBooking.passenger_name}) as confirmed round trip?`)) return
    try {
      const res = await fetch('/api/admin/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_out_id: outBooking.id,
          booking_back_id: backBooking.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to pair bookings.')
      setNotice(`Round-trip match confirmed for #${outBooking.booking_ref} and #${backBooking.booking_ref}!`)
      await loadBookings()
    } catch (err: any) {
      setError(err?.message || 'Error pairing bookings')
    }
  }

  const handleRefundAllExpired = async () => {
    if (!window.confirm('Process refund for all waiting bookings whose cutoff time / travel date has passed?')) return
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'refund_all_expired' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to refund expired bookings.')
      setNotice(data.message || 'Expired bookings refunded successfully.')
      await loadBookings()
    } catch (err: any) {
      setError(err?.message || 'Error processing refunds')
    }
  }

  const countByStatus = (status: BookingStatus) => bookings.filter((booking) => booking.status === status).length

  return (
    <section className="space-y-5">
      <MatchDealBoard />

      {/* Top Status Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
            className={`rounded-2xl border bg-white p-4 text-left transition hover:border-amber-300 ${
              statusFilter === status ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'
            }`}
          >
            <span className="block text-xs font-semibold capitalize text-slate-500">{status} bookings</span>
            <span className="mt-1 block text-2xl font-black text-slate-900">{countByStatus(status)}</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Controls Bar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Bookings & Dispatch</h2>
            <p className="mt-1 text-xs text-slate-500">
              Manage individual and paired round-trip bookings, edit pickup schedules, and assign drivers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'grouped' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>Grouped Pairs ({pairedGroups.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('flat')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'flat' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5 text-slate-600" />
                <span>Flat List ({filteredBookings.length})</span>
              </button>
            </div>

            <label className="relative min-w-[180px] flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, phone or ref"
                className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-amber-400 font-medium"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | BookingStatus)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold"
              aria-label="Filter bookings by status"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void loadBookings()}
              disabled={loading}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {error && <p role="alert" className="mx-4 mt-4 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 sm:mx-5">{error}</p>}
        {notice && <p role="status" className="mx-4 mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 sm:mx-5">{notice}</p>}

        {/* ── VIEW 1: GROUPED BY ROUND-TRIP PAIRS ── */}
        {viewMode === 'grouped' ? (
          <div className="p-4 sm:p-5 space-y-6">
            {/* Section A: Confirmed Round-Trip Pairs */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Confirmed Round-Trip Pairs ({pairedGroups.length})</span>
                </h3>
                <span className="text-xs text-slate-500">Khargone ⇄ Indore matched pairs with single shared driver</span>
              </div>

              {pairedGroups.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500">
                  No confirmed round-trip pairs found with current filters.
                </div>
              ) : (
                <div className="space-y-4">
                  {pairedGroups.map(({ match, bookingOut, bookingBack, driver, isDriverPending }) => {
                    const matchModel = {
                      id: match.id,
                      booking_out: bookingOut,
                      booking_back: bookingBack,
                      drivers: driver,
                      vehicle_id: match.vehicle_id,
                    }

                    return (
                      <div
                        key={match.id}
                        className={`rounded-2xl border transition shadow-xs overflow-hidden ${
                          isDriverPending
                            ? 'bg-rose-50/40 border-rose-300'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Pair Header */}
                        <div className="p-3.5 sm:p-4 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="rounded-lg bg-amber-400 text-slate-950 px-2 py-0.5 text-[10px] font-black uppercase">
                              🔄 Round-Trip Match
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-600">
                              #{String(match.id).slice(0, 8)}
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs font-semibold text-slate-600">
                              {bookingOut?.travel_date || bookingBack?.travel_date}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {driver ? (
                              <div className="flex items-center gap-1.5 bg-emerald-100/80 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-xl text-xs font-bold">
                                <Car className="w-3.5 h-3.5 text-emerald-700" />
                                <span>{driver.name} ({driver.phone}) · {driver.vehicle_number || 'Dzire'}</span>
                              </div>
                            ) : (
                              <span className="flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-xl text-[11px] font-black animate-pulse">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Driver & Car Pending
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => setAssigningMatch(matchModel)}
                              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition"
                            >
                              <Car className="w-3.5 h-3.5" />
                              <span>{driver ? 'Reassign Driver & Car' : 'Assign Driver & Car to Both'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Connected Trips (2 Columns) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                          {/* Leg 1: Outward */}
                          <div className="p-4 space-y-2.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-slate-900 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                <span>Trip 1: Khargone ➔ Indore</span>
                              </span>
                              {bookingOut && (
                                <button
                                  type="button"
                                  onClick={() => setEditingBooking(bookingOut)}
                                  className="text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Edit Time</span>
                                </button>
                              )}
                            </div>

                            {bookingOut ? (
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                                <div className="flex justify-between font-bold">
                                  <span className="text-slate-900 font-extrabold">#{bookingOut.booking_ref} · {bookingOut.passenger_name}</span>
                                  <span className="text-amber-900">
                                    {bookingOut.travel_date} at {String(bookingOut.pickup_time).slice(0, 5)}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-600 flex justify-between">
                                  <span>📞 {bookingOut.phone}</span>
                                  <span>Drop: {bookingOut.drop_name}</span>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 text-[11px]">
                                  <span className="font-bold text-slate-700">Fare: {formatRs(bookingOut.total_fare)}</span>
                                  <span className="text-emerald-700 font-bold">Adv: {formatRs(bookingOut.advance_paid || 500)}</span>
                                  <span className="text-slate-900 font-black">
                                    Collect: {formatRs(bookingOut.balance_amount || Math.max(0, bookingOut.total_fare - 500))}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-400 italic p-3">Trip 1 details missing</div>
                            )}
                          </div>

                          {/* Leg 2: Return */}
                          <div className="p-4 space-y-2.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-slate-900 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span>Trip 2 (Return): Indore ➔ Khargone</span>
                              </span>
                              {bookingBack && (
                                <button
                                  type="button"
                                  onClick={() => setEditingBooking(bookingBack)}
                                  className="text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Edit Time</span>
                                </button>
                              )}
                            </div>

                            {bookingBack ? (
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                                <div className="flex justify-between font-bold">
                                  <span className="text-slate-900 font-extrabold">#{bookingBack.booking_ref} · {bookingBack.passenger_name}</span>
                                  <span className="text-amber-900">
                                    {bookingBack.travel_date} at {String(bookingBack.pickup_time).slice(0, 5)}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-600 flex justify-between">
                                  <span>📞 {bookingBack.phone}</span>
                                  <span>Drop: {bookingBack.drop_name}</span>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 text-[11px]">
                                  <span className="font-bold text-slate-700">Fare: {formatRs(bookingBack.total_fare)}</span>
                                  <span className="text-emerald-700 font-bold">Adv: {formatRs(bookingBack.advance_paid || 500)}</span>
                                  <span className="text-slate-900 font-black">
                                    Collect: {formatRs(bookingBack.balance_amount || Math.max(0, bookingBack.total_fare - 500))}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-400 italic p-3">Trip 2 details missing</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Section B: Single / Waiting Bookings (Looking for Match) */}
            <div className="border-t border-slate-200 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span>Unpaired & Waiting Bookings ({activeUnpaired.length})</span>
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {activeUnpaired.some((b) => b.status === 'waiting' && b.travel_date < new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())) && (
                    <button
                      type="button"
                      onClick={handleRefundAllExpired}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold px-3 py-1 rounded-xl text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      💸 Refund All Expired Rides
                    </button>
                  )}
                  <span className="text-xs text-slate-500">Active bookings waiting to be matched</span>
                </div>
              </div>

              {activeUnpaired.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-400">
                  No active waiting bookings right now. All rides are either matched or settled!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeUnpaired.map((b) => {
                    const isKI = b.direction === 'KI'
                    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
                    const isDatePassed = b.travel_date && b.travel_date < todayStr
                    const compatibleOpposite = activeUnpaired.find(
                      (other) => other.id !== b.id && other.status === 'waiting' && other.direction !== b.direction
                    )

                    return (
                      <div
                        key={b.id}
                        className="bg-white border border-slate-200 rounded-2xl p-4 text-xs space-y-2 hover:border-amber-300 transition shadow-xs"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-black text-slate-900 text-sm">#{b.booking_ref} · {b.passenger_name}</span>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {isKI ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'} · {b.drop_name}
                            </div>
                          </div>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${STATUS_STYLES[b.status]}`}>
                            {b.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="font-bold text-slate-700 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>{b.travel_date} at {String(b.pickup_time).slice(0, 5)}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingBooking(b)}
                            className="text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100 px-2 py-0.5 rounded-lg flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit Time</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                          <span>Total: <strong>{formatRs(b.total_fare)}</strong></span>
                          <span>Adv: <strong className="text-emerald-700">{formatRs(b.advance_paid || 500)}</strong></span>
                          <span>Balance: <strong>{formatRs(b.balance_amount || Math.max(0, b.total_fare - 500))}</strong></span>
                        </div>

                        {/* Quick Manual Pair Action Button */}
                        {b.status === 'waiting' && compatibleOpposite && (
                          <div className="pt-2 border-t border-emerald-100 flex items-center justify-between gap-2 flex-wrap bg-emerald-50/50 p-2 rounded-xl">
                            <span className="text-[10px] font-bold text-emerald-900">
                              ⚡ Return match available: #{compatibleOpposite.booking_ref}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleQuickPairBookings(b, compatibleOpposite)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Pair with #{compatibleOpposite.booking_ref}</span>
                            </button>
                          </div>
                        )}

                        {/* Expired / Cutoff Passed Refund Button */}
                        {b.status === 'waiting' && isDatePassed && (
                          <div className="pt-2 border-t border-rose-100 flex items-center justify-between gap-2 bg-rose-50/60 p-2 rounded-xl">
                            <span className="text-[10px] font-bold text-rose-800">
                              ⏰ Cutoff passed without match ({b.travel_date})
                            </span>
                            <button
                              type="button"
                              onClick={() => void refundBooking(b)}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-black px-3 py-1 rounded-lg text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              💸 Refund ₹{b.advance_paid || 500}
                            </button>
                          </div>
                        )}

                        {/* Send UPI button if unpaid */}
                        {b.payment_status !== 'paid' && !(b.advance_paid && b.advance_paid >= (b.advance_amount || 500)) && (
                          <div className="pt-2 flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => void sendInChatPayment(b)}
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded-xl text-xs"
                            >
                              💳 Send UPI Payment Link
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Section C: Refunded Bookings (Shown at the bottom with explicit status and notes) */}
            <div className="border-t border-slate-200 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-violet-600" />
                  <span>Refunded Bookings ({refundedBookings.length})</span>
                </h3>
                <span className="text-xs text-slate-500">Advance refund completed · write internal notes below</span>
              </div>

              {refundedBookings.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-400">
                  No refunded bookings.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {refundedBookings.map((b) => {
                    const isKI = b.direction === 'KI'
                    const refundAmt = b.refund_amount || b.advance_paid || 500

                    return (
                      <div
                        key={b.id}
                        className="bg-white border border-violet-200 rounded-2xl p-4 text-xs space-y-3 shadow-xs hover:border-violet-300 transition"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-black text-slate-900 text-sm">#{b.booking_ref} · {b.passenger_name}</span>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {isKI ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'} · 📞 {b.phone}
                            </div>
                          </div>
                          <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide">
                            ✓ Refund Done (₹{refundAmt})
                          </span>
                        </div>

                        <div className="flex items-center justify-between bg-violet-50/50 p-2 rounded-xl text-[11px] text-slate-600">
                          <span>Travel Date: <strong>{b.travel_date} ({String(b.pickup_time).slice(0, 5)})</strong></span>
                          <span>Drop: <strong>{b.drop_name}</strong></span>
                        </div>

                        {/* Note Input Field */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                            Booking Note / Reason for Refund:
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={notesDrafts[b.id] !== undefined ? notesDrafts[b.id] : (b.notes || '')}
                              onChange={(e) => {
                                const val = e.target.value
                                setNotesDrafts((prev) => ({ ...prev, [b.id]: val }))
                              }}
                              placeholder="Write a note (e.g. Cancelled by customer, route changed)..."
                              className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-400 font-medium"
                            />
                            <button
                              type="button"
                              disabled={savingNoteId === b.id}
                              onClick={() => void handleSaveNote(b.id)}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer shrink-0 disabled:opacity-50"
                            >
                              {savingNoteId === b.id ? 'Saving…' : 'Save Note'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── VIEW 2: FLAT TABLE VIEW ── */
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Booking</th>
                  <th className="px-5 py-3">Passenger</th>
                  <th className="px-5 py-3">Trip & Schedule</th>
                  <th className="px-5 py-3">Vehicle</th>
                  <th className="px-5 py-3">Fare</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">Loading bookings…</td></tr>
                ) : filteredBookings.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">No bookings match these filters.</td></tr>
                ) : filteredBookings.map((booking) => {
                  const route = booking.direction === 'KI' ? 'Khargone → Indore' : 'Indore → Khargone'
                  const isConfirmed = booking.status === 'confirmed' || booking.status === 'matched'
                  const isDriverPending = isConfirmed && !booking.driver_id
                  const assignedDriver = drivers.find((d) => d.id === booking.driver_id)
                  const whatsapp = `https://wa.me/${normalizePhone(booking.phone)}?text=${encodeURIComponent(`Hi ${booking.passenger_name}, we are checking your MarutiCab booking ${booking.booking_ref}.` )}`
                  const driverShareWa = assignedDriver
                    ? `https://wa.me/${normalizePhone(booking.phone)}?text=${encodeURIComponent(
                        `🚕 *MarutiCab Dispatch Details*\nRef: #${booking.booking_ref}\nPassenger: ${booking.passenger_name}\nRoute: ${route}\nDate: ${booking.travel_date} at ${booking.pickup_time}\n\n👤 *Driver:* ${assignedDriver.name}\n📞 *Driver Contact:* ${assignedDriver.phone || 'In-cab'}\n🚘 *Dedicated Cab:* ${assignedDriver.vehicle_model || 'Dzire Sedan (AC)'} (${assignedDriver.vehicle_number})\n\n💵 *Balance to Driver:* ${formatRs(booking.balance_amount || Math.max(0, booking.total_fare - 500))} (Pay in cab)\n\nSupport: +91 72823 16090`
                      )}`
                    : null

                  return (
                    <tr
                      key={booking.id}
                      className={`align-top transition-colors ${
                        isDriverPending
                          ? 'bg-rose-50/70 border-l-4 border-l-rose-500 hover:bg-rose-100/50'
                          : isConfirmed
                          ? 'bg-emerald-50/30 border-l-4 border-l-emerald-500 hover:bg-emerald-50/50'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{booking.booking_ref}</div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {booking.created_at?.slice(0, 10) || '—'}
                        </div>
                        {booking.match_id && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200">
                              🔄 Paired
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{booking.passenger_name}</div>
                        <a href={`tel:${booking.phone}`} className="mt-1 block text-xs text-slate-500 hover:text-amber-800 font-medium">
                          {booking.phone}
                        </a>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">{route}</div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 font-medium">
                          <span>{booking.travel_date} at {String(booking.pickup_time).slice(0, 5)}</span>
                          <button
                            type="button"
                            onClick={() => setEditingBooking(booking)}
                            className="text-amber-800 hover:text-amber-950 p-1 hover:bg-amber-100 rounded"
                            title="Edit pickup time"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[160px]">{booking.drop_name}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-semibold capitalize text-slate-800">
                          <CarFront className="h-4 w-4 text-amber-700" />
                          {booking.vehicle_type || 'sedan'}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{booking.passenger_count || 1} passenger(s)</div>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900">{formatRs(booking.total_fare)}</td>
                      <td className="px-5 py-4">
                        {isDriverPending ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-100 px-2.5 py-1 text-[11px] font-black text-rose-800 animate-pulse">
                            🚨 Driver Pending
                          </span>
                        ) : isConfirmed ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-800">
                            ✅ Confirmed
                          </span>
                        ) : booking.status === 'refunded' ? (
                          <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide">
                            ✓ Refund Done
                          </span>
                        ) : (
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${STATUS_STYLES[booking.status]}`}>
                            {booking.status}
                          </span>
                        )}
                        {assignedDriver && (
                          <div className="mt-1.5 text-[11px] font-bold text-slate-700">
                            🚘 {assignedDriver.name} · {assignedDriver.vehicle_number}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-2">
                          {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                            <select
                              value={booking.driver_id || ''}
                              onChange={(event) => void assignDriver(booking, event.target.value)}
                              disabled={savingId === booking.id}
                              className={`h-9 w-full max-w-[210px] rounded-lg border text-xs font-bold px-2 cursor-pointer ${
                                isDriverPending
                                  ? 'border-rose-400 bg-rose-100 text-rose-900 ring-2 ring-rose-200'
                                  : 'border-slate-300 bg-white text-slate-800'
                              }`}
                              aria-label={`Assign a driver to ${booking.booking_ref}`}
                            >
                              <option value="">{isDriverPending ? '⚠️ Assign Driver & Car…' : 'Change Driver…'}</option>
                              {drivers.map((driver) => (
                                <option key={driver.id} value={driver.id}>
                                  {driver.name} · {driver.vehicle_number}
                                </option>
                              ))}
                            </select>
                          )}

                          {driverShareWa && (
                            <a
                              href={driverShareWa}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 text-xs font-black shadow-xs transition"
                            >
                              <span>📲 WhatsApp Car Details</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}

                          {/* Status update selector */}
                          <div className="flex items-center gap-2">
                            <select
                              value={STATUS_OPTIONS.includes(booking.status) ? booking.status : 'waiting'}
                              disabled={savingId === booking.id || !STATUS_OPTIONS.includes(booking.status)}
                              onChange={(event) => void updateStatus(booking, event.target.value as BookingStatus)}
                              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold capitalize"
                              aria-label={`Update status for ${booking.booking_ref}`}
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>

                            <a
                              href={whatsapp}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-emerald-700"
                              title="Chat with passenger"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>

                          <BookingWhatsAppLog bookingId={booking.id} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {editingBooking && (
        <EditTimeModal
          isOpen={Boolean(editingBooking)}
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
          onSuccess={(updatedBooking?: any) => {
            setNotice(`Schedule for #${editingBooking.booking_ref} updated successfully!`)
            if (updatedBooking) {
              setBookings((prev) => prev.map((b) => (b.id === updatedBooking.id ? { ...b, ...updatedBooking } : b)))
            }
            void loadBookings()
          }}
        />
      )}

      {assigningMatch && (
        <AssignDriverModal
          isOpen={Boolean(assigningMatch)}
          match={assigningMatch}
          drivers={drivers}
          vehicles={vehicles}
          onClose={() => setAssigningMatch(null)}
          onSuccess={() => {
            setNotice(`Driver and car assigned to Match #${String(assigningMatch.id).slice(0, 8)}! Duty details sent via WhatsApp.`)
            void loadBookings()
          }}
        />
      )}
    </section>
  )
}
