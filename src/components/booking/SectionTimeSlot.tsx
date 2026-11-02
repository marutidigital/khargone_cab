'use client'

import { Clock, ShieldCheck } from 'lucide-react'
import { isNightTime } from '@/config/pricing'
import { BOOKING_CONFIG } from '@/lib/config'

export interface ExactTimeOption {
  timeStr: string
  label12: string
  hour: number
  minute: number
  isNight: boolean
  disabled: boolean
}

interface Props {
  isToday: boolean
  direction: 'K2I' | 'I2K'
  selectedTimeStr: string | null
  onSelectTime: (opt: ExactTimeOption) => void
  matchAvailability: { ready: boolean; count: number } | null
}

const QUICK_TIMES = ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00']

function getEstimatedArrival(hour: number, minute: number, travelHours = BOOKING_CONFIG.travelHours): string {
  const totalMin = hour * 60 + minute + travelHours * 60
  const endHour = Math.floor(totalMin / 60) % 24
  const endMin = totalMin % 60
  const h12 = endHour % 12 || 12
  return `${h12}:${String(endMin).padStart(2, '0')} ${endHour < 12 ? 'AM' : 'PM'}`
}

function getIndiaTime(): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date())
  return {
    hour: Number(parts.find((part) => part.type === 'hour')?.value ?? 0),
    minute: Number(parts.find((part) => part.type === 'minute')?.value ?? 0),
  }
}

function to12HourLabel(hour: number, minute: number): string {
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
}

function formatRs(amount: number): string { return `₹${amount.toLocaleString('en-IN')}` }

export function SectionTimeSlot({ isToday, direction, selectedTimeStr, onSelectTime, matchAvailability }: Props) {
  const indiaTime = getIndiaTime()
  const nextMinute = indiaTime.hour * 60 + indiaTime.minute + 1
  const minTime = isToday && nextMinute < 24 * 60
    ? `${String(Math.floor(nextMinute / 60)).padStart(2, '0')}:${String(nextMinute % 60).padStart(2, '0')}`
    : isToday ? '23:59' : undefined
  const selectedParts = selectedTimeStr?.match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  const selectedHour = selectedParts ? Number(selectedParts[1]) : -1
  const selectedMinute = selectedParts ? Number(selectedParts[2]) : -1
  const selectedSlot: ExactTimeOption | null = selectedParts ? {
    timeStr: selectedTimeStr!,
    label12: to12HourLabel(selectedHour, selectedMinute),
    hour: selectedHour,
    minute: selectedMinute,
    isNight: isNightTime(selectedHour, selectedMinute),
    disabled: false,
  } : null
  const destinationCity = direction === 'K2I' ? 'Indore' : 'Khargone'

  const handleTimeChange = (timeStr: string) => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeStr)
    if (!match) return
    const hour = Number(match[1])
    const minute = Number(match[2])
    onSelectTime({ timeStr, label12: to12HourLabel(hour, minute), hour, minute, isNight: isNightTime(hour, minute), disabled: false })
  }

  const isPastToday = (time: string) => isToday && Boolean(minTime) && time < minTime!

  return (
    <section className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-xs sm:p-8">
      <div className="flex items-center gap-2">
        <span className="text-base font-black text-[#FBBF24]">5.</span>
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">Choose pickup time</h2>
          <p className="mt-0.5 text-xs text-slate-500">Tap a time or choose any exact time on the clock.</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <Clock className="h-5 w-5" />
          </span>
          <label className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Exact pickup time</span>
            <input
              type="time"
              step={60}
              min={minTime}
              value={selectedTimeStr ?? ''}
              onChange={(event) => handleTimeChange(event.target.value)}
              className="mt-0.5 min-h-10 w-full appearance-none border-0 bg-transparent p-0 text-xl font-black tabular-nums text-slate-900 outline-none focus:ring-0"
              aria-label="Choose exact pickup time"
            />
          </label>
          {selectedSlot?.isNight && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold text-amber-900">
              +{formatRs(BOOKING_CONFIG.nightSurcharge)} night
            </span>
          )}
        </div>
      </div>

      <div className="mt-3">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Quick select</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {QUICK_TIMES.map((time) => {
            const [hourText, minuteText] = time.split(':')
            const hour = Number(hourText)
            const minute = Number(minuteText)
            const night = isNightTime(hour, minute)
            const active = selectedTimeStr === time
            const disabled = isPastToday(time)
            return (
              <button
                key={time}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => handleTimeChange(time)}
                className={`min-h-14 min-w-[76px] shrink-0 rounded-xl border px-2.5 py-2 text-center transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${active ? 'border-amber-400 bg-amber-50 text-amber-950 ring-1 ring-amber-200' : 'border-slate-200 bg-white text-slate-800 hover:border-amber-300'}`}
              >
                <span className="block text-xs font-extrabold">{to12HourLabel(hour, minute)}</span>
                {night && <span className="mt-0.5 block text-[9px] font-bold text-amber-800">+{formatRs(BOOKING_CONFIG.nightSurcharge)}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs">
        {selectedTimeStr && matchAvailability ? (
          <span className={`font-bold ${matchAvailability.ready ? 'text-emerald-800' : 'text-amber-800'}`}>
            {matchAvailability.ready ? `${matchAvailability.count} compatible opposite-direction request${matchAvailability.count === 1 ? '' : 's'} found for this time.` : 'No compatible opposite-direction request yet. We’ll keep looking until the match cutoff.'}
          </span>
        ) : <span className="text-slate-600">{isToday ? 'For today, choose a time later than now.' : 'Choose any time that suits your trip.'} Night pickup (9:00 PM–4:00 AM) adds {formatRs(BOOKING_CONFIG.nightSurcharge)}.</span>}
      </div>

      <div className="mt-3 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
          <Clock className="h-4 w-4 shrink-0 text-[#FBBF24]" />
          <span>{selectedSlot ? <>Estimated arrival in {destinationCity}: about <strong className="text-slate-950">{getEstimatedArrival(selectedSlot.hour, selectedSlot.minute)}</strong>.</> : 'Choose a pickup time to see your estimated arrival.'}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-600">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <span>Your chosen time is saved with your booking.</span>
        </div>
      </div>
    </section>
  )
}
