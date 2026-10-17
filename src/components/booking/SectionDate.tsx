'use client'
// src/components/booking/SectionDate.tsx
import { useState, useRef, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { calculateDateFare, formatRs, PRICING_CONFIG } from '@/config/pricing'

export interface DateTileItem {
  dateStr: string // YYYY-MM-DD
  weekday: string // Mon, Tue...
  dayNum: string // 17, 18...
  month: string // Oct, Nov...
  daysAhead: number
  price: number
  tier: 'grey' | 'purple' | 'yellow' | 'green'
}

interface Props {
  direction: 'K2I' | 'I2K'
  selectedDateStr: string
  onSelectDate: (item: DateTileItem) => void
}

export function SectionDate({ direction, selectedDateStr, onSelectDate }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

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

    // Generate 45 days from today in Asia/Kolkata
    for (let i = 0; i < 45; i++) {
      const target = new Date(todayStart)
      target.setDate(todayStart.getDate() + i)

      const yearStr = target.getFullYear()
      const monthStr = String(target.getMonth() + 1).padStart(2, '0')
      const dayStr = String(target.getDate()).padStart(2, '0')
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`

      const weekday = target.toLocaleDateString('en-US', { weekday: 'short' })
      const dayNum = String(target.getDate())
      const month = target.toLocaleDateString('en-US', { month: 'short' })

      const price = calculateDateFare(direction, i)

      let tier: 'grey' | 'purple' | 'yellow' | 'green' = 'grey'
      if (i === 2) tier = 'purple'
      else if (i === 3) tier = 'yellow'
      else if (i >= 4) tier = 'green'

      list.push({
        dateStr,
        weekday,
        dayNum,
        month,
        daysAhead: i,
        price,
        tier,
      })
    }
    return list
  }, [direction])

  // Scroll left and right handlers
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  // Active selected item
  const activeItem = dateList.find((d) => d.dateStr === selectedDateStr) || dateList[0]
  const standardPrice = PRICING_CONFIG.BASE[direction]
  const savedAmount = Math.max(0, standardPrice - activeItem.price)

  return (
    <section className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs">
      {/* Title & Legend Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base font-black text-[#FBBF24]">4.</span>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Select Travel Date
          </h2>
        </div>

        {/* 4-level price legend */}
        <div className="flex items-center gap-2.5 sm:gap-3 text-[11px] text-slate-600 font-medium overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span>0-1d</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" />
            <span>2d</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]" />
            <span>3d</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
            <span>4d+ Best</span>
          </div>
        </div>
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

            let colorClasses = 'bg-slate-50 border-slate-200 text-slate-700'
            let dotColor = 'bg-slate-400'

            if (item.tier === 'purple') {
              colorClasses = 'bg-purple-50/70 border-purple-200 text-purple-900'
              dotColor = 'bg-[#7C3AED]'
            } else if (item.tier === 'yellow') {
              colorClasses = 'bg-amber-50/70 border-amber-200 text-amber-900'
              dotColor = 'bg-[#FBBF24]'
            } else if (item.tier === 'green') {
              colorClasses = 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              dotColor = 'bg-[#16A34A]'
            }

            return (
              <button
                key={item.dateStr}
                type="button"
                onClick={() => onSelectDate(item)}
                className={`flex-shrink-0 w-20 py-3 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer ${colorClasses} ${
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
                  <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
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

      {/* "You save Rs X by booking this early" */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        {savedAmount > 0 ? (
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
            <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>You save {formatRs(savedAmount)} by booking this early!</span>
          </div>
        ) : (
          <span className="text-slate-500">
            Standard dynamic base fare for today/tomorrow.
          </span>
        )}

        <span className="text-[11px] text-slate-500">
          Selected: <strong className="text-slate-900">{activeItem.weekday}, {activeItem.dayNum} {activeItem.month}</strong>
        </span>
      </div>
    </section>
  )
}
