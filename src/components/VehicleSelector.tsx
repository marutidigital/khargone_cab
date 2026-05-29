'use client'
// src/components/VehicleSelector.tsx

export type VehicleType = 'sedan' | 'suv'

interface Vehicle {
  id: VehicleType
  badge: string
  badgeColor: string
  name: string
  seats: string
  models: string
  passengers: string
  luggage: string
  extras: string
  basePrice: number
  upgradeExtra: number
}

const VEHICLES: Vehicle[] = [
  {
    id: 'sedan',
    badge: 'Recommended',
    badgeColor: '#FFC107',
    name: 'Economy Sedan',
    seats: '5 Seater',
    models: 'Dzire · Amaze · Aura',
    passengers: 'Up to 4 Passengers',
    luggage: '2 – 3 Luggage Bags',
    extras: 'AC · Comfortable Seats',
    basePrice: 2000,
    upgradeExtra: 0,
  },
  {
    id: 'suv',
    badge: 'Best for Families',
    badgeColor: '#3B82F6',
    name: 'Premium SUV',
    seats: '7 Seater',
    models: 'Ertiga · Carens · Innova',
    passengers: 'Up to 6 Passengers',
    luggage: '4 – 5 Luggage Bags',
    extras: 'AC · Extra Spacious',
    basePrice: 2600,
    upgradeExtra: 600,
  },
]

interface Props {
  selected: VehicleType
  onSelect: (v: VehicleType) => void
}

export function VehicleSelector({ selected, onSelect }: Props) {
  return (
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
              borderRadius: 12,
              padding: 16,
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s ease',
              boxShadow: sel ? '0 4px 16px rgba(255,193,7,0.15)' : '0 1px 4px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={e => { if (!sel) e.currentTarget.style.borderColor = '#CCC' }}
            onMouseLeave={e => { if (!sel) e.currentTarget.style.borderColor = '#E8E8E8' }}
          >
            {/* Badge */}
            <div style={{
              position: 'absolute',
              top: 12,
              left: 12,
              background: v.badgeColor,
              color: v.id === 'sedan' ? '#000' : '#fff',
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: 20,
              letterSpacing: '0.02em',
            }}>
              {v.badge}
            </div>

            {/* Check circle */}
            <div style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: sel ? 'none' : '1.5px solid #DDD',
              background: sel ? '#FFC107' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}>
              {sel && (
                <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                  <path d="M1 4l3.5 3L10 1" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>

            {/* Car illustration */}
            <div style={{
              marginTop: 32,
              marginBottom: 10,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: 60,
            }}>
              {v.id === 'sedan' ? (
                <svg viewBox="0 0 120 50" width="110" height="46" fill="none">
                  <rect x="10" y="18" width="100" height="22" rx="4" fill="#E0E0E0"/>
                  <path d="M25 18 C30 8 40 4 60 4 C80 4 90 8 95 18Z" fill="#BDBDBD"/>
                  <circle cx="30" cy="40" r="8" fill="#555"/>
                  <circle cx="30" cy="40" r="4" fill="#DDD"/>
                  <circle cx="88" cy="40" r="8" fill="#555"/>
                  <circle cx="88" cy="40" r="4" fill="#DDD"/>
                  <rect x="96" y="22" width="12" height="8" rx="2" fill="#FFC107" opacity="0.8"/>
                  <rect x="12" y="22" width="12" height="8" rx="2" fill="#EF4444" opacity="0.6"/>
                  <rect x="38" y="6" width="44" height="12" rx="2" fill="#90CAF9" opacity="0.5"/>
                </svg>
              ) : (
                <svg viewBox="0 0 130 55" width="120" height="50" fill="none">
                  <rect x="8" y="20" width="114" height="24" rx="5" fill="#CFD8DC"/>
                  <path d="M22 20 C28 8 42 4 65 4 C88 4 102 8 108 20Z" fill="#B0BEC5"/>
                  <circle cx="32" cy="44" r="9" fill="#555"/>
                  <circle cx="32" cy="44" r="4.5" fill="#DDD"/>
                  <circle cx="98" cy="44" r="9" fill="#555"/>
                  <circle cx="98" cy="44" r="4.5" fill="#DDD"/>
                  <rect x="108" y="24" width="12" height="8" rx="2" fill="#FFC107" opacity="0.8"/>
                  <rect x="10" y="24" width="12" height="8" rx="2" fill="#EF4444" opacity="0.6"/>
                  <rect x="42" y="6" width="46" height="14" rx="2" fill="#90CAF9" opacity="0.5"/>
                </svg>
              )}
            </div>

            {/* Name */}
            <div style={{ fontWeight: 700, fontSize: 15, color: '#111', letterSpacing: '-0.02em' }}>
              {v.name}
            </div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 12, marginTop: 2 }}>{v.seats}</div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 10, fontStyle: 'italic' }}>{v.models}</div>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
              {[
                { icon: '👤', text: v.passengers },
                { icon: '🧳', text: v.luggage },
                { icon: '❄️', text: v.extras },
              ].map(f => (
                <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#555' }}>
                  <span style={{ fontSize: 11 }}>{f.icon}</span>
                  {f.text}
                </div>
              ))}
            </div>

            {/* Price */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>Starting at </span>
                <span style={{ fontSize: 17, fontWeight: 800, color: '#111', letterSpacing: '-0.03em' }}>
                  ₹{v.basePrice.toLocaleString('en-IN')}
                </span>
              </div>
              {v.upgradeExtra > 0 && (
                <div style={{
                  background: '#FFF8E1',
                  border: '1px solid #FFE082',
                  color: '#F57F17',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 20,
                }}>
                  +₹{v.upgradeExtra} Upgrade
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Trust strip */}
      <div style={{
        gridColumn: 'span 2',
        background: '#F0FDF4',
        border: '1px solid #BBF7D0',
        borderRadius: 8,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        {['✅ No Driver Allowance', '✅ No Toll', '✅ No Parking', '✅ Everything Included in Your Fare'].map(t => (
          <span key={t} style={{ fontSize: 11, fontWeight: 500, color: '#15803D' }}>{t}</span>
        ))}
        <span style={{ fontSize: 11, fontWeight: 500, color: '#15803D', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="#15803D"/><path d="M4 6l1.5 1.5L8 4" stroke="#15803D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          100% Transparent Pricing
        </span>
      </div>
    </div>
  )
}
