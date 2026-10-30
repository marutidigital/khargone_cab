// src/config/pricing.ts
// Single source of truth for dynamic pricing, points, and rules

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
  baseFare: number
  features: string[]
}

export interface PointConfig {
  id: 'rajendra' | 'railway' | 'airport' | 'bhawarkua' | 'rajwada'
  name: string
  sub: string
  routeDistanceKm: number
}

export interface PricingFormulaConfig {
  BASE: { K2I: number; I2K: number }
  STEP: number
  FLOOR: { K2I: number; I2K: number }
  SUV_EXTRA: number
  POINTS: Record<string, number>
  KM_CHARGE_PER_KM: number
  TOLL_ESTIMATE: number
  NIGHT_SURCHARGE: number
  MIN_LEAD_HOURS: number
  TRAVEL_HOURS: number
  ADVANCE: number
}

export const DEFAULT_PRICING_CONFIG: PricingFormulaConfig = {
  BASE: { K2I: 3000, I2K: 3000 },
  STEP: 100,
  FLOOR: { K2I: 1700, I2K: 1700 },
  SUV_EXTRA: 500,
  POINTS: {
    'Rajendra Nagar': 1700,
    'Railway Station': 1900,
    'Airport': 2000,
    'Bhawarkua': 1800,
    'Rajwada': 2000,
  },
  KM_CHARGE_PER_KM: 13,
  TOLL_ESTIMATE: 0,
  NIGHT_SURCHARGE: 300,
  MIN_LEAD_HOURS: 3,
  TRAVEL_HOURS: 3,
  ADVANCE: 500,
}

export const BASE_ROUTE_DISTANCE_KM = 157.08
const pointDrivingDistances: Record<string, number> = {
  rajendra: BASE_ROUTE_DISTANCE_KM,
  railway: 163.5,
  airport: 167.6,
  bhawarkua: 160.3,
  rajwada: 162.4,
}

