'use client'
// src/components/StepBar.tsx

import { Check } from 'lucide-react'

const STEPS = [
  { num: 1, label: 'Route' },
  { num: 2, label: 'Vehicle' },
  { num: 3, label: 'Drop Point' },
  { num: 4, label: 'Date & Time' },
  { num: 5, label: 'Passenger Details' },
  { num: 6, label: 'Payment' },
]

interface Props {
  current: number // 1-indexed
}

export function StepBar({ current }: Props) {
  return (
    <div className="step-bar" style={{
      background: '#fff',
      borderBottom: '1px solid var(--line)',
      padding: '0 40px',
    }}>
      <div className="step-scroll" style={{
        display: 'flex',
        alignItems: 'center',
        height: 52,
        gap: 0,
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {STEPS.map((step, i) => {
          const done   = step.num < current
          const active = step.num === current
          return (
            <div key={step.num} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {/* Step item */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Circle */}
                <div style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                  transition: 'all 0.3s ease',
                  background: done ? '#FFC107' : active ? '#FFC107' : 'transparent',
                  border: done ? 'none' : active ? 'none' : '1.5px solid #CCC',
                  color: done ? '#000' : active ? '#000' : '#999',
                }}>
                  {done ? (
                    <Check size={14} strokeWidth={3} color="#000" />
                  ) : step.num}
                </div>

                {/* Label */}
                <span style={{
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: done ? '#111' : active ? '#111' : '#AAA',
                  letterSpacing: '-0.01em',
                  transition: 'all 0.2s',
                }}>
                  {step.label}
                </span>
              </div>

              {/* Connector */}
              {i < STEPS.length - 1 && (
                <div style={{
                  width: 40,
                  height: 1,
                  margin: '0 10px',
                  background: done ? '#FFC107' : '#E0E0E0',
                  borderTop: done ? 'none' : '1px dashed #DDD',
                  transition: 'background 0.3s ease',
                  flexShrink: 0,
                }} />
              )}
            </div>
          )
        })}
      </div>
      <style>{`.step-scroll::-webkit-scrollbar{display:none}`}</style>
    </div>
  )
}
