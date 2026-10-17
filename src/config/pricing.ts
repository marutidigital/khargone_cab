// src/config/pricing.ts
// Single source of truth for dynamic pricing, points, coordinates, and rules

export interface VehicleConfig {
  id: 'sedan' | 'suv'
  name: string
  title: string
  seats: string
  capacity: number
  bags: string
  models: string
  badge: string
  badgeColor: string
  image: string
  upgradePrice?: number
  features: string[]
}

export interface PointConfig {
  id: 'rajendra' | 'railway' | 'airport' | 'bhawarkua' | 'rajwada'
  name: string
  sub: string
  extra: number
  coords: [number, number]
}

export interface PricingFormulaConfig {
  BASE: { K2I: number; I2K: number }
  STEP: number
  FLOOR: { K2I: number; I2K: number }
  SUV_EXTRA: number
  POINTS: Record<string, number>
  NIGHT_SURCHARGE: number
  MIN_LEAD_HOURS: number
  TRAVEL_HOURS: number
  ADVANCE: number
}

export const DEFAULT_PRICING_CONFIG: PricingFormulaConfig = {
  BASE: { K2I: 2000, I2K: 1800 },
  STEP: 100, // drop per extra day ahead
  FLOOR: { K2I: 1700, I2K: 1500 },
  SUV_EXTRA: 600,
  POINTS: {
    'Rajendra Nagar': 0,
    'Railway Station': 200,
    'Airport': 300,
    'Bhawarkua': 0,
    'Rajwada': 100,
  },
  NIGHT_SURCHARGE: 300,
  MIN_LEAD_HOURS: 3,
  TRAVEL_HOURS: 3,
  ADVANCE: 500,
}

export const MAP_COORDINATES = {
  khargone: [21.8234, 75.6186] as [number, number],
  points: {
    rajendra: [22.6740, 75.8310] as [number, number],
    railway: [22.7177, 75.8682] as [number, number],
    airport: [22.7230, 75.8037] as [number, number],
    bhawarkua: [22.6926, 75.8676] as [number, number],
    rajwada: [22.7196, 75.8577] as [number, number],
  },
}

export const PRICING_CONFIG = {
  ...DEFAULT_PRICING_CONFIG,
  brandName: 'Hanscab',
  tagline: 'Private Cabs · Khargone ↔ Indore',
  domain: 'hanscab.in',
  contactWhatsApp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '919826098260',
  supportPhone: '+91 98260 98260',
  supportHours: '6:00 AM – 11:00 PM',
  khargoneHub: 'Bus Stand Khargone',
  khargoneCoords: MAP_COORDINATES.khargone,
  minLeadHours: DEFAULT_PRICING_CONFIG.MIN_LEAD_HOURS,
  travelHours: DEFAULT_PRICING_CONFIG.TRAVEL_HOURS,
  estimatedTravelHours: DEFAULT_PRICING_CONFIG.TRAVEL_HOURS,
  advanceDeposit: DEFAULT_PRICING_CONFIG.ADVANCE,
  nightSurcharge: DEFAULT_PRICING_CONFIG.NIGHT_SURCHARGE,
  indoreToKhargoneDiscount: 200,
  driverCallMinutesBefore: 45,

  vehicles: {
    sedan: {
      id: 'sedan',
      name: 'Economy Sedan',
      title: 'Economy Sedan',
      seats: '5 Seater',
      capacity: 4,
      bags: '2-3 Luggage Bags',
      models: 'Dzire · Amaze · Aura',
      badge: 'Recommended',
      badgeColor: 'amber',
      image: '/cars/sedan.webp',
      features: ['Up to 4 passengers', '2-3 luggage bags', 'AC comfortable seats'],
    },
    suv: {
      id: 'suv',
      name: 'Premium SUV',
      title: 'Premium SUV',
      seats: '7 Seater',
      capacity: 6,
      bags: '4-5 Bags',
      models: 'Ertiga · Carens · Innova',
      badge: 'Best for Families',
      badgeColor: 'blue',
      upgradePrice: 600,
      image: '/cars/suv.webp',
      features: ['Up to 6 passengers', '4-5 bags', 'AC extra spacious'],
    },
  } as Record<'sedan' | 'suv', VehicleConfig>,

  points: [
    {
      id: 'rajendra',
      name: 'Rajendra Nagar',
      sub: 'City drop - base fare',
      extra: 0,
      coords: MAP_COORDINATES.points.rajendra,
    },
    {
      id: 'railway',
      name: 'Railway Station',
      sub: 'Indore Junction',
      extra: 200,
      coords: MAP_COORDINATES.points.railway,
    },
    {
      id: 'airport',
      name: 'Airport',
      sub: 'Devi Ahilya Airport',
      extra: 300,
      coords: MAP_COORDINATES.points.airport,
    },
    {
      id: 'bhawarkua',
      name: 'Bhawarkua',
      sub: 'AB Road / City Point',
      extra: 0,
      coords: MAP_COORDINATES.points.bhawarkua,
    },
    {
      id: 'rajwada',
      name: 'Rajwada',
      sub: 'Old City / Market',
      extra: 100,
      coords: MAP_COORDINATES.points.rajwada,
    },
  ] as PointConfig[],
}

