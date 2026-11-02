'use client'
// src/components/booking/SectionDate.tsx
import { useRef, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getPointFareForDate, PRICING_CONFIG } from '@/config/pricing'
import { BOOKING_CONFIG } from '@/lib/config'

export interface DateTileItem {
  dateStr: string // YYYY-MM-DD
  weekday: string // Mon, Tue...
  dayNum: string // 17, 18...
  month: string // Oct, Nov...
  daysAhead: number
  price: number
}

interface Props {
  pointId: string
  vehicle: 'sedan' | 'suv'
  direction: 'K2I' | 'I2K'
  selectedDateStr: string
  onSelectDate: (item: DateTileItem) => void
}

export function SectionDate({ pointId, vehicle, direction, selectedDateStr, onSelectDate }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const todayDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())

  const getDateItem = (dateStr: string): DateTileItem => {
    const [year, month, day] = dateStr.split('-').map(Number)
    const target = new Date(year, month - 1, day)
    const today = new Date(`${todayDateStr}T00:00:00`)
    const targetUtc = Date.UTC(year, month - 1, day)
    const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
    const daysAhead = Math.round((targetUtc - todayUtc) / 86_400_000)
    return {
      dateStr,
      weekday: target.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: String(day),
      month: target.toLocaleDateString('en-US', { month: 'short' }),
      daysAhead,
      price: getPointFareForDate(pointId, direction, daysAhead, undefined, dateStr) + (vehicle === 'suv' ? 500 : 0),
    }
  }

  // Generate 30 days from today in Asia/Kolkata
  const dateList = useMemo(() => {
    const list: DateTileItem[] = []
    const now = new Date()

    // Determine current date in Asia/Kolkata
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const parts = formatter.formatToParts(now)
    let y = now.getFullYear()
    let m = now.getMonth() + 1
    let d = now.getDate()
    for (const p of parts) {
      if (p.type === 'year') y = Number(p.value)
      if (p.type === 'month') m = Number(p.value)
      if (p.type === 'day') d = Number(p.value)
    }

    const todayStart = new Date(y, m - 1, d)

    // Keep the quick-pick strip short; later dates are available from the calendar.
    for (let i = 0; i < 14; i++) {
      const target = new Date(todayStart)
      target.setDate(todayStart.getDate() + i)

      const yearStr = target.getFullYear()
      const monthStr = String(target.getMonth() + 1).padStart(2, '0')
      const dayStr = String(target.getDate()).padStart(2, '0')
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`

      const weekday = target.toLocaleDateString('en-US', { weekday: 'short' })
      const dayNum = String(target.getDate())
      const month = target.toLocaleDateString('en-US', { month: 'short' })

      const price = getPointFareForDate(pointId, direction, i, undefined, dateStr) + (vehicle === 'suv' ? PRICING_CONFIG.SUV_EXTRA : 0)

      list.push({
        dateStr,
        weekday,
        dayNum,
        month,
        daysAhead: i,
        price,
      })
    }
    return list
  }, [pointId, vehicle, direction])

  // Scroll left and right handlers
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  // Active selected item
  const activeItem = dateList.find((d) => d.dateStr === selectedDateStr) || getDateItem(selectedDateStr)
  const maxDate = new Date(`${todayDateStr}T00:00:00`)
  maxDate.setDate(maxDate.getDate() + BOOKING_CONFIG.maxAdvanceDays)
  const maxDateStr = `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, '0')}-${String(maxDate.getDate()).padStart(2, '0')}`

  return (
    <section className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-8 shadow-xs">
      {/* Title & Legend Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base font-black text-[#FBBF24]">3.</span>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Select Travel Date
          </h2>
        </div>

        <span className="text-xs text-slate-500">Choose today, a quick-pick date, or any date up to 60 days ahead</span>
      </div>

      {/* Horizontally scrolling strip with arrows */}
      <div className="relative">
        <button
          type="button"
          onClick={() => scroll('left')}
          className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-slate-300 shadow-md items-center justify-center text-slate-700 hover:text-slate-950 hover:bg-slate-50 cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 px-0.5 scroll-smooth"
        >
          {dateList.map((item) => {
            const isSelected = item.dateStr === activeItem.dateStr

            return (
              <button
                key={item.dateStr}
                type="button"
                onClick={() => onSelectDate(item)}
                className={`flex-shrink-0 w-20 py-3 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer bg-slate-50 border-slate-200 text-slate-700 ${
                  isSelected
                    ? 'ring-2 ring-[#FBBF24] border-[#FBBF24] shadow-md scale-102 bg-white'
                    : 'hover:border-slate-400'
                }`}
              >
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {item.daysAhead === 0 ? 'Today' : item.daysAhead === 1 ? 'Tmrw' : item.weekday}
                </span>

                <span className="text-xl font-black text-slate-900 my-0.5">
                  {item.dayNum}
                </span>

                <span className="text-[10px] font-semibold text-slate-500">
                  {item.month}
                </span>

                <div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-slate-200/60 w-full justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24]" />
                  <span className="text-[11px] font-extrabold text-slate-900">
                    ₹{item.price}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => scroll('right')}
          className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-slate-300 shadow-md items-center justify-center text-slate-700 hover:text-slate-950 hover:bg-slate-50 cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
          <span>Choose a date</span>
          <input
            type="date"
            min={todayDateStr}
            max={maxDateStr}
            value={selectedDateStr}
            onChange={(event) => {
              if (event.target.value) onSelectDate(getDateItem(event.target.value))
            }}
            className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
          />
        </label>
        <span className="text-xs text-slate-500">Match Deal fare: ₹{activeItem.price.toLocaleString('en-IN')}</span>
      </div>

      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className={`rounded-full border px-2.5 py-1 font-bold ${activeItem.daysAhead >= 2 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
          {activeItem.daysAhead >= 2 ? 'High match chance' : 'Very low match chance'}
        </span>

        <span className="text-[11px] text-slate-500">
          Selected: <strong className="text-slate-900">{activeItem.weekday}, {activeItem.dayNum} {activeItem.month}</strong>
        </span>
      </div>
    </section>
  )
}
