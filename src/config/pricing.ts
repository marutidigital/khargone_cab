// src/config/pricing.ts
// Single source of truth for all pricing, routes, vehicles, and business configurations

export interface VehicleConfig {
  id: 'sedan' | 'suv'
  name: string
  seats: string
  capacity: number
  bags: string
  models: string
  baseFare: number
  image: string
  badge: string
  features: string[]
}

export interface PointConfig {
  id: 'rajendra' | 'bhawarkua' | 'rajwada' | 'railway' | 'airport'
  name: string
  sub: string
  extra: number
}

export const PRICING_CONFIG = {
  brandName: 'Hanscab',
  tagline: 'Private Cabs · Khargone ↔ Indore',
  domain: 'hanscab.in',
  contactWhatsApp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '919826098260',
  supportPhone: '+91 98260 98260',
  supportHours: '6:00 AM – 11:00 PM',
  khargoneHub: 'Khargone Bus Stand',
  minLeadHours: 3, // For today: disable slots earlier than (now + 3 hours)
  estimatedTravelHours: 3, // Average 3 hours driving time between Khargone and Indore
  driverCallMinutesBefore: 30, // Driver calls 30 minutes before pickup
  advanceDeposit: 500, // Reserve with Rs 500, pay rest in car

  // Vehicles
  vehicles: {
    sedan: {
      id: 'sedan',
      name: 'Economy Sedan',
      seats: '4 Passengers (5 Seater)',
      capacity: 4,
      bags: '2–3 Bags',
      models: 'Dzire · Amaze · Aura',
      baseFare: 1800,
      image: '/economy_sedan.png',
      badge: 'Popular Choice',
      features: ['Up to 4 Passengers', '2–3 Luggage Bags', 'AC · Private & Sanitized'],
    },
    suv: {
      id: 'suv',
      name: 'Premium SUV',
      seats: '6 Passengers (7 Seater)',
      capacity: 6,
      bags: '4–5 Bags',
      models: 'Ertiga · Carens · Innova',
      baseFare: 2400,
      image: '/premium_suv.png',
      badge: 'Best for Families',
      features: ['Up to 6 Passengers', '4–5 Luggage Bags', 'AC · Extra Luggage Space'],
    },
  } as Record<'sedan' | 'suv', VehicleConfig>,

  // Indore Points (add to fare)
  points: [
    { id: 'rajendra', name: 'Rajendra Nagar', sub: 'City point · Base fare', extra: 0 },
    { id: 'bhawarkua', name: 'Bhawarkua', sub: 'AB Road / BRTS · Base fare', extra: 0 },
    { id: 'rajwada', name: 'Rajwada', sub: 'City Center / Market', extra: 100 },
    { id: 'railway', name: 'Railway Station', sub: 'Indore Junction Station', extra: 200 },
    { id: 'airport', name: 'Airport (IDR)', sub: 'Devi Ahilya Bai Holkar Airport', extra: 300 },
  ] as PointConfig[],

  // Surcharges & Discounts
  indoreToKhargoneDiscount: 200, // Configurable discount for IK direction
  nightSurcharge: 300,          // 22:00 - 04:59
  sameDaySurcharge: 300,        // Booking for today
  nextDaySurcharge: 200,        // Booking for tomorrow (next day)

  // Offers
  offers: {
    indoreToKhargone: {
      title: 'Indore → Khargone Discount',
      description: 'Rs 200 auto-applied discount for Indore to Khargone trips',
      discount: 200,
      enabled: true,
    },
    referral: {
      title: 'Refer a Friend',
      description: 'Rs 100 off after their completed trip',
      discount: 100,
      enabled: false, // Configurable, off by default
    },
    advance: {
      title: 'Reserve with Rs 500',
      description: 'Reserve your car with Rs 500; pay remaining balance in the car',
      amount: 500,
      enabled: true,
    },
  },
}

// Helper to format currency in Indian format: "Rs 1,800"
export function formatRs(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN')}`
}

// Helper to check if an hour falls in the night surcharge window (22:00 - 04:59)
export function isNightTime(hour: number): boolean {
  return hour >= 22 || hour < 5
}

// Live calculation breakdown
export interface LivePriceBreakdown {
  baseFare: number
  pointExtra: number
  nightSurcharge: number
  sameDaySurcharge: number
  nextDaySurcharge: number
  directionDiscount: number
  referralDiscount: number
  totalFare: number
  advanceDeposit: number
  balanceFare: number
}

export function computeBookingPrice(params: {
  vehicle: 'sedan' | 'suv'
  pointId: string
  direction: 'KI' | 'IK'
  daysAhead: number // 0 = today, 1 = tomorrow, 2+ = advanced
  hour: number // 0-23
  applyReferral?: boolean
}): LivePriceBreakdown {
  const vehicleCfg = PRICING_CONFIG.vehicles[params.vehicle] || PRICING_CONFIG.vehicles.sedan
  const baseFare = vehicleCfg.baseFare

  const pointCfg = PRICING_CONFIG.points.find(p => p.id === params.pointId)
  const pointExtra = pointCfg ? pointCfg.extra : 0

  const nightSurcharge = isNightTime(params.hour) ? PRICING_CONFIG.nightSurcharge : 0

  const sameDaySurcharge = params.daysAhead === 0 ? PRICING_CONFIG.sameDaySurcharge : 0
  const nextDaySurcharge = params.daysAhead === 1 ? PRICING_CONFIG.nextDaySurcharge : 0

  const directionDiscount = params.direction === 'IK' ? PRICING_CONFIG.indoreToKhargoneDiscount : 0
  const referralDiscount = (params.applyReferral && PRICING_CONFIG.offers.referral.enabled)
    ? PRICING_CONFIG.offers.referral.discount
    : 0

  const totalFare = Math.max(
    0,
    baseFare + pointExtra + nightSurcharge + sameDaySurcharge + nextDaySurcharge - directionDiscount - referralDiscount
  )

  const advanceDeposit = Math.min(PRICING_CONFIG.advanceDeposit, totalFare)
  const balanceFare = Math.max(0, totalFare - advanceDeposit)

  return {
    baseFare,
    pointExtra,
    nightSurcharge,
    sameDaySurcharge,
    nextDaySurcharge,
    directionDiscount,
    referralDiscount,
    totalFare,
    advanceDeposit,
    balanceFare,
  }
}
