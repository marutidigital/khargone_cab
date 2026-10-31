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
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string; vehicle_number: string; status?: string }>>([])

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
    return bookings.filter((booking) => {
      if (statusFilter !== 'all' && booking.status !== statusFilter) return false
      if (!query) return true
      return [booking.booking_ref, booking.passenger_name, booking.phone, booking.drop_name]
        .some((value) => value?.toLowerCase().includes(query))
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
                const whatsapp = `https://wa.me/${normalizePhone(booking.phone)}?text=${encodeURIComponent(`Hi ${booking.passenger_name}, we are checking your MarutiCab booking ${booking.booking_ref}.` )}`
                return (
                  <tr key={booking.id} className="align-top hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{booking.booking_ref}</div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-500"><CalendarDays className="h-3.5 w-3.5" />{booking.created_at?.slice(0, 10) || '—'}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{booking.passenger_name}</div>
                      <a href={`tel:${booking.phone}`} className="mt-1 block text-xs text-slate-500 hover:text-amber-800">{booking.phone}</a>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{route}</div>
                      <div className="mt-1 text-xs text-slate-500">{booking.drop_name} · {booking.travel_date} · {booking.pickup_time}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 font-semibold capitalize text-slate-800"><CarFront className="h-4 w-4 text-amber-700" />{booking.vehicle_type || 'sedan'}</div>
                      <div className="mt-1 text-xs text-slate-500">{booking.passenger_count || 1} passenger(s)</div>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-900">{formatRs(booking.total_fare)}</td>
                    <td className="px-5 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${STATUS_STYLES[booking.status]}`}>{booking.status}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col items-start gap-2">
                        <select
                          value={STATUS_OPTIONS.includes(booking.status) ? booking.status : 'waiting'}
                          disabled={savingId === booking.id || booking.mode === 'match' || !STATUS_OPTIONS.includes(booking.status)}
                          onChange={(event) => void updateStatus(booking, event.target.value as BookingStatus)}
                          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold capitalize"
                          aria-label={`Update status for ${booking.booking_ref}`}
                        >
                          {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                        {booking.mode !== 'match' && booking.status !== 'cancelled' && booking.status !== 'completed' && <select defaultValue="" onChange={(event) => void assignDriver(booking, event.target.value)} disabled={savingId === booking.id} className="h-9 max-w-44 rounded-lg border border-slate-200 bg-white px-2 text-xs" aria-label={`Assign a driver to ${booking.booking_ref}`}><option value="">Assign driver…</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name} · {driver.vehicle_number}</option>)}</select>}
                        {booking.status === 'no_match_decision' && <button type="button" disabled={savingId === booking.id} onClick={() => void refundBooking(booking)} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold text-amber-900 disabled:opacity-50">Refund advance</button>}
                        <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900">
                          Open WhatsApp <ExternalLink className="h-3 w-3" />
                        </a>
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
