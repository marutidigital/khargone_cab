'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, Clock3, LoaderCircle, RefreshCw, Route } from 'lucide-react'
import type { RouteDirection } from '@/lib/config'

export interface ConfirmedRideSelection {
  id: string
  date: string
  existingDirection: RouteDirection
  existingTime: string
  pointId: string
  pointName: string
  returnTime: string
}

interface RideOption extends Omit<ConfirmedRideSelection, 'returnTime'> {
  returnTimes: { value: string; label: string }[]
}

interface Props {
  direction: RouteDirection
  selected: ConfirmedRideSelection | null
  onSelect: (selection: ConfirmedRideSelection | null) => void
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00+05:30`).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(value: string) {
  const [hour, minute] = value.split(':').map(Number)
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
}

export function ConfirmedRidePicker({ direction, selected, onSelect }: Props) {
  const [rides, setRides] = useState<RideOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadRides = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/bookings/confirmed-rides?direction=${direction}`, { cache: 'no-store', signal })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Could not load upcoming rides.')
      setRides(Array.isArray(body.rides) ? body.rides : [])
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setError(cause instanceof Error ? cause.message : 'Could not load upcoming rides.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [direction])

  useEffect(() => {
    const controller = new AbortController()
    void loadRides(controller.signal)
    return () => controller.abort()
  }, [direction, loadRides])

  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-7">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-lg font-extrabold">Choose an existing ride</h2><p className="mt-1 text-sm text-slate-600">Book the return direction for the same date and complete this round trip.</p></div>
      <button type="button" onClick={() => void loadRides()} aria-label="Refresh available rides" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600"><RefreshCw className="h-4 w-4" /></button>
    </div>

    {loading ? <div className="mt-6 flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" /> Finding available return rides…</div> : error ? <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : rides.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-700"><strong className="block">No matching rides available right now</strong><span className="mt-1 block">Try again later. Only upcoming rides with an open return slot are shown.</span></div> : <div className="mt-5 space-y-3">
      {rides.map((ride) => <article key={ride.id} className={`rounded-2xl border p-4 transition ${selected?.id === ride.id ? 'border-amber-400 bg-amber-50/50 ring-1 ring-amber-200' : 'border-slate-200 bg-white'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="flex items-center gap-2 font-extrabold text-slate-900"><CalendarDays className="h-4 w-4 text-amber-600" />{formatDate(ride.date)}</div><div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-600"><Route className="h-4 w-4" />{ride.existingDirection === 'K2I' ? 'Khargone → Indore' : 'Indore → Khargone'}<span>·</span><Clock3 className="h-3.5 w-3.5" />{formatTime(ride.existingTime)}</div><div className="mt-1 text-xs text-slate-500">Return trip for {ride.pointName}</div></div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">Available</span>
        </div>
        <div className="mt-4"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Choose your pickup time</p><div className="flex flex-wrap gap-2">{ride.returnTimes.map((slot) => {
          const active = selected?.id === ride.id && selected.returnTime === slot.value
          return <button key={slot.value} type="button" aria-pressed={active} onClick={() => onSelect({ id: ride.id, date: ride.date, existingDirection: ride.existingDirection, existingTime: ride.existingTime, pointId: ride.pointId, pointName: ride.pointName, returnTime: slot.value })} className={`min-h-10 rounded-xl border px-3 py-2 text-xs font-bold ${active ? 'border-amber-400 bg-amber-400 text-slate-950' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300'}`}>{slot.label}</button>
        })}</div></div>
      </article>)}
    </div>}

    {selected && <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-900"><ArrowRight className="h-4 w-4" />Return time selected: {formatDate(selected.date)} at {selected.returnTime}. Both rides will be paired after payment is verified.</div>}
  </section>
}
