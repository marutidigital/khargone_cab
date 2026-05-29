'use client'
// src/components/TimePicker.tsx

import { useState, useRef, useCallback, useEffect } from 'react'
import { TIME_SLOTS, isNightHour } from '@/lib/constants'

interface TimeVal { h: number; m: number }

interface Props {
  value: TimeVal | null
  onChange: (v: TimeVal | null) => void
}

type SlotKey = keyof typeof TIME_SLOTS

export function TimePicker({ value, onChange }: Props) {
  const [selSlot, setSelSlot] = useState<SlotKey | null>(null)
  const [dragging, setDragging] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  const timeStr = value
    ? `${String(value.h).padStart(2, '0')}:${String(value.m).padStart(2, '0')}`
    : '--:--'

  const isNight = value ? isNightHour(value.h) : false

  const selectSlot = (key: SlotKey) => {
    setSelSlot(key)
    const s = TIME_SLOTS[key]
    onChange({ h: s.defaultH % 24, m: s.defaultM })
  }

  const getAngleFromEvent = useCallback((e: MouseEvent | TouchEvent) => {
    if (!svgRef.current) return null
    const rect = svgRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    let angle = Math.atan2(clientY - cy, clientX - cx) + Math.PI / 2
    if (angle < 0) angle += Math.PI * 2
    return angle
  }, [])

  const applyAngle = useCallback((angle: number) => {
    if (!selSlot) return
    const totalH = (angle / (Math.PI * 2)) * 12
    let h = Math.floor(totalH)
    const m = Math.min(59, Math.round((totalH - h) * 60))
    const s = TIME_SLOTS[selSlot]

    if (selSlot === 'night') {
      let raw = h; if (raw < 5) raw += 12
      h = Math.max(22, Math.min(28, raw))
      onChange({ h: h >= 24 ? h - 24 : h, m })
    } else {
      h = Math.max(s.minH, Math.min(s.maxH, h))
      onChange({ h, m })
    }
  }, [selSlot, onChange])

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging) return
      const angle = getAngleFromEvent(e)
      if (angle !== null) applyAngle(angle)
      e.preventDefault()
    }
    const onUp = () => setDragging(false)

    document.addEventListener('mousemove', onMove)
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchend', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchend', onUp)
    }
  }, [dragging, getAngleFromEvent, applyAngle])

  // Clock hand angle
  const handAngle = value
    ? ((value.h % 12 + value.m / 60) / 12) * Math.PI * 2 - Math.PI / 2
    : -Math.PI / 2
  const r = 52
  const hx = 90 + r * Math.cos(handAngle)
  const hy = 90 + r * Math.sin(handAngle)

  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 10,
      padding: 16,
    }}>
      {/* Time display */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
      }}>
        <div style={{
          fontFamily: "'Instrument Serif', serif",
          fontSize: 42,
          letterSpacing: '-0.04em',
          color: 'var(--text)',
          lineHeight: 1,
        }}>
          {timeStr}
        </div>
        {isNight && (
          <div style={{
            fontSize: 10,
            letterSpacing: '0.06em',
            padding: '4px 10px',
            borderRadius: 20,
            background: 'var(--amber-dim)',
            color: 'var(--amber)',
            border: '1px solid rgba(212,132,58,0.2)',
          }}>
            NIGHT +₹300
          </div>
        )}
      </div>

      {/* Slots */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        gap: 6,
        marginBottom: 14,
      }}>
        {(Object.entries(TIME_SLOTS) as [SlotKey, typeof TIME_SLOTS[SlotKey]][]).map(([key, slot]) => {
          const active = selSlot === key
          return (
            <div
              key={key}
              onClick={() => selectSlot(key)}
              style={{
                padding: '8px 4px',
                background: active ? 'var(--gold-dim)' : 'var(--bg)',
                borderRadius: 8,
                border: active ? '1px solid var(--gold)' : '1px solid var(--line)',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                fontSize: 9,
                letterSpacing: '0.06em',
                color: active ? 'var(--gold)' : 'var(--muted)',
                textTransform: 'uppercase',
              }}>
                {slot.label}
              </div>
              <div style={{
                fontSize: 10,
                color: active ? 'var(--gold)' : 'var(--text)',
                marginTop: 2,
              }}>
                {slot.range}
              </div>
            </div>
          )
        })}
      </div>

      {/* Clock dial */}
      {selSlot && (
        <div style={{ position: 'relative', width: 180, height: 180, margin: '0 auto 10px' }}>
          <svg
            ref={svgRef}
            viewBox="0 0 180 180"
            style={{ width: '100%', height: '100%', cursor: 'pointer' }}
            onMouseDown={() => { if (selSlot) setDragging(true) }}
            onTouchStart={() => { if (selSlot) setDragging(true) }}
          >
            {/* Dial bg */}
            <circle cx="90" cy="90" r="85" fill="#1A1A18" />
            <circle cx="90" cy="90" r="85" fill="none" stroke="var(--line)" strokeWidth="1" />

            {/* Hour marks */}
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i / 12) * Math.PI * 2 - Math.PI / 2
              const r1 = 72, r2 = 78
              return (
                <line
                  key={i}
                  x1={90 + r1 * Math.cos(a)} y1={90 + r1 * Math.sin(a)}
                  x2={90 + r2 * Math.cos(a)} y2={90 + r2 * Math.sin(a)}
                  stroke="var(--muted2)" strokeWidth="1.5" strokeLinecap="round"
                />
              )
            })}

            {/* Center dot */}
            <circle cx="90" cy="90" r="3" fill="var(--gold)" />

            {/* Hour hand */}
            <line x1="90" y1="90" x2={hx} y2={hy}
              stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" />

            {/* Hit area */}
            <circle cx="90" cy="90" r="85" fill="transparent" />
          </svg>
        </div>
      )}
      {selSlot && (
        <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.04em' }}>
          Drag to fine-tune time
        </div>
      )}
    </div>
  )
}
