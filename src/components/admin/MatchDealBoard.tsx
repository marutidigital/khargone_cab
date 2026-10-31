'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAdminApiHeaders } from '@/lib/admin-api'
import { isMatchTimeCompatible } from '@/lib/config'

type Booking = { id: string; booking_ref: string; mode?: string; status: string; direction: string; travel_date: string; pickup_time: string; passenger_name: string; phone: string; drop_name: string; passenger_count?: number; cutoff_at?: string | null; total_fare: number }
type Driver = { id: string; name: string; phone: string; vehicle_number: string; status: string }

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

export function MatchDealBoard() {
  const [date, setDate] = useState(today)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [selected, setSelected] = useState<Booking | null>(null)
  const [driverId, setDriverId] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    const headers = await getAdminApiHeaders()
    const [bookingResponse, driverResponse] = await Promise.all([
      fetch('/api/admin/bookings?limit=500', { headers, cache: 'no-store' }),
      fetch('/api/drivers?status=active', { headers, cache: 'no-store' }),
    ])
    const [bookingBody, driverBody] = await Promise.all([bookingResponse.json(), driverResponse.json()])
    if (!bookingResponse.ok || !driverResponse.ok) throw new Error(bookingBody.error || driverBody.error || 'Could not load dispatch board.')
    setBookings(bookingBody.bookings || []); setDrivers(driverBody.drivers || [])
  }, [date])
  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load dispatch board.')) }, [load])

  const dayBookings = bookings.filter((booking) => booking.travel_date === date)
  const waiting = dayBookings.filter((booking) => booking.mode === 'match' && booking.status === 'waiting')
  const compatible = useMemo(() => {
    if (!selected) return []
    return waiting.filter((booking) => booking.id !== selected.id && booking.direction !== selected.direction && booking.travel_date === selected.travel_date && isMatchTimeCompatible(selected.direction === 'KI' ? 'K2I' : 'I2K', selected.pickup_time.slice(0, 5), booking.direction === 'KI' ? 'K2I' : 'I2K', booking.pickup_time.slice(0, 5)))
      .sort((a, b) => Math.abs(Date.parse(`${a.travel_date}T${a.pickup_time}`) - Date.parse(`${selected.travel_date}T${selected.pickup_time}`)) - Math.abs(Date.parse(`${b.travel_date}T${b.pickup_time}`) - Date.parse(`${selected.travel_date}T${selected.pickup_time}`)))
  }, [selected, waiting])
  const k2i = waiting.filter((booking) => booking.direction === 'KI')
  const i2k = waiting.filter((booking) => booking.direction === 'IK')
  const submitMatch = async (other: Booking) => {
    if (!selected || !driverId) return
    setBusy(true); setError(''); setNotice('')
    try {
      const headers = await getAdminApiHeaders()
      const response = await fetch('/api/admin/bookings', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ _action: 'match_pair', id: selected.id, other_booking_id: other.id, driver_id: driverId }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Could not confirm match.')
      setNotice(`${selected.booking_ref} and ${other.booking_ref} are confirmed.`); setSelected(null); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not confirm match.') }
    finally { setBusy(false) }
  }
  const nearCutoff = (booking: Booking) => booking.cutoff_at ? Date.parse(booking.cutoff_at) - Date.now() <= 3 * 60 * 60 * 1000 : false
  const col = (items: Booking[], label: string) => <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4"><h3 className="mb-3 text-sm font-extrabold">{label} <span className="text-xs text-slate-500">({items.length})</span></h3><div className="space-y-2">{items.length === 0 && <p className="rounded-xl bg-white p-3 text-xs text-slate-500">No waiting bookings.</p>}{items.map((booking) => { const isCompatible = selected && compatible.some((item) => item.id === booking.id); const disabledBySelection = Boolean(selected && selected.id !== booking.id && !isCompatible); return <button type="button" key={booking.id} disabled={disabledBySelection} onClick={() => setSelected(selected?.id === booking.id ? null : booking)} className={`w-full rounded-xl border p-3 text-left transition ${nearCutoff(booking) ? 'border-rose-300 bg-rose-50' : isCompatible ? 'border-emerald-300 bg-emerald-50' : selected?.id === booking.id ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'} disabled:opacity-40`}><div className="flex items-start justify-between gap-2"><strong className="text-sm">{booking.passenger_name} · {booking.pickup_time.slice(0, 5)}</strong>{nearCutoff(booking) && <span className="rounded-full bg-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-900">Cutoff soon</span>}</div><p className="mt-1 text-xs text-slate-600">{booking.booking_ref} · {booking.drop_name} · {booking.passenger_count || 1} passenger(s)</p>{isCompatible && <span className="mt-2 inline-block text-[11px] font-bold text-emerald-800">Compatible match</span>}</button> })}</div></div>

  const weekAgo = today()
  const weekStart = new Date(`${weekAgo}T00:00:00+05:30`)
  weekStart.setDate(weekStart.getDate() - 6)
  const weekCount = bookings.filter((booking) => booking.travel_date >= weekStart.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) && booking.travel_date <= today()).length
  const totalMatch = bookings.filter((booking) => booking.mode === 'match').length
  const matchRate = totalMatch ? Math.round(bookings.filter((booking) => booking.mode === 'match' && ['matched', 'confirmed', 'completed'].includes(booking.status)).length / totalMatch * 100) : 0
  return <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-extrabold">Match Deal dispatch</h2><p className="text-xs text-slate-500">Same date · opposite direction · 4–8 hour return gap</p></div><label className="text-xs font-bold">Travel date <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="ml-2 h-10 rounded-lg border border-slate-200 px-2 text-sm" /></label></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="Bookings today" value={bookings.filter((booking) => booking.travel_date === today()).length} /><Metric label="This week" value={weekCount} /><Metric label="Match rate" value={`${matchRate}%`} /><Metric label="Refunds" value={bookings.filter((booking) => booking.status === 'refunded').length} /></div>{notice && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}{error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}<div className="mt-4 grid gap-3 md:grid-cols-2">{col(k2i, 'Khargone → Indore')}{col(i2k, 'Indore → Khargone')}</div>{selected && compatible.length > 0 && <div className="mt-4 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:flex-row sm:items-end"><label className="flex-1 text-xs font-bold">Assign driver<select value={driverId} onChange={(event) => setDriverId(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm"><option value="">Select active driver</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name} · {driver.vehicle_number}</option>)}</select></label><div className="flex flex-wrap gap-2">{compatible.map((candidate) => <button type="button" disabled={!driverId || busy} key={candidate.id} onClick={() => void submitMatch(candidate)} className="rounded-lg bg-emerald-800 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40">{busy ? 'Saving…' : `Match ${candidate.booking_ref}`}</button>)}</div></div>}{selected && compatible.length === 0 && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">No compatible opposite-direction booking is available for this pickup time.</p>}</section>
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl bg-slate-50 p-3"><div className="text-[11px] text-slate-500">{label}</div><strong className="text-xl">{value}</strong></div> }
