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
  selectedDate?: string
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

export function ConfirmedRidePicker({ direction, selectedDate, selected, onSelect }: Props) {
  const [rides, setRides] = useState<RideOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterSameDay, setFilterSameDay] = useState(true)

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

  // Same-day matching logic
  const sameDayRides = selectedDate ? rides.filter((r) => r.date === selectedDate) : []
  const displayedRides = filterSameDay && selectedDate && sameDayRides.length > 0 ? sameDayRides : rides

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-900">Choose a Linking Return Ride</h2>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-800">
              Save Big
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Book the return direction of an already confirmed cab on this route.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadRides()}
          aria-label="Refresh available rides"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Date Filter Tabs */}
      {selectedDate && rides.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterSameDay(true)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              filterSameDay && sameDayRides.length > 0
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>📅 Same Day ({formatDate(selectedDate)})</span>
            <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px] font-black">
              {sameDayRides.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterSameDay(false)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              !filterSameDay || sameDayRides.length === 0
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>All Available Dates</span>
            <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px] font-black">
              {rides.length}
            </span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="mt-6 flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
          <LoaderCircle className="h-4 w-4 animate-spin text-amber-600" /> Finding available linking rides…
        </div>
      ) : error ? (
        <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : displayedRides.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-700">
          <strong className="block text-slate-900">
            {filterSameDay && selectedDate
              ? `No confirmed return rides found on ${formatDate(selectedDate)} yet.`
              : 'No matching return rides available right now.'}
          </strong>
          <span className="mt-1 block text-xs text-slate-500">
            {filterSameDay && sameDayRides.length === 0 && rides.length > 0 ? (
              <button
                type="button"
                onClick={() => setFilterSameDay(false)}
                className="font-bold text-amber-700 underline mt-1"
              >
                View all other available dates ({rides.length} upcoming rides)
              </button>
            ) : (
              'You can switch to "Match Deal" to choose your exact custom time.'
            )}
          </span>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {displayedRides.map((ride) => (
            <article
              key={ride.id}
              className={`rounded-2xl border p-4 transition ${
                selected?.id === ride.id
                  ? 'border-amber-400 bg-amber-50/50 ring-2 ring-amber-300 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-extrabold text-slate-900">
                    <CalendarDays className="h-4 w-4 text-amber-600" />
                    {formatDate(ride.date)}
                    {selectedDate && ride.date === selectedDate && (
                      <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5">
                        Same Day Match
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <Route className="h-4 w-4 text-slate-400" />
                    {ride.existingDirection === 'K2I' ? 'Khargone → Indore' : 'Indore → Khargone'}
                    <span>·</span>
                    <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                    {formatTime(ride.existingTime)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 font-medium">Return leg drop: {ride.pointName}</div>
                </div>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                  Open Return Leg
                </span>
              </div>
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Select your return pickup time:
                </p>
                <div className="flex flex-wrap gap-2">
                  {ride.returnTimes.map((slot) => {
                    const active = selected?.id === ride.id && selected.returnTime === slot.value
                    return (
                      <button
                        key={slot.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          onSelect({
                            id: ride.id,
                            date: ride.date,
                            existingDirection: ride.existingDirection,
                            existingTime: ride.existingTime,
                            pointId: ride.pointId,
                            pointName: ride.pointName,
                            returnTime: slot.value,
                          })
                        }
                        className={`min-h-10 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                          active
                            ? 'border-amber-400 bg-amber-400 text-slate-950 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300'
                        }`}
                      >
                        {slot.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs sm:text-sm font-bold text-emerald-900">
          <ArrowRight className="h-4 w-4 shrink-0" />
          <span>
            Return time selected: {formatDate(selected.date)} at {selected.returnTime}. Linking ride paired!
          </span>
        </div>
      )}
    </section>
  )
}