// Format numbers as Indian currency: "Rs 1,800"
export function formatRs(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN')}`
}

// Night surcharge check (22:00 to 04:59)
export function isNightTime(hour: number): boolean {
  return hour >= 22 || hour < 5
}

// Date fare formula
// dateFare(dir, daysAhead) = max(FLOOR[dir], BASE[dir] - STEP * max(0, daysAhead - 1))
export function calculateDateFare(
  direction: 'K2I' | 'I2K' | 'KI' | 'IK',
  daysAhead: number,
  config: PricingFormulaConfig = DEFAULT_PRICING_CONFIG
): number {
  const dirKey = direction === 'IK' || direction === 'I2K' ? 'I2K' : 'K2I'
  const base = config.BASE[dirKey]
  const floor = config.FLOOR[dirKey]
  const discountSteps = Math.max(0, daysAhead - 1)
  return Math.max(floor, base - config.STEP * discountSteps)
}

// Starting price for a direction
export function getStartingPrice(
  direction: 'K2I' | 'I2K' | 'KI' | 'IK',
  config: PricingFormulaConfig = DEFAULT_PRICING_CONFIG
): number {
  const dirKey = direction === 'IK' || direction === 'I2K' ? 'I2K' : 'K2I'
  return config.FLOOR[dirKey]
}

export interface DetailedFareBreakdown {
  direction: 'K2I' | 'I2K'
  daysAhead: number
  standardFare: number
  dateFare: number
  earlyDiscount: number
  vehicleExtra: number
  pointExtra: number
  nightExtra: number
  totalFare: number
  advanceDeposit: number
  balanceFare: number
}

// Full live price calculation
export function computeFare(params: {
  direction: 'K2I' | 'I2K' | 'KI' | 'IK'
  vehicle: 'sedan' | 'suv'
  pointIdOrName: string
  daysAhead: number
  hour?: number
  isNight?: boolean
  customConfig?: PricingFormulaConfig
}): DetailedFareBreakdown {
  const config = params.customConfig || DEFAULT_PRICING_CONFIG
  const dirKey = params.direction === 'IK' || params.direction === 'I2K' ? 'I2K' : 'K2I'
  const standardFare = config.BASE[dirKey]
  const dateFare = calculateDateFare(dirKey, params.daysAhead, config)
  const earlyDiscount = Math.max(0, standardFare - dateFare)

  const vehicleExtra = params.vehicle === 'suv' ? config.SUV_EXTRA : 0

  // Point extra
  let pointExtra = 0
  const normalizedPoint = params.pointIdOrName.toLowerCase()
  if (normalizedPoint.includes('airport')) {
    pointExtra = config.POINTS['Airport'] ?? 300
  } else if (normalizedPoint.includes('railway') || normalizedPoint.includes('junction')) {
    pointExtra = config.POINTS['Railway Station'] ?? 200
  } else if (normalizedPoint.includes('rajwada')) {
    pointExtra = config.POINTS['Rajwada'] ?? 100
  } else {
    pointExtra = 0
  }

  // Night extra
  let isNight = false
  if (typeof params.isNight === 'boolean') {
    isNight = params.isNight
  } else if (typeof params.hour === 'number') {
    isNight = isNightTime(params.hour)
  }
  const nightExtra = isNight ? config.NIGHT_SURCHARGE : 0

  const totalFare = dateFare + vehicleExtra + pointExtra + nightExtra
  const advanceDeposit = config.ADVANCE
  const balanceFare = Math.max(0, totalFare - advanceDeposit)

  return {
    direction: dirKey,
    daysAhead: params.daysAhead,
    standardFare,
    dateFare,
    earlyDiscount,
    vehicleExtra,
    pointExtra,
    nightExtra,
    totalFare,
    advanceDeposit,
    balanceFare,
  }
}
