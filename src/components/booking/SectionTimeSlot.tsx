'use client'
// src/components/booking/SectionTimeSlot.tsx
import { useMemo } from 'react'
import { Clock, ShieldCheck } from 'lucide-react'
import { PRICING_CONFIG, isNightTime } from '@/config/pricing'

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
}

function getEstimatedArrival(hour: number, minute: number, travelHours = 3): string {
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

export function SectionTimeSlot({ isToday, direction, selectedTimeStr, onSelectTime }: Props) {
  const slots = useMemo(() => {
    const indiaTime = getIndiaTime()
    const cutoffMinutes = indiaTime.hour * 60 + indiaTime.minute + PRICING_CONFIG.minLeadHours * 60
    // Keep all half-hour pickup slots in normal clock order in one compact list.
    const hours = Array.from({ length: 24 }, (_, index) => index)

    return hours.flatMap((hour) => [0, 30].map((minute): ExactTimeOption => {
      const timeMinutes = hour * 60 + minute
      const isNight = isNightTime(hour)
      return {
        timeStr: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        label12: to12HourLabel(hour, minute),
        hour,
        minute,
        isNight,
        disabled: isToday && timeMinutes < cutoffMinutes,
      }
    }))
  }, [isToday])

  const selectedSlot = slots.find((slot) => slot.timeStr === selectedTimeStr) ?? null
  const destinationCity = direction === 'K2I' ? 'Indore' : 'Khargone'

  const handleTimeChange = (timeStr: string) => {
    const slot = slots.find((option) => option.timeStr === timeStr)
    if (slot && !slot.disabled) onSelectTime(slot)
  }

  return (
    <section className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-8 shadow-xs">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-base font-black text-[#FBBF24]">5.</span>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          Choose pickup time
        </h2>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <label className="block w-full sm:max-w-xs">
          <span className="block text-xs font-bold text-slate-700 mb-2">Available times · 30 minute slots</span>
          <select
            value={selectedTimeStr ?? ''}
            onChange={(event) => handleTimeChange(event.target.value)}
            className="w-full h-12 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#FBBF24] focus:ring-2 focus:ring-amber-200"
          >
            <option value="" disabled>Select a pickup time</option>
            {slots.map((slot) => (
              <option key={slot.timeStr} value={slot.timeStr} disabled={slot.disabled}>
                {slot.label12}{slot.isNight ? ' · Night (+₹300)' : ''}{slot.disabled ? ' · Unavailable' : ''}
              </option>
            ))}
          </select>
        </label>

        <div className="text-xs leading-relaxed text-slate-500 sm:pb-3">
          Night pickups (10:00 PM–4:30 AM) include a {formatRs(PRICING_CONFIG.NIGHT_SURCHARGE)} surcharge.
        </div>
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
          <span>Your driver will call 30 minutes before pickup.</span>
        </div>
      </div>
    </section>
  )
}

function formatRs(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}
