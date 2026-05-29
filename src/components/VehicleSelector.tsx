'use client'
// src/components/VehicleSelector.tsx

import Image from 'next/image'
import {
  Users, Briefcase, Wind, Star, Zap, Shield, CheckCircle2
} from 'lucide-react'

export type VehicleType = 'sedan' | 'suv'

interface Vehicle {
  id: VehicleType
  badge: string
  badgeColor: string
  badgeBg: string
  name: string
  seats: string
  models: string
  features: { icon: React.ReactNode; text: string }[]
  basePrice: number
  upgradeExtra: number
  image: string
  imageBg: string
}

const VEHICLES: Vehicle[] = [
  {
    id: 'sedan',
    badge: 'Recommended',
    badgeColor: '#854D0E',
    badgeBg: '#FEF08A',
    name: 'Economy Sedan',
    seats: '5 Seater',
    models: 'Dzire · Amaze · Aura',
    features: [
      { icon: <Users size={13} strokeWidth={2} />, text: 'Up to 4 Passengers' },
      { icon: <Briefcase size={13} strokeWidth={2} />, text: '2–3 Luggage Bags' },
      { icon: <Wind size={13} strokeWidth={2} />, text: 'AC · Comfortable Seats' },
    ],
    basePrice: 2000,
    upgradeExtra: 0,
    image: '/economy_sedan.png',
    imageBg: '#F8F8F8',
  },
  {
    id: 'suv',
    badge: 'Best for Families',
    badgeColor: '#1D4ED8',
    badgeBg: '#DBEAFE',
    name: 'Premium SUV',
    seats: '7 Seater',
    models: 'Ertiga · Carens · Innova',
    features: [
      { icon: <Users size={13} strokeWidth={2} />, text: 'Up to 6 Passengers' },
      { icon: <Briefcase size={13} strokeWidth={2} />, text: '4–5 Luggage Bags' },
      { icon: <Zap size={13} strokeWidth={2} />, text: 'AC · Extra Spacious' },
    ],
    basePrice: 2600,
    upgradeExtra: 600,
    image: '/premium_suv.png',
    imageBg: '#F4F5F6',
  },
]

interface Props {
  selected: VehicleType
  onSelect: (v: VehicleType) => void
}

export function VehicleSelector({ selected, onSelect }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {VEHICLES.map(v => {
          const sel = selected === v.id
          return (
            <div
              key={v.id}
              onClick={() => onSelect(v.id)}
              style={{
                background: '#fff',
                border: sel ? '2px solid #FFC107' : '1.5px solid #E8E8E8',
                borderRadius: 14,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: sel
                  ? '0 6px 24px rgba(255,193,7,0.18)'
                  : '0 2px 8px rgba(0,0,0,0.05)',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = '#BDBDBD'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)' } }}
              onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = '#E8E8E8'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)' } }}
            >
              {/* Badge row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px 0',
              }}>
                <div style={{
                  background: v.badgeBg,
                  color: v.badgeColor,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 20,
                  letterSpacing: '0.03em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  {v.id === 'sedan' ? <Star size={9} fill={v.badgeColor} strokeWidth={0} /> : <Shield size={9} strokeWidth={2} />}
                  {v.badge}
                </div>
                {/* Check circle */}
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: sel ? '#FFC107' : '#F5F5F5',
                  border: sel ? 'none' : '1.5px solid #DDD',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}>
                  {sel
                    ? <CheckCircle2 size={14} strokeWidth={2.5} color="#000" />
                    : <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#DDD' }} />
                  }
                </div>
              </div>

              {/* Car image */}
              <div style={{
                background: v.imageBg,
                margin: '10px 14px',
                borderRadius: 10,
                height: 110,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}>
                <Image
                  src={v.image}
                  alt={v.name}
                  fill
                  style={{ objectFit: 'contain', objectPosition: 'center' }}
                  sizes="240px"
                  priority
                />
              </div>

              {/* Details */}
              <div style={{ padding: '0 14px 14px' }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#111', letterSpacing: '-0.02em' }}>
                  {v.name}
                </div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 1, marginBottom: 6 }}>{v.seats}</div>
                <div style={{
                  fontSize: 11, color: '#AAA', marginBottom: 10,
                  fontStyle: 'italic', letterSpacing: '0.01em',
                }}>
                  {v.models}
                </div>

                {/* Features */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {v.features.map(f => (
                    <div key={f.text} style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      fontSize: 12, color: '#444', fontWeight: 500,
                    }}>
                      <span style={{ color: '#888', display: 'flex' }}>{f.icon}</span>
                      {f.text}
                    </div>
                  ))}
                </div>

                {/* Price row */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 12,
                  borderTop: '1px solid #F0F0F0',
                }}>
                  <div>
                    <span style={{ fontSize: 11, color: '#888' }}>Starting at </span>
                    <span style={{ fontSize: 19, fontWeight: 800, color: '#111', letterSpacing: '-0.03em' }}>
                      ₹{v.basePrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                  {v.upgradeExtra > 0 && (
                    <div style={{
                      background: '#FFF8E1', border: '1px solid #FFE082',
                      color: '#E65100', fontSize: 10, fontWeight: 700,
                      padding: '3px 9px', borderRadius: 20,
                    }}>
                      +₹{v.upgradeExtra} Upgrade
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Trust strip */}
      <div style={{
        background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)',
        border: '1px solid #BBF7D0',
        borderRadius: 10,
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        justifyContent: 'space-between',
      }}>
        {[
          'No Driver Allowance',
          'No Toll',
          'No Parking',
          'Everything Included in Your Fare',
        ].map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <CheckCircle2 size={13} color="#16A34A" strokeWidth={2.5} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#15803D' }}>{t}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Shield size={13} color="#16A34A" strokeWidth={2.5} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#15803D' }}>100% Transparent Pricing</span>
        </div>
      </div>
    </div>
  )
}
