'use client'
// src/components/DatePicker.tsx

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface SelDate {
  date: Date
  str: string
  daysAhead: number
}

interface Props {
  selected: SelDate | null
  onSelect: (d: SelDate) => void
  waitingDates?: string[]
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_HEADERS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export function DatePicker({ selected, onSelect, waitingDates = [] }: Props) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1)
    // Mon=0 offset
    let dow = first.getDay() - 1; if (dow < 0) dow = 6
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    return { dow, daysInMonth }
  }, [viewYear, viewMonth])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // Build grid rows
  const gridItems: (number | null)[] = [
    ...Array(cells.dow).fill(null),
    ...Array.from({ length: cells.daysInMonth }, (_, i) => i + 1),
  ]
  while (gridItems.length % 7 !== 0) gridItems.push(null)

  const maxDate = new Date(today); maxDate.setDate(today.getDate() + 60)

  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid #E8E8E8',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Month navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        borderBottom: '1px solid #F0F0F0',
      }}>
        <button
          onClick={prevMonth}
          style={{
            width: 30, height: 30, borderRadius: '50%',
            background: '#F5F5F5', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#E8E8E8'}
          onMouseLeave={e => e.currentTarget.style.background = '#F5F5F5'}
        >
          <ChevronLeft size={16} color="#555" strokeWidth={2} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#111', letterSpacing: '-0.01em' }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          style={{
            width: 30, height: 30, borderRadius: '50%',
            background: '#F5F5F5', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#E8E8E8'}
          onMouseLeave={e => e.currentTarget.style.background = '#F5F5F5'}
        >
          <ChevronRight size={16} color="#555" strokeWidth={2} />
        </button>
      </div>

      {/* Day headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        padding: '10px 12px 4px',
        gap: 2,
      }}>
        {DAY_HEADERS.map(d => (
          <div key={d} style={{
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 600,
            color: '#999',
            padding: '4px 0',
            letterSpacing: '0.03em',
          }}>{d}</div>
        ))}
      </div>

      {/* Date grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        padding: '2px 12px 14px',
        gap: 2,
      }}>
        {gridItems.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />

          const cellDate = new Date(viewYear, viewMonth, day)
          cellDate.setHours(0,0,0,0)
          const str = cellDate.toISOString().split('T')[0]
          const daysAhead = Math.round((cellDate.getTime() - today.getTime()) / 86400000)
          const isPast     = cellDate <= today
          const isTooFar   = cellDate > maxDate
          const disabled   = isPast || isTooFar
          const isSel      = selected?.str === str
          const isToday    = cellDate.getTime() === today.getTime()
          const hasWaiting = waitingDates.includes(str)

          return (
            <div
              key={str}
              onClick={() => !disabled && onSelect({ date: cellDate, str, daysAhead })}
              style={{
                textAlign: 'center',
                padding: '7px 2px',
                borderRadius: 8,
                cursor: disabled ? 'default' : 'pointer',
                background: isSel ? '#FFC107' : 'transparent',
                color: disabled ? '#CCC' : isSel ? '#000' : '#111',
                fontWeight: isSel ? 700 : isToday ? 600 : 400,
                fontSize: 13,
                position: 'relative',
                transition: 'all 0.15s ease',
                userSelect: 'none',
              }}
              onMouseEnter={e => { if (!disabled && !isSel) e.currentTarget.style.background = '#F5F5F5' }}
              onMouseLeave={e => { if (!disabled && !isSel) e.currentTarget.style.background = 'transparent' }}
            >
              {day}
              {hasWaiting && !isSel && (
                <div style={{
                  position: 'absolute', bottom: 2, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: '50%',
                  background: '#22C55E',
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
