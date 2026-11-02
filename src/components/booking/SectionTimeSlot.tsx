'use client'
// src/components/booking/SectionTimeSlot.tsx
import { Clock, ShieldCheck } from 'lucide-react'
import { isNightTime } from '@/config/pricing'
import { BOOKING_CONFIG } from '@/lib/config'

export interface ExactTimeOption {
  timeStr: string // "09:30" 24h
  label12: string // "9:30 AM"
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

function getEstimatedArrival(hour: number, minute: number, travelHours = BOOKING_CONFIG.travelHours): string {
  const totalMin = hour * 60 + minute + travelHours * 60
  const endHour = Math.floor(totalMin / 60) % 24
  const endMin = totalMin % 60
  const h12 = endHour % 12 === 0 ? 12 : endHour % 12
  const ampm = endHour < 12 ? 'AM' : 'PM'
  return `${h12}:${String(endMin).padStart(2, '0')} ${ampm}`
}

function getIndiaTime(): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  return {
    hour: Number(parts.find((part) => part.type === 'hour')?.value ?? 0),
    minute: Number(parts.find((part) => part.type === 'minute')?.value ?? 0),
  }
}

function to12HourLabel(hour: number, minute: number): string {
  const hour12 = hour % 12 || 12
  const suffix = hour < 12 ? 'AM' : 'PM'
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`
}

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
    const slot: ExactTimeOption = { timeStr, label12: to12HourLabel(hour, minute), hour, minute, isNight: isNightTime(hour, minute), disabled: false }
    onSelectTime(slot)
  }

  return (
    <section className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-8 shadow-xs">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-base font-black text-[#FBBF24]">5.</span>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          Choose pickup time
        </h2>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
        <label className="block w-full sm:max-w-xs">
          <span className="mb-2 block text-xs font-bold text-slate-700">Choose any pickup time</span>
          <input
            type="time"
            step={60}
            min={minTime}
            value={selectedTimeStr ?? ''}
            onChange={(event) => handleTimeChange(event.target.value)}
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-semibold text-slate-900 outline-none transition focus:border-[#FBBF24] focus:ring-2 focus:ring-amber-200"
            aria-label="Choose pickup time"
          />
        </label>

        <div className="text-xs leading-relaxed text-slate-500 sm:pb-3">
          {isToday ? 'Choose a pickup time later than now.' : 'Choose any time that suits your trip.'} Night pickup (9:00 PM–4:00 AM) adds {formatRs(BOOKING_CONFIG.nightSurcharge)}.
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
        {selectedTimeStr && matchAvailability ? (
          <span className={`font-bold ${matchAvailability.ready ? 'text-emerald-800' : 'text-amber-800'}`}>
            {matchAvailability.ready ? `${matchAvailability.count} compatible opposite-direction request${matchAvailability.count === 1 ? '' : 's'} found for this time.` : 'No compatible opposite-direction request yet. We’ll keep looking until the match cutoff.'}
          </span>
        ) : <span className="text-slate-600">Choose a time to check for compatible return rides.</span>}
      </div>

      <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
          <Clock className="w-4 h-4 text-[#FBBF24] flex-shrink-0" />
          <span>
            {selectedSlot
              ? <>Estimated arrival in {destinationCity}: about <strong className="text-slate-950">{getEstimatedArrival(selectedSlot.hour, selectedSlot.minute)}</strong>.</>
              : 'Choose a pickup time to see your estimated arrival.'}
          </span>
        </div>

        <div className="flex items-center gap-1 text-slate-600">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span>Your chosen time is saved with your booking.</span>
        </div>
      </div>
    </section>
  )
}

function formatRs(amount: number): string { return `₹${amount.toLocaleString('en-IN')}` }