export const PRICING_CONFIG = {
  ...DEFAULT_PRICING_CONFIG,
  brandName: 'MarutiCab',
  tagline: 'Private Cabs · Khargone ↔ Indore',
  domain: 'hanscab.in',
  contactWhatsApp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '919826098260',
  supportPhone: '+91 98260 98260',
  supportHours: '6:00 AM – 11:00 PM',
  khargoneHub: 'Bus Stand Khargone',
  minLeadHours: DEFAULT_PRICING_CONFIG.MIN_LEAD_HOURS,
  travelHours: DEFAULT_PRICING_CONFIG.TRAVEL_HOURS,
  estimatedTravelHours: DEFAULT_PRICING_CONFIG.TRAVEL_HOURS,
  advanceDeposit: DEFAULT_PRICING_CONFIG.ADVANCE,
  nightSurcharge: DEFAULT_PRICING_CONFIG.NIGHT_SURCHARGE,
  indoreToKhargoneDiscount: 200,
  sameDaySurcharge: 300,
  nextDaySurcharge: 200,
  driverCallMinutesBefore: 45,
  offers: {
    referral: {
      enabled: false,
      discount: 100,
    },
  },

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
      baseFare: 1700,
      features: ['Up to 4 passengers', '2-3 luggage bags', 'AC comfortable seats'],
    },
    suv: {
      id: 'suv',
      name: 'Premium SUV',
      title: 'Premium SUV',
      seats: '6 Seater',
      capacity: 6,
      bags: '4-5 Bags',
      models: 'Ertiga · Carens · Innova',
      badge: 'Best for Families',
      badgeColor: 'blue',
      upgradePrice: 500,
      baseFare: 2300,
      image: '/cars/suv.webp',
      features: ['Up to 6 passengers', '4-5 bags', 'AC extra spacious'],
    },
  } as Record<'sedan' | 'suv', VehicleConfig>,

  points: [
    {
      id: 'rajendra',
      name: 'Rajendra Nagar',
      sub: 'City drop - base fare',
      routeDistanceKm: pointDrivingDistances.rajendra,
    },
    {
      id: 'railway',
      name: 'Railway Station',
      sub: 'Indore Junction',
      routeDistanceKm: pointDrivingDistances.railway,
    },
    {
      id: 'airport',
      name: 'Airport',
      sub: 'Devi Ahilya Airport',
      routeDistanceKm: pointDrivingDistances.airport,
    },
    {
      id: 'bhawarkua',
      name: 'Bhawarkua',
      sub: 'AB Road / City Point',
      routeDistanceKm: pointDrivingDistances.bhawarkua,
    },
    {
      id: 'rajwada',
      name: 'Rajwada',
      sub: 'Old City / Market',
      routeDistanceKm: pointDrivingDistances.rajwada,
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

export function getPointConfig(pointIdOrName: string): PointConfig {
  const normalized = pointIdOrName.toLowerCase()
  return PRICING_CONFIG.points.find((point) =>
    point.id === normalized || point.name.toLowerCase() === normalized
  ) || PRICING_CONFIG.points[0]
}

export function getPointFare(
  pointIdOrName: string,
  config: PricingFormulaConfig = DEFAULT_PRICING_CONFIG
): number {
  return config.POINTS[getPointConfig(pointIdOrName).name] ?? 0
}

// Calendar-specific prices use the quoted dates; days-ahead pricing is the fallback.
export function calculateDateFare(
  direction: 'K2I' | 'I2K' | 'KI' | 'IK',
  daysAhead: number,
  config: PricingFormulaConfig = DEFAULT_PRICING_CONFIG,
  travelDate?: string
): number {
  const dirKey = direction === 'IK' || direction === 'I2K' ? 'I2K' : 'K2I'
  const base = config.BASE[dirKey]
  const floor = config.FLOOR[dirKey]

  // Keep the quoted November fares attached to their calendar dates.
  if (travelDate) {
    const calendarFares: Record<string, number> = {
      '2026-10-31': 3000,
      '2026-11-01': 2300,
      '2026-11-02': 2200,
      '2026-11-03': 2100,
      '2026-11-04': 2000,
      '2026-11-05': 1900,
      '2026-11-06': 1800,
      '2026-11-07': 1700,
    }
    if (calendarFares[travelDate] !== undefined) return calendarFares[travelDate]
    if (travelDate > '2026-11-07') return floor
  }

  // For dates outside the quoted calendar, keep same-day and next-day at the
  // urgent rate, then step down to the configured floor.
  if (daysAhead <= 1) return base
  const firstReducedDayFare = base - config.STEP * 6
  const discountSteps = Math.max(0, daysAhead - 2)
  return Math.max(floor, firstReducedDayFare - config.STEP * discountSteps)
}

/** Date-based fare for a drop point, retaining its existing location premium. */
export function getPointFareForDate(
  pointIdOrName: string,
  direction: 'K2I' | 'I2K' | 'KI' | 'IK',
  daysAhead: number,
  config: PricingFormulaConfig = DEFAULT_PRICING_CONFIG,
  travelDate?: string
): number {
  const dirKey = direction === 'IK' || direction === 'I2K' ? 'I2K' : 'K2I'
  const routeBase = calculateDateFare(dirKey, daysAhead, config, travelDate)
  const locationPremium = Math.max(0, getPointFare(pointIdOrName, config) - config.FLOOR[dirKey])
  return routeBase + locationPremium
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
  distanceCharge: number
  chargeableDistanceKm: number
  kmRate: number
  tollEstimate: number
  routeDistanceKm: number
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
  travelDate?: string
  hour?: number
  isNight?: boolean
  customConfig?: PricingFormulaConfig
}): DetailedFareBreakdown {
  const config = params.customConfig || DEFAULT_PRICING_CONFIG
  const dirKey = params.direction === 'IK' || params.direction === 'I2K' ? 'I2K' : 'K2I'
  const selectedPoint = getPointConfig(params.pointIdOrName)
  const standardFare = getPointFareForDate(selectedPoint.id, dirKey, params.daysAhead, config, params.travelDate)
  const dateFare = standardFare
  const earlyDiscount = 0
  const vehicleExtra = params.vehicle === 'suv' ? config.SUV_EXTRA : 0
  const pointExtra = 0
  const distanceCharge = 0
  const chargeableDistanceKm = 0

  // Night extra
  let isNight = false
  if (typeof params.isNight === 'boolean') {
    isNight = params.isNight
  } else if (typeof params.hour === 'number') {
    isNight = isNightTime(params.hour)
  }
  const nightExtra = isNight ? config.NIGHT_SURCHARGE : 0
  const tollEstimate = 0

  const totalFare = dateFare + vehicleExtra + nightExtra
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
    distanceCharge,
    chargeableDistanceKm,
    kmRate: config.KM_CHARGE_PER_KM,
    tollEstimate,
    routeDistanceKm: selectedPoint.routeDistanceKm,
    nightExtra,
    totalFare,
    advanceDeposit,
    balanceFare,
  }
}

export interface LivePriceBreakdown {
  baseFare: number
  vehicleExtra: number
  pointExtra: number
  distanceCharge: number
  chargeableDistanceKm: number
  routeDistanceKm: number
  kmRate: number
  tollEstimate: number
  directionDiscount: number
  nightSurcharge: number
  sameDaySurcharge: number
  nextDaySurcharge: number
  referralDiscount: number
  advanceDeposit: number
  balanceFare: number
  totalFare: number
}

export function computeBookingPrice(params: {
  vehicle: 'sedan' | 'suv'
  pointId: string
  direction: string
  daysAhead: number
  travelDate?: string
  hour: number
}): LivePriceBreakdown {
  const breakdown = computeFare({
    direction: params.direction as any,
    vehicle: params.vehicle,
    pointIdOrName: params.pointId,
    daysAhead: params.daysAhead,
    travelDate: params.travelDate,
    hour: params.hour,
  })

  return {
    baseFare: breakdown.dateFare,
    vehicleExtra: breakdown.vehicleExtra,
    pointExtra: breakdown.pointExtra,
    distanceCharge: breakdown.distanceCharge,
    chargeableDistanceKm: breakdown.chargeableDistanceKm,
    routeDistanceKm: breakdown.routeDistanceKm,
    kmRate: breakdown.kmRate,
    tollEstimate: breakdown.tollEstimate,
    directionDiscount: 0,
    nightSurcharge: breakdown.nightExtra,
    sameDaySurcharge: 0,
    nextDaySurcharge: 0,
    referralDiscount: 0,
    advanceDeposit: breakdown.advanceDeposit,
    balanceFare: breakdown.balanceFare,
    totalFare: breakdown.totalFare,
  }
}

