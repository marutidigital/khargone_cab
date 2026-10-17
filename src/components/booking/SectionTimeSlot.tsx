'use client'
// src/components/booking/SectionTimeSlot.tsx
import { useState, useMemo, useEffect } from 'react'
import { Sun, Sunset, Moon, Sunrise, Clock, ShieldCheck } from 'lucide-react'
import { PRICING_CONFIG, formatRs, isNightTime } from '@/config/pricing'

export type PeriodKey = 'morning' | 'afternoon' | 'evening' | 'night'

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

const PERIODS: {
  key: PeriodKey
  label: string
  hours: string
  icon: any
  startH: number
  endH: number
}[] = [
  {
    key: 'morning',
    label: 'Morning',
    hours: '05:00 - 11:59',
    icon: Sunrise,
    startH: 5,
    endH: 11,
  },
  {
    key: 'afternoon',
    label: 'Afternoon',
    hours: '12:00 - 16:59',
    icon: Sun,
    startH: 12,
    endH: 16,
  },
  {
    key: 'evening',
    label: 'Evening',
    hours: '17:00 - 21:59',
    icon: Sunset,
    startH: 17,
    endH: 21,
  },
  {
    key: 'night',
    label: 'Night',
    hours: '22:00 - 04:59',
    icon: Moon,
    startH: 22,
    endH: 4,
  },
]

// Estimate arrival time (3 hours travel time)
function getEstimatedArrival(hour: number, minute: number, travelHours = 3): string {
  const totalMin = hour * 60 + minute + travelHours * 60
  const endHour = Math.floor(totalMin / 60) % 24
  const endMin = totalMin % 60
  const h12 = endHour % 12 === 0 ? 12 : endHour % 12
  const ampm = endHour < 12 ? 'AM' : 'PM'
  return `${h12}:${String(endMin).padStart(2, '0')} ${ampm}`
}

