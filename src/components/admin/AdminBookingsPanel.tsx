'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, CarFront, ExternalLink, RefreshCw, Search } from 'lucide-react'
import { getAdminApiHeaders } from '@/lib/admin-api'
import { formatRs } from '@/config/pricing'
import type { Booking, BookingStatus } from '@/types'
import { MatchDealBoard } from '@/components/admin/MatchDealBoard'
import { BookingWhatsAppLog } from '@/components/admin/BookingWhatsAppLog'

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
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string; phone?: string; vehicle_number: string; vehicle_model?: string; status?: string }>>([])

  const loadBookings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await getAdminApiHeaders()
      const [response, driverResponse] = await Promise.all([
        fetch('/api/admin/bookings?limit=500', { headers, cache: 'no-store' }),
        fetch('/api/drivers?status=active', { headers, cache: 'no-store' }),
      ])
      const [result, driverResult] = await Promise.all([response.json(), driverResponse.json()])
      if (!response.ok || !driverResponse.ok) throw new Error(result.error || driverResult.error || 'Could not load bookings.')
      setBookings(result.bookings || [])
      setDrivers(driverResult.drivers || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load bookings.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadBookings() }, [loadBookings])

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase()
    const matches = bookings.filter((booking) => {
      if (statusFilter !== 'all' && booking.status !== statusFilter) return false
      if (!query) return true
      return [booking.booking_ref, booking.passenger_name, booking.phone, booking.drop_name]
        .some((value) => value?.toLowerCase().includes(query))
    })

    // Strict priority sorting:
    // 1. Waiting bookings ALWAYS on top (rank 0)
    // 2. Confirmed bookings with no driver assigned (rank 1 - urgent action needed)
    // 3. Confirmed bookings with driver assigned (rank 2)
    // 4. Other statuses: completed, refunded, cancelled (rank 3)
    return matches.sort((a, b) => {
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
      setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, status } : item))
      setNotice(`${booking.booking_ref} updated to ${status}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update booking.')
    } finally {
      setSavingId(null)
    }
  }

  const assignDriver = async (booking: Booking, driverId: string) => {
    if (!driverId) return
    setSavingId(booking.id); setError(null); setNotice(null)
    try {
      const headers = await getAdminApiHeaders()
      const response = await fetch('/api/admin/bookings', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ _action: 'assign_driver', id: booking.id, driver_id: driverId }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not assign driver.')
      setNotice(`${booking.booking_ref} assigned to driver.`)
      await loadBookings()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not assign driver.') }
    finally { setSavingId(null) }
  }

  const refundBooking = async (booking: Booking) => {
    setSavingId(booking.id); setError(null); setNotice(null)
    try {
      const headers = await getAdminApiHeaders()
      const response = await fetch('/api/admin/bookings', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ _action: 'refund', id: booking.id }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not request refund.')
      setNotice(`${booking.booking_ref} refund status: ${result.status}.`)
      await loadBookings()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not request refund.') }
    finally { setSavingId(null) }
  }

  const countByStatus = (status: BookingStatus) => bookings.filter((booking) => booking.status === status).length

  return (
    <section className="space-y-5">
      <MatchDealBoard />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
            className={`rounded-2xl border bg-white p-4 text-left transition hover:border-amber-300 ${statusFilter === status ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}`}
          >
            <span className="block text-xs font-semibold capitalize text-slate-500">{status} bookings</span>
            <span className="mt-1 block text-2xl font-black text-slate-900">{countByStatus(status)}</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Bookings</h2>
            <p className="mt-1 text-xs text-slate-500">Review requests and update their dispatch status.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[200px] flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, phone or ref"
                className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-amber-400"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | BookingStatus)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
              aria-label="Filter bookings by status"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <button
              type="button"
              onClick={() => void loadBookings()}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {error && <p role="alert" className="mx-4 mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 sm:mx-5">{error}</p>}
        {notice && <p role="status" className="mx-4 mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 sm:mx-5">{notice}</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Booking</th>
                <th className="px-5 py-3">Passenger</th>
                <th className="px-5 py-3">Trip</th>
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
                      `🚕 *MarutiCab Dispatch Details*\nRef: #${booking.booking_ref}\nPassenger: ${booking.passenger_name}\nRoute: ${route}\nDate: ${booking.travel_date} at ${booking.pickup_time}\n\n👤 *Driver:* ${assignedDriver.name}\n📞 *Driver Contact:* ${assignedDriver.phone || 'In-cab'}\n🚘 *Dedicated Cab:* ${assignedDriver.vehicle_model || 'Dzire Sedan (AC)'} (${assignedDriver.vehicle_number})\n\n💵 *Balance to Driver:* ${formatRs(booking.balance_amount || Math.max(0, booking.total_fare - 500))} (Pay in cab)\n\nℹ️ *Policy Note:* Drop included up to selected destination. Extra run beyond destination charged at ₹13/km.\nSupport: +91 72823 16090`
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
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{booking.passenger_name}</div>
                      <a href={`tel:${booking.phone}`} className="mt-1 block text-xs text-slate-500 hover:text-amber-800 font-medium">
                        {booking.phone}
                      </a>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{route}</div>
                      <div className="mt-1 text-xs text-slate-500 font-medium">
                        {booking.drop_name} · {booking.travel_date} · {booking.pickup_time}
                      </div>
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
                          ✅ Confirmed & Assigned
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
                        {/* Driver Assignment Dropdown - Available for all active bookings */}
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
                                {driver.name} · {driver.vehicle_model ? `${driver.vehicle_model} · ` : ''}{driver.vehicle_number}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Send Dispatch Details WhatsApp button */}
                        {driverShareWa && (
                          <a
                            href={driverShareWa}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-2.5 py-1.5 text-xs font-black shadow-xs transition"
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

                        {booking.status === 'no_match_decision' && (
                          <button
                            type="button"
                            disabled={savingId === booking.id}
                            onClick={() => void refundBooking(booking)}
                            className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-900 disabled:opacity-50"
                          >
                            Refund advance
                          </button>
                        )}
                        <BookingWhatsAppLog bookingId={booking.id} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
