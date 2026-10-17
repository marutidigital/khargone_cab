'use client'
// src/components/wizard/StepDateTime.tsx

import { useState, useMemo, useEffect } from 'react'
import { Calendar as CalendarIcon, Clock, Sun, Sunset, Moon, Sunrise, AlertCircle, Sparkles } from 'lucide-react'
import { PRICING_CONFIG, formatRs, isNightTime } from '@/config/pricing'

export interface SelectedDate {
  dateStr: string // YYYY-MM-DD
  daysAhead: number // 0 = today, 1 = tomorrow, etc.
  dayName: string // e.g. "Today", "Tomorrow", "Tue"
  fullLabel: string // e.g. "Tue 20 Oct 2026"
  surcharge: number
}

export interface SelectedTime {
  timeStr: string // "HH:MM" 24h
  label12: string // "9:30 AM"
  hour: number
  minute: number
  isNight: boolean
}

interface Props {
  selectedDate: SelectedDate | null
  selectedTime: SelectedTime | null
  onSelectDate: (d: SelectedDate) => void
  onSelectTime: (t: SelectedTime) => void
  onNext: () => void
}

// Helper to get current Indian standard time (IST: Asia/Kolkata)
function getIndiaTime() {
  const now = new Date()
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = dtf.formatToParts(now)
  let year = now.getFullYear()
  let month = now.getMonth() + 1
  let day = now.getDate()
  let hour = now.getHours()
  let minute = now.getMinutes()

  for (const p of parts) {
    if (p.type === 'year') year = Number(p.value)
    if (p.type === 'month') month = Number(p.value)
    if (p.type === 'day') day = Number(p.value)
    if (p.type === 'hour') hour = Number(p.value)
    if (p.type === 'minute') minute = Number(p.value)
  }

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return { year, month, day, hour, minute, dateStr }
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export function StepDateTime({
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  onNext,
}: Props) {
  // Compute India current time on client
  const [indiaNow, setIndiaNow] = useState(getIndiaTime)

  useEffect(() => {
    setIndiaNow(getIndiaTime())
    const interval = setInterval(() => setIndiaNow(getIndiaTime()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Generate next 45 days at runtime starting strictly from today (Day 0) in Asia/Kolkata
  const dateList: SelectedDate[] = useMemo(() => {
    const list: SelectedDate[] = []
    const baseDate = new Date(Date.UTC(indiaNow.year, indiaNow.month - 1, indiaNow.day, 12, 0, 0))

    for (let i = 0; i < 45; i++) {
      const cur = new Date(baseDate.getTime() + i * 86400000)
      const y = cur.getUTCFullYear()
      const m = cur.getUTCMonth() + 1
      const d = cur.getUTCDate()
      const dayOfWeek = cur.getUTCDay()

      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      let dayName = DAY_SHORT[dayOfWeek]
      if (i === 0) dayName = 'Today'
      else if (i === 1) dayName = 'Tomorrow'

      const surcharge =
        i === 0
          ? PRICING_CONFIG.sameDaySurcharge
          : i === 1
          ? PRICING_CONFIG.nextDaySurcharge
          : 0

      const fullLabel = `${DAY_SHORT[dayOfWeek]} ${d} ${MONTH_SHORT[m - 1]} ${y}`

      list.push({
        dateStr,
        daysAhead: i,
        dayName,
        fullLabel,
        surcharge,
      })
    }
    return list
  }, [indiaNow.year, indiaNow.month, indiaNow.day])

  // Select today by default if nothing selected yet
  useEffect(() => {
    if (!selectedDate && dateList.length > 0) {
      onSelectDate(dateList[0])
    }
  }, [dateList, selectedDate, onSelectDate])

  // Time slots in 30-min intervals grouped by period
  const timePeriods = useMemo(() => {
    const slots: Array<{
      group: 'Morning' | 'Afternoon' | 'Evening' | 'Night'
      icon: any
      range: string
      slots: SelectedTime[]
    }> = [
      {
        group: 'Morning',
        icon: <Sunrise className="w-4 h-4 text-amber-500" />,
        range: '05:00 AM – 11:30 AM',
        slots: [],
      },
      {
        group: 'Afternoon',
        icon: <Sun className="w-4 h-4 text-orange-500" />,
        range: '12:00 PM – 04:30 PM',
        slots: [],
      },
      {
        group: 'Evening',
        icon: <Sunset className="w-4 h-4 text-indigo-500" />,
        range: '05:00 PM – 09:30 PM',
        slots: [],
      },
      {
        group: 'Night',
        icon: <Moon className="w-4 h-4 text-purple-400" />,
        range: '10:00 PM – 04:30 AM',
        slots: [],
      },
    ]

    for (let h = 0; h < 24; h++) {
      for (const m of [0, 30]) {
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        const h12 = h % 12 === 0 ? 12 : h % 12
        const ampm = h < 12 ? 'AM' : 'PM'
        const label12 = `${h12}:${String(m).padStart(2, '0')} ${ampm}`
        const isNight = isNightTime(h)

        const item: SelectedTime = {
          timeStr,
          label12,
          hour: h,
          minute: m,
          isNight,
        }

        if (h >= 5 && h < 12) {
          slots[0].slots.push(item)
        } else if (h >= 12 && h < 17) {
          slots[1].slots.push(item)
        } else if (h >= 17 && h < 22) {
          slots[2].slots.push(item)
        } else {
          // Night (22:00 to 04:30)
          slots[3].slots.push(item)
        }
      }
    }

    return slots
  }, [])

  // For today: disable slots earlier than (now + minLeadHours) in Asia/Kolkata
  const isToday = selectedDate?.daysAhead === 0
  const minAllowedMinutes = indiaNow.hour * 60 + indiaNow.minute + PRICING_CONFIG.minLeadHours * 60

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-[#F5B841]" />
          Select Date & Exact Pickup Time
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Showing next 45 days in Asia/Kolkata timezone. Diwali week is fully open for advance booking.
        </p>
      </div>

      {/* ── 1. DATE PICKER (45 Days scrollable row) ── */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            1. Travel Date ({dateList.length} Days Available)
          </label>
          {selectedDate && (
            <span className="text-xs font-semibold text-slate-500">
              Selected: <strong className="text-slate-900">{selectedDate.fullLabel}</strong>
            </span>
          )}
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-slate-300">
          {dateList.map((d) => {
            const isSelected = selectedDate?.dateStr === d.dateStr
            const [y, m, dayNum] = d.dateStr.split('-')
            const monthName = MONTH_SHORT[Number(m) - 1]

            return (
              <button
                key={d.dateStr}
                type="button"
                onClick={() => onSelectDate(d)}
                aria-pressed={isSelected}
                className={`flex-shrink-0 w-20 py-3 px-1.5 rounded-2xl border-2 text-center transition-all duration-150 min-h-[76px] flex flex-col items-center justify-between ${
                  isSelected
                    ? 'border-[#F5B841] bg-amber-50 shadow-md ring-2 ring-[#F5B841]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    d.daysAhead === 0 ? 'text-[#B45309]' : d.daysAhead === 1 ? 'text-indigo-600' : 'text-slate-500'
                  }`}
                >
                  {d.dayName}
                </span>

                <span className="text-2xl font-black text-slate-900 tracking-tight leading-none my-1">
                  {Number(dayNum)}
                </span>

                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  {monthName}
                </span>

                {/* Surcharge or Free badge */}
                {d.surcharge > 0 ? (
                  <span className="text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded-full mt-1.5 leading-tight">
                    +{formatRs(d.surcharge)}
                  </span>
                ) : (
                  <span className="text-[9px] font-semibold text-emerald-700 mt-1.5">
                    Standard
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Date surcharge notice banner */}
        {selectedDate && selectedDate.surcharge > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 mt-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>{selectedDate.dayName} Booking:</strong> +{formatRs(selectedDate.surcharge)} rush arrangement surcharge applies for {selectedDate.dayName.toLowerCase()} dispatch.
            </span>
          </div>
        )}
      </div>

      {/* ── 2. TIME PICKER (30-Minute Slots) ── */}
      <div className="border-t border-slate-200 pt-5">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#F5B841]" />
            2. Choose 30-Minute Pickup Time
          </label>
          {isToday && (
            <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              Min {PRICING_CONFIG.minLeadHours}h advance lead time
            </span>
          )}
        </div>

        {/* Periods */}
        <div className="space-y-4">
          {timePeriods.map((period) => (
            <div key={period.group} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {period.icon}
                  <span className="text-xs font-bold text-slate-900">{period.group}</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">{period.range}</span>
              </div>

              {/* Slot buttons grid */}
              <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 gap-2">
                {period.slots.map((s) => {
                  const slotMinutes = s.hour * 60 + s.minute
                  const isDisabled = isToday && slotMinutes < minAllowedMinutes
                  const isSelected = selectedTime?.timeStr === s.timeStr

                  return (
                    <button
                      key={s.timeStr}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => onSelectTime(s)}
                      aria-pressed={isSelected}
                      className={`p-2.5 rounded-xl border text-center transition-all min-h-[48px] flex flex-col items-center justify-center ${
                        isDisabled
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                          : isSelected
                          ? 'bg-[#F5B841] text-slate-950 font-extrabold border-[#E5A630] shadow-md ring-2 ring-[#F5B841]/30'
                          : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300 font-semibold'
                      }`}
                    >
                      <span className="text-xs leading-none">{s.label12}</span>
                      {s.isNight && (
                        <span
                          className={`text-[9px] font-bold mt-1 px-1 rounded ${
                            isSelected ? 'bg-slate-950 text-[#F5B841]' : 'text-purple-700 bg-purple-50'
                          }`}
                        >
                          +{formatRs(PRICING_CONFIG.nightSurcharge)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Driver call guarantee */}
      <div className="bg-slate-900 text-slate-200 rounded-xl p-3.5 text-xs flex items-center gap-2.5">
        <Clock className="w-4 h-4 text-[#F5B841] flex-shrink-0" />
        <span>
          <strong>On-time assurance:</strong> Your driver will call you{' '}
          <strong>{PRICING_CONFIG.driverCallMinutesBefore} minutes before pickup</strong> to confirm location.
        </span>
      </div>
    </div>
  )
}