export function SectionTimeSlot({
  isToday,
  direction,
  selectedTimeStr,
  onSelectTime,
}: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('morning')

  // Generate 30-min slots for the selected period
  const slotsForPeriod = useMemo(() => {
    const list: ExactTimeOption[] = []

    // Current India time for lead-time cutoff
    const now = new Date()
    const indiaFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    })
    const [curHStr, curMStr] = indiaFormatter.format(now).split(':')
    const curH = Number(curHStr)
    const curM = Number(curMStr)
    const cutoffMinutes = curH * 60 + curM + PRICING_CONFIG.minLeadHours * 60

    if (selectedPeriod === 'morning') {
      for (let h = 5; h <= 11; h++) {
        for (const m of [0, 30]) {
          const totalSlotMinutes = h * 60 + m
          const disabled = isToday && totalSlotMinutes < cutoffMinutes
          const h12 = h % 12 === 0 ? 12 : h % 12
          const ampm = h < 12 ? 'AM' : 'PM'
          const label12 = `${h12}:${String(m).padStart(2, '0')} ${ampm}`
          const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

          list.push({
            timeStr,
            label12,
            hour: h,
            minute: m,
            isNight: false,
            disabled,
          })
        }
      }
    } else if (selectedPeriod === 'afternoon') {
      for (let h = 12; h <= 16; h++) {
        for (const m of [0, 30]) {
          const totalSlotMinutes = h * 60 + m
          const disabled = isToday && totalSlotMinutes < cutoffMinutes
          const h12 = h % 12 === 0 ? 12 : h % 12
          const label12 = `${h12}:${String(m).padStart(2, '0')} PM`
          const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

          list.push({
            timeStr,
            label12,
            hour: h,
            minute: m,
            isNight: false,
            disabled,
          })
        }
      }
    } else if (selectedPeriod === 'evening') {
      for (let h = 17; h <= 21; h++) {
        for (const m of [0, 30]) {
          const totalSlotMinutes = h * 60 + m
          const disabled = isToday && totalSlotMinutes < cutoffMinutes
          const h12 = h % 12 === 0 ? 12 : h % 12
          const label12 = `${h12}:${String(m).padStart(2, '0')} PM`
          const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

          list.push({
            timeStr,
            label12,
            hour: h,
            minute: m,
            isNight: false,
            disabled,
          })
        }
      }
    } else if (selectedPeriod === 'night') {
      // 22:00, 22:30, 23:00, 23:30, 00:00, 00:30, ... 04:30
      const nightHours = [22, 23, 0, 1, 2, 3, 4]
      for (const h of nightHours) {
        for (const m of [0, 30]) {
          // calculate slot minutes
          const slotEffectiveMinutes = (h < 5 ? h + 24 : h) * 60 + m
          const curEffectiveMinutes = (curH < 5 ? curH + 24 : curH) * 60 + curM
          const disabled = isToday && slotEffectiveMinutes < curEffectiveMinutes + PRICING_CONFIG.minLeadHours * 60

          const h12 = h % 12 === 0 ? 12 : h % 12
          const ampm = h < 12 ? 'AM' : 'PM'
          const label12 = `${h12}:${String(m).padStart(2, '0')} ${ampm}`
          const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

          list.push({
            timeStr,
            label12,
            hour: h,
            minute: m,
            isNight: true,
            disabled,
          })
        }
      }
    }

    return list
  }, [selectedPeriod, isToday])

  // If currently selected slot falls in this period or another, compute arrival
  const selectedSlot = useMemo(() => {
    if (!selectedTimeStr) return null
    return slotsForPeriod.find((s) => s.timeStr === selectedTimeStr) || null
  }, [selectedTimeStr, slotsForPeriod])

  const destinationCity = direction === 'K2I' ? 'Indore' : 'Khargone'

  return (
    <section className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base font-black text-[#FBBF24]">5.</span>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          Choose time slot
        </h2>
      </div>

      {/* 1. Four Period Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
        {PERIODS.map((p) => {
          const isSelected = selectedPeriod === p.key
          const Icon = p.icon

          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setSelectedPeriod(p.key)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                isSelected
                  ? 'border-[#FBBF24] bg-amber-50/50 shadow-xs ring-2 ring-[#FBBF24]/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Icon
                  className={`w-4 h-4 ${
                    isSelected ? 'text-amber-800' : 'text-slate-500'
                  }`}
                />
                {p.key === 'night' && (
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border border-amber-200">
                    +Rs 300
                  </span>
                )}
              </div>

              <span className="text-xs sm:text-sm font-bold text-slate-900 block leading-tight">
                {p.label}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">{p.hours}</span>
            </button>
          )
        })}
      </div>

      {/* 2. Exact 30-min Pickup Time Chips */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 mb-4">
        <span className="text-xs font-bold text-slate-700 block mb-2.5">
          Select exact pickup time ({selectedPeriod.toUpperCase()}):
        </span>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {slotsForPeriod.map((slot) => {
            const isSelected = selectedTimeStr === slot.timeStr

            return (
              <button
                key={slot.timeStr}
                type="button"
                disabled={slot.disabled}
                onClick={() => onSelectTime(slot)}
                className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center ${
                  slot.disabled
                    ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                    : isSelected
                    ? 'border-[#FBBF24] bg-[#FBBF24] text-slate-950 shadow-xs ring-2 ring-[#FBBF24]/20'
                    : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400 cursor-pointer'
                }`}
              >
                {slot.label12}
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. Estimated Arrival & Driver Call banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
          <Clock className="w-4 h-4 text-[#FBBF24] flex-shrink-0" />
          <span>
            {selectedSlot ? (
              <>
                Estimated arrival in {destinationCity}: about{' '}
                <strong className="text-slate-950 font-bold">
                  {getEstimatedArrival(selectedSlot.hour, selectedSlot.minute)}
                </strong>
                .
              </>
            ) : (
              'Pick an exact time above to see estimated arrival.'
            )}
          </span>
        </div>

        <div className="flex items-center gap-1 text-slate-600">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span>Your driver will call you 30 minutes before pickup.</span>
        </div>
      </div>
    </section>
  )
}
