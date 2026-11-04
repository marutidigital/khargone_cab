// src/config/pricing.ts
import { BOOKING_CONFIG, getDropPointExtra, type DropPointId } from '@/lib/config'

// Backward-compatible presentation adapters. Booking prices come from lib/config.ts.

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
  BASE: BOOKING_CONFIG.matchDealBaseFares,
  STEP: 0,
  FLOOR: BOOKING_CONFIG.matchDealBaseFares,
  SUV_EXTRA: 500,
  POINTS: {
    'Rajendra Nagar': getDropPointExtra('rajendra'),
    'Railway Station': getDropPointExtra('railway'),
    'Airport': getDropPointExtra('airport'),
    'Bhawarkua': getDropPointExtra('bhawarkua'),
    'Rajwada': getDropPointExtra('rajwada'),
  },
  KM_CHARGE_PER_KM: BOOKING_CONFIG.extraKmRate,
  TOLL_ESTIMATE: 0,
  NIGHT_SURCHARGE: BOOKING_CONFIG.nightSurcharge,
  MIN_LEAD_HOURS: BOOKING_CONFIG.guaranteedMinLeadHours,
  TRAVEL_HOURS: BOOKING_CONFIG.travelHours,
  ADVANCE: BOOKING_CONFIG.guaranteedAdvance,
}

export const BASE_ROUTE_DISTANCE_KM = BOOKING_CONFIG.baseRouteKm
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
  domain: 'maruticab.in',
  contactWhatsApp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '917282316090',
  supportPhone: '+91 72823 16090',
  supportHours: '6:00 AM – 11:00 PM',
  khargoneHub: 'Bus Stand Khargone',
  minLeadHours: DEFAULT_PRICING_CONFIG.MIN_LEAD_HOURS,
  travelHours: DEFAULT_PRICING_CONFIG.TRAVEL_HOURS,
  estimatedTravelHours: DEFAULT_PRICING_CONFIG.TRAVEL_HOURS,
  advanceDeposit: DEFAULT_PRICING_CONFIG.ADVANCE,
  nightSurcharge: DEFAULT_PRICING_CONFIG.NIGHT_SURCHARGE,
  indoreToKhargoneDiscount: 0,
  sameDaySurcharge: 0,
  nextDaySurcharge: 0,
  enableSuv: BOOKING_CONFIG.enableSuv,
  matchAdvance: BOOKING_CONFIG.matchAdvance,
  matchCutoffHours: BOOKING_CONFIG.matchCutoffHours,
  matchMinAdvanceHours: BOOKING_CONFIG.matchMinAdvanceHours,
  matchDepartures: BOOKING_CONFIG.matchDepartures,
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
      baseFare: BOOKING_CONFIG.guaranteedFares.rajendra,
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
  ] as PointConfig[],
}

// Format numbers as Indian currency: "Rs 1,800"
export function formatRs(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN')}`
}

// Night surcharge check (9:00 PM to 4:00 AM)
export function isNightTime(hour: number, minute = 0): boolean {
  return hour >= 21 || hour < 4 || (hour === 4 && minute === 0)
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

// Guaranteed fares are fixed. Booking date never reduces the guaranteed fare.
export function calculateDateFare(
  direction: 'K2I' | 'I2K' | 'KI' | 'IK',
  daysAhead: number,
  config: PricingFormulaConfig = DEFAULT_PRICING_CONFIG,
  travelDate?: string
): number {
  void daysAhead
  void travelDate
  const dirKey = direction === 'IK' || direction === 'I2K' ? 'I2K' : 'K2I'
  return config.BASE[dirKey]
}

/** Fixed guaranteed fare for a drop point; `daysAhead` is kept for old callers. */
export function getPointFareForDate(
  pointIdOrName: string,
  direction: 'K2I' | 'I2K' | 'KI' | 'IK',
  daysAhead: number,
  config: PricingFormulaConfig = DEFAULT_PRICING_CONFIG,
  travelDate?: string
): number {
  void daysAhead
  void travelDate
  const dirKey = direction === 'IK' || direction === 'I2K' ? 'I2K' : 'K2I'
  return config.BASE[dirKey] + (config.POINTS[getPointConfig(pointIdOrName).name] ?? 0)
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
  mode: 'match' | 'guaranteed'
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
  minute?: number
  mode?: 'match' | 'guaranteed'
  customConfig?: PricingFormulaConfig
}): DetailedFareBreakdown {
  const config = params.customConfig || DEFAULT_PRICING_CONFIG
  const dirKey = params.direction === 'IK' || params.direction === 'I2K' ? 'I2K' : 'K2I'
  const selectedPoint = getPointConfig(params.pointIdOrName)
  const standardFare = getPointFareForDate(selectedPoint.id, dirKey, params.daysAhead, config, params.travelDate)
  const pointId = selectedPoint.id as DropPointId
  const pointExtra = getDropPointExtra(pointId)
  const mode = params.mode || 'guaranteed'
  const dateFare = mode === 'match' ? BOOKING_CONFIG.matchDealBaseFares[dirKey] + pointExtra : standardFare
  const earlyDiscount = 0
  const vehicleExtra = params.vehicle === 'suv' && BOOKING_CONFIG.enableSuv ? config.SUV_EXTRA : 0
  const distanceCharge = 0
  const chargeableDistanceKm = 0

  // Night extra
  let isNight = false
  if (typeof params.isNight === 'boolean') {
    isNight = params.isNight
  } else if (typeof params.hour === 'number') {
    isNight = isNightTime(params.hour, params.minute)
  }
  const nightExtra = isNight ? config.NIGHT_SURCHARGE : 0
  const tollEstimate = 0

  const totalFare = dateFare + vehicleExtra + nightExtra
  const advanceDeposit = mode === 'match' ? BOOKING_CONFIG.matchAdvance : BOOKING_CONFIG.guaranteedAdvance
  const balanceFare = Math.max(0, totalFare - advanceDeposit)

  return {
    direction: dirKey,
    mode,
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

