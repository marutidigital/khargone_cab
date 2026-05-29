'use client'
// src/components/TimePicker.tsx

import { TIME_SLOTS, isNightHour } from '@/lib/constants'

interface TimeVal { h: number; m: number }
interface Props {
  value: TimeVal | null
  onChange: (v: TimeVal | null) => void
}

type SlotKey = keyof typeof TIME_SLOTS

const SLOT_ICONS: Record<SlotKey, string> = {
  morning:   '🌅',
  afternoon: '☀️',
  evening:   '🌆',
  night:     '🌙',
}

const SLOT_RANGES: Record<SlotKey, string> = {
  morning:   '05:00 – 11:59',
  afternoon: '12:00 – 16:59',
  evening:   '17:00 – 21:59',
  night:     '22:00 – 04:59',
}

function getSlotForHour(h: number): SlotKey | null {
  if (h >= 5  && h <= 10) return 'morning'
  if (h >= 11 && h <= 16) return 'afternoon'
  if (h >= 17 && h <= 21) return 'evening'
  if (h >= 22 || h < 5)   return 'night'
  return null
}

export function TimePicker({ value, onChange }: Props) {
  const activeSlot = value ? getSlotForHour(value.h) : null
  const isNight    = value ? isNightHour(value.h) : false

  const selectSlot = (key: SlotKey) => {
    const s = TIME_SLOTS[key]
    onChange({ h: s.defaultH % 24, m: s.defaultM })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {(Object.keys(TIME_SLOTS) as SlotKey[]).map(key => {
          const active  = activeSlot === key
          const isNightSlot = key === 'night'
          return (
            <div
              key={key}
              id={`time-slot-${key}`}
              onClick={() => selectSlot(key)}
              style={{
                background: active
                  ? (isNightSlot ? '#FFF8E1' : '#FFFDE7')
                  : '#fff',
                border: active
                  ? `2px solid ${isNightSlot ? '#F59E0B' : '#FFC107'}`
                  : '1.5px solid #E8E8E8',
                borderRadius: 10,
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                boxShadow: active ? '0 2px 10px rgba(255,193,7,0.12)' : 'none',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = '#CCC' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = '#E8E8E8' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{SLOT_ICONS[key]}</span>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: active ? '#111' : '#333',
                    letterSpacing: '-0.01em',
                  }}>
                    {TIME_SLOTS[key].label}
                  </span>
                </div>
                {isNightSlot && (
                  <div style={{
                    background: '#FEF3C7',
                    border: '1px solid #FDE68A',
                    color: '#B45309',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 20,
                  }}>
                    +₹300
                  </div>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#888', letterSpacing: '0.01em' }}>
                {SLOT_RANGES[key]}
              </div>
            </div>
          )
        })}
      </div>

      {/* Night notice */}
      {isNight && (
        <div style={{
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: 8,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 12,
          color: '#92400E',
        }}>
          <span style={{ fontSize: 16 }}>ⓘ</span>
          Night charges of ₹300 will be added to your fare
        </div>
      )}
    </div>
  )
}
