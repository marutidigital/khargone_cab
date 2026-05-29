'use client'
// src/components/DatePicker.tsx

import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface SelDate {
  date: Date
  str:  string
  daysAhead: number
}

interface Props {
  selected:     SelDate | null
  onSelect:     (d: SelDate) => void
  waitingDates?: string[]
}

const DAY_NAMES  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

/** Returns colour config based on daysAhead (early-bird discount tier) */
function getPriceTier(daysAhead: number) {
  if (daysAhead >= 4) return {
    discount: 300,
    label:    '₹300 OFF',
    bg:       '#DCFCE7',
    text:     '#15803D',
    border:   '#86EFAC',
    dot:      '#22C55E',
    glow:     'rgba(34,197,94,0.20)',
    selBg:    '#16A34A',
  }
  if (daysAhead === 3) return {
    discount: 200,
    label:    '₹200 OFF',
    bg:       '#FEF9C3',
    text:     '#854D0E',
    border:   '#FDE047',
    dot:      '#EAB308',
    glow:     'rgba(234,179,8,0.20)',
    selBg:    '#CA8A04',
  }
  if (daysAhead === 2) return {
    discount: 100,
    label:    '₹100 OFF',
    bg:       '#F3E8FF',
    text:     '#6B21A8',
    border:   '#C084FC',
    dot:      '#A855F7',
    glow:     'rgba(168,85,247,0.20)',
    selBg:    '#7E22CE',
  }
  return {
    discount: 0,
    label:    'No Disc.',
    bg:       '#F3F4F6',
    text:     '#6B7280',
    border:   '#E5E7EB',
    dot:      '#9CA3AF',
    glow:     'rgba(0,0,0,0.05)',
    selBg:    '#374151',
  }
}

