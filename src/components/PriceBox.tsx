'use client'
// src/components/PriceBox.tsx

import type { PriceBreakdown } from '@/types'

interface Props {
  price: PriceBreakdown
  dropName: string
}

export function PriceBox({ price, dropName }: Props) {
  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 10,
      border: '1px solid var(--line)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: 16,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: 48,
            color: 'var(--gold)',
            letterSpacing: '-0.04em',
            lineHeight: 1,
          }}>
            ₹{price.total.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
            Full Dzire AC · 1–4 passengers
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <PriceRow label={`Base (${dropName})`} value={`₹${price.base.toLocaleString('en-IN')}`} />
          {price.extra > 0 && (
            <PriceRow label="Drop extra" value={`+₹${price.extra.toLocaleString('en-IN')}`} accent="gold" />
          )}
          {price.discount > 0 && (
            <PriceRow label="Early discount" value={`−₹${price.discount.toLocaleString('en-IN')}`} accent="green" />
          )}
          {price.night_extra > 0 && (
            <PriceRow label="Night surcharge" value={`+₹${price.night_extra.toLocaleString('en-IN')}`} accent="amber" />
          )}
        </div>
      </div>
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--line)',
        fontSize: 10,
        color: 'var(--muted)',
        letterSpacing: '0.02em',
        lineHeight: 1.5,
      }}>
        {price.night_extra > 0 && '₹300 night surcharge for pickups after 10 PM. '}
        {price.discount > 0 && `Early bird discount of ₹${price.discount} applied! `}
        Driver extra for km beyond Rajendra Nagar: ₹15/km.
      </div>
    </div>
  )
}

function PriceRow({
  label, value, accent,
}: {
  label: string; value: string; accent?: 'gold' | 'green' | 'amber'
}) {
  const color = accent === 'green' ? 'var(--green)'
    : accent === 'gold'  ? 'var(--gold)'
    : accent === 'amber' ? 'var(--amber)'
    : 'var(--text)'
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
      fontSize: 11,
      color: 'var(--muted)',
      marginBottom: 3,
    }}>
      <span>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  )
}
