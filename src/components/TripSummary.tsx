'use client'
// src/components/TripSummary.tsx

import type { PriceBreakdown } from '@/types'
import type { VehicleType } from '@/components/VehicleSelector'
import { CircleDot, MapPin, Car, CreditCard, ArrowRight, ShieldCheck, CheckCircle2, Phone } from 'lucide-react'

interface Props {
  dir: 'KI' | 'IK'
  vehicle: VehicleType
  dropName: string | null
  dropExtra: number
  dateStr: string | null
  timeSlot: string | null
  timeLabel: string | null
  price: PriceBreakdown | null
  onContinue: () => void
  continueDisabled: boolean
}

export function TripSummary({
  dir, vehicle, dropName, dropExtra,
  dateStr, timeSlot, timeLabel,
  price, onContinue, continueDisabled,
}: Props) {
  const from = dir === 'KI' ? 'Indore'   : 'Khargone'
  const to   = dir === 'KI' ? 'Khargone' : 'Indore'
  const fromSub = dir === 'KI' ? 'Indore, Madhya Pradesh'   : 'Khargone, Madhya Pradesh'
  const toSub   = dir === 'KI' ? 'Khargone, Madhya Pradesh' : 'Indore, Madhya Pradesh'
  const vehicleLabel = vehicle === 'sedan' ? 'Economy Sedan (5 Seater)' : 'Premium SUV (7 Seater)'
  const isNight = timeSlot === 'night'

  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid #E8E8E8',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 20px 14px',
        borderBottom: '1px solid #F0F0F0',
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111', letterSpacing: '-0.02em', marginBottom: 16 }}>
          Your trip summary
        </h3>

        {/* Route */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            {/* From */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <CircleDot size={12} color="#22C55E" strokeWidth={3} style={{ marginTop: 4, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111', letterSpacing: '-0.01em' }}>{from}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{fromSub}</div>
              </div>
            </div>

            {/* Line connector */}
            <div style={{ marginLeft: 5, width: 1, height: 12, background: '#E0E0E0', marginBottom: 10, marginTop: -6 }} />

            {/* To */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <MapPin size={12} color="#EF4444" fill="#EF4444" strokeWidth={1} style={{ marginTop: 4, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111', letterSpacing: '-0.01em' }}>{to}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{toSub}</div>
              </div>
            </div>
          </div>

          {/* Car icon */}
          <div style={{
            width: 60, height: 60,
            background: '#FFFDE7',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid #FFF9C4',
          }}>
            <Car size={26} color="#F59E0B" strokeWidth={1.8} />
          </div>
        </div>
      </div>

      {/* Details */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #F0F0F0' }}>
        <SummaryRow label="Vehicle" value={vehicleLabel} />
        <SummaryRow
          label="Drop point"
          value={dropName ?? '—'}
          sub={dropExtra > 0 ? `+₹${dropExtra}` : undefined}
          subColor="#F59E0B"
        />
        <SummaryRow label="Date" value={dateStr ?? '—'} />
        <SummaryRow
          label="Time"
          value={timeLabel ?? '—'}
          sub={isNight ? '+₹300' : undefined}
          subColor="#F59E0B"
        />
      </div>

      {/* Price breakdown */}
      {price && (
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F0F0F0' }}>
          <PriceRow label="Base fare"          value={`₹${price.base.toLocaleString('en-IN')}`} />
          {price.extra > 0 && (
            <PriceRow label="Drop point charges" value={`+₹${price.extra.toLocaleString('en-IN')}`} />
          )}
          {price.discount > 0 && (
            <PriceRow label="Early discount"     value={`−₹${price.discount.toLocaleString('en-IN')}`} accent="green" />
          )}
          {price.night_extra > 0 && (
            <PriceRow label="Night charges"      value={`+₹${price.night_extra.toLocaleString('en-IN')}`} accent="amber" />
          )}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px dashed #E8E8E8',
          }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>Total Fare</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#111', letterSpacing: '-0.03em' }}>
              ₹{price.total.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      )}

      {/* Advance notice */}
      {price && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #F0F0F0' }}>
          <div style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 8,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: '#DCFCE7', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <CreditCard size={16} color="#16A34A" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#15803D', letterSpacing: '-0.01em' }}>
                Pay Only ₹500 Advance
              </div>
              <div style={{ fontSize: 11, color: '#166534', marginTop: 2, lineHeight: 1.4 }}>
                Rest amount to be paid to driver after the ride is completed.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{ padding: '14px 20px' }}>
        <button
          onClick={onContinue}
          disabled={continueDisabled}
          id="trip-summary-continue-btn"
          style={{
            width: '100%',
            padding: '14px 20px',
            background: continueDisabled ? '#E0E0E0' : '#FFC107',
            color: continueDisabled ? '#AAA' : '#000',
            border: 'none',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '-0.01em',
            cursor: continueDisabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: continueDisabled ? 'none' : '0 4px 14px rgba(255,193,7,0.35)',
          }}
          onMouseEnter={e => { if (!continueDisabled) { e.currentTarget.style.background = '#F9A825'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
          onMouseLeave={e => { if (!continueDisabled) { e.currentTarget.style.background = '#FFC107'; e.currentTarget.style.transform = 'translateY(0)' } }}
        >
          {continueDisabled ? 'Complete selections above' : 'Continue to passenger details'}
          {!continueDisabled && (
            <ArrowRight size={16} color="#000" strokeWidth={2} />
          )}
        </button>

        {/* Trust badges */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          marginTop: 16,
        }}>
          {[
            { icon: <ShieldCheck size={18} color="#16A34A" strokeWidth={2} />, text: 'No Hidden\nCharges' },
            { icon: <CheckCircle2 size={18} color="#16A34A" strokeWidth={2} />, text: 'Everything\nIncluded' },
            { icon: <Car size={18} color="#16A34A" strokeWidth={2} />, text: 'Safe &\nReliable' },
            { icon: <Phone size={18} color="#16A34A" strokeWidth={2} />, text: '24/7\nSupport' },
          ].map((b, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ marginBottom: 4, display: 'flex' }}>{b.icon}</div>
              <div style={{ fontSize: 9, color: '#888', lineHeight: 1.4, whiteSpace: 'pre-line', fontWeight: 500 }}>{b.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ label, value, sub, subColor }: {
  label: string; value: string; sub?: string; subColor?: string
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
      gap: 12,
    }}>
      <span style={{ fontSize: 12, color: '#888', flexShrink: 0 }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{value}</span>
        {sub && (
          <span style={{ fontSize: 11, color: subColor ?? '#F59E0B', marginLeft: 6, fontWeight: 600 }}>{sub}</span>
        )}
      </div>
    </div>
  )
}

function PriceRow({ label, value, accent }: { label: string; value: string; accent?: 'green' | 'amber' }) {
  const color = accent === 'green' ? '#16A34A' : accent === 'amber' ? '#D97706' : '#333'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
      <span style={{ fontSize: 12, color: '#888' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{value}</span>
    </div>
  )
}