export function DatePicker({ selected, onSelect, waitingDates = [] }: Props) {
  const today = useMemo(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d
  }, [])

  // Build 60 days of future dates starting from tomorrow
  const days = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() + i + 1)
      d.setHours(0,0,0,0)
      const str = d.toISOString().split('T')[0]
      return { date: d, str, daysAhead: i + 1 }
    })
  }, [today])

  const stripRef  = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLDivElement>(null)

  // Scroll selected into view on mount/change
  useEffect(() => {
    if (selectedRef.current && stripRef.current) {
      const el = selectedRef.current
      const strip = stripRef.current
      const elLeft = el.offsetLeft
      const elWidth = el.offsetWidth
      const stripWidth = strip.offsetWidth
      strip.scrollTo({ left: elLeft - stripWidth / 2 + elWidth / 2, behavior: 'smooth' })
    }
  }, [selected])

  const scroll = (dir: 'left' | 'right') => {
    if (!stripRef.current) return
    stripRef.current.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' })
  }

  return (
    <div style={{ background: '#fff', border: '1.5px solid #E8E8E8', borderRadius: 14, overflow: 'hidden' }}>

      {/* Legend row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px 8px',
        borderBottom: '1px solid #F0F0F0',
        flexWrap: 'wrap', gap: 6,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#333', letterSpacing: '-0.01em' }}>
          Select Travel Date
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: '₹300 OFF', bg: '#DCFCE7', text: '#15803D', dot: '#22C55E' },
            { label: '₹200 OFF', bg: '#FEF9C3', text: '#854D0E', dot: '#EAB308' },
            { label: '₹100 OFF', bg: '#F3E8FF', text: '#6B21A8', dot: '#A855F7' },
            { label: 'No Disc.',  bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: item.bg, borderRadius: 20,
              padding: '2px 8px',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.dot, flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: item.text }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll strip */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>

        {/* Left arrow */}
        <button
          onClick={() => scroll('left')}
          style={{
            position: 'absolute', left: 0, zIndex: 10,
            width: 32, height: '100%',
            background: 'linear-gradient(to right, #fff 60%, transparent)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
            paddingLeft: 4,
          }}
        >
          <ChevronLeft size={18} color="#555" strokeWidth={2.5} />
        </button>

        {/* Scrollable date strip */}
        <div
          ref={stripRef}
          style={{
            display: 'flex',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            padding: '12px 36px',
            gap: 8,
            msOverflowStyle: 'none',
          }}
        >
          <style>{`
            div::-webkit-scrollbar { display: none; }
            @keyframes popIn {
              0%   { transform: scale(0.9); opacity: 0.5; }
              100% { transform: scale(1);   opacity: 1;   }
            }
          `}</style>

          {days.map(({ date, str, daysAhead }) => {
            const tier    = getPriceTier(daysAhead)
            const isSel   = selected?.str === str
            const hasWait = waitingDates.includes(str)

            return (
              <div
                key={str}
                ref={isSel ? selectedRef : undefined}
                onClick={() => onSelect({ date, str, daysAhead })}
                style={{
                  flexShrink: 0,
                  width: 68,
                  borderRadius: 12,
                  cursor: 'pointer',
                  border: isSel
                    ? `2px solid ${tier.selBg}`
                    : `1.5px solid ${tier.border}`,
                  background: isSel ? tier.selBg : tier.bg,
                  boxShadow: isSel
                    ? `0 4px 16px ${tier.glow}`
                    : `0 2px 8px ${tier.glow}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '10px 4px 8px',
                  transition: 'all 0.18s ease',
                  animation: isSel ? 'popIn 0.2s ease-out' : undefined,
                  position: 'relative',
                  userSelect: 'none',
                }}
                onMouseEnter={e => {
                  if (!isSel) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = `0 6px 20px ${tier.glow}`
                  }
                }}
                onMouseLeave={e => {
                  if (!isSel) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = `0 2px 8px ${tier.glow}`
                  }
                }}
              >
                {/* Day name */}
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  color: isSel ? 'rgba(255,255,255,0.85)' : tier.text,
                  marginBottom: 3,
                  textTransform: 'uppercase',
                }}>
                  {DAY_NAMES[date.getDay()]}
                </span>

                {/* Date number */}
                <span style={{
                  fontSize: 26,
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: '-0.04em',
                  color: isSel ? '#fff' : '#111',
                  marginBottom: 2,
                }}>
                  {date.getDate()}
                </span>

                {/* Month */}
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  color: isSel ? 'rgba(255,255,255,0.75)' : '#888',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                }}>
                  {MONTH_NAMES[date.getMonth()]}
                </span>

                {/* Discount badge */}
                <div style={{
                  background: isSel ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.70)',
                  borderRadius: 20,
                  padding: '2px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}>
                  {!isSel && (
                    <div style={{
                      width: 5, height: 5,
                      borderRadius: '50%',
                      background: tier.dot,
                      flexShrink: 0,
                    }} />
                  )}
                  <span style={{
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    color: isSel ? '#fff' : tier.text,
                    whiteSpace: 'nowrap',
                  }}>
                    {tier.label}
                  </span>
                </div>

                {/* Waiting dot indicator */}
                {hasWait && !isSel && (
                  <div style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 7, height: 7,
                    borderRadius: '50%',
                    background: '#FFC107',
                    border: '1.5px solid #fff',
                  }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll('right')}
          style={{
            position: 'absolute', right: 0, zIndex: 10,
            width: 32, height: '100%',
            background: 'linear-gradient(to left, #fff 60%, transparent)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            paddingRight: 4,
          }}
        >
          <ChevronRight size={18} color="#555" strokeWidth={2.5} />
        </button>
      </div>

      {/* Selected date info bar */}
      {selected && (() => {
        const tier = getPriceTier(selected.daysAhead)
        return (
          <div style={{
            borderTop: '1px solid #F0F0F0',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>
              {selected.date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            {tier.discount > 0 ? (
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: tier.text,
                background: tier.bg,
                padding: '3px 10px', borderRadius: 20,
                border: `1px solid ${tier.border}`,
              }}>
                Early Bird: −₹{tier.discount}
              </span>
            ) : (
              <span style={{ fontSize: 11, color: '#AAA', fontWeight: 500 }}>Standard fare</span>
            )}
          </div>
        )
      })()}
    </div>
  )
}
