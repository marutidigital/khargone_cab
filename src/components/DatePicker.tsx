'use client'
// src/components/DatePicker.tsx

import { useMemo } from 'react'
import { MONTHS, DAYS, getDiscount } from '@/lib/constants'

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

export function DatePicker({ selected, onSelect, waitingDates = [] }: Props) {
  const dates = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() + i + 1)
      const str = d.toISOString().split('T')[0]
      return { date: d, str, daysAhead: i + 1 }
    })
  }, [])

  return (
    <>
      <div style={{
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        paddingBottom: 4,
        scrollbarWidth: 'none',
      }}
      className="date-scroll"
      >
        {dates.map(({ date, str, daysAhead }) => {
          const sel     = selected?.str === str
          const disc    = getDiscount(daysAhead)
          const hasMatch = waitingDates.includes(str)
          return (
            <div
              key={str}
              onClick={() => onSelect({ date, str, daysAhead })}
              style={{
                flexShrink: 0,
                width: 52,
                background: sel ? 'var(--gold-dim)' : 'var(--surface)',
                borderRadius: 10,
                padding: '10px 6px',
                textAlign: 'center',
                cursor: 'pointer',
                border: sel ? '1px solid var(--gold)' : hasMatch ? '1px solid rgba(76,175,130,0.3)' : '1px solid transparent',
                transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              {hasMatch && (
                <div style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--green)',
                }} />
              )}
              <div style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: 20,
                color: sel ? 'var(--gold)' : 'var(--text)',
                lineHeight: 1,
              }}>
                {date.getDate()}
              </div>
              <div style={{
                fontSize: 9,
                color: sel ? 'var(--gold)' : 'var(--muted)',
                textTransform: 'uppercase',
                marginTop: 3,
                letterSpacing: '0.06em',
              }}>
                {MONTHS[date.getMonth()]}
              </div>
              <div style={{
                fontSize: 9,
                color: 'var(--muted2)',
                marginTop: 1,
                letterSpacing: '0.04em',
              }}>
                {DAYS[date.getDay()]}
              </div>
              <div style={{
                fontSize: 8,
                fontWeight: 500,
                marginTop: 3,
                letterSpacing: '0.02em',
                color: disc > 0 ? 'var(--green)' : 'var(--muted2)',
              }}>
                {disc > 0 ? `−₹${disc}` : '—'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Early discount notice */}
      {selected && getDiscount(selected.daysAhead) > 0 && (
        <div style={{
          background: 'var(--green-dim)',
          border: '1px solid rgba(76,175,130,0.18)',
          borderRadius: 8,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 10,
        }}>
          <div style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: 22,
            color: 'var(--green)',
            flexShrink: 0,
            letterSpacing: '-0.03em',
          }}>
            −₹{getDiscount(selected.daysAhead)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--green)', fontWeight: 400 }}>Early bird discount!</strong>
            {' '}
            {selected.daysAhead >= 4 ? '4+ days early — ₹300 off applied!'
              : selected.daysAhead === 3 ? '3 days early — ₹200 off applied!'
              : '2 days early — ₹100 off applied!'}
          </div>
        </div>
      )}

      <style>{`.date-scroll::-webkit-scrollbar{display:none}`}</style>
    </>
  )
}
