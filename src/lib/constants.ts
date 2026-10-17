// src/lib/constants.ts
import type { DropOption, Direction } from '@/types'
import { PRICING_CONFIG, isNightTime, computeBookingPrice } from '@/config/pricing'

export const BASE_FARE = PRICING_CONFIG.vehicles.sedan.baseFare
export const NIGHT_EXTRA = PRICING_CONFIG.nightSurcharge

export const POINTS: Record<Direction, DropOption[]> = {
  KI: PRICING_CONFIG.points.map(p => ({
    id: p.id,
    name: p.name,
    sub: p.sub,
    extra: p.extra,
  })),
  IK: PRICING_CONFIG.points.map(p => ({
    id: p.id,
    name: p.name,
    sub: p.sub,
    extra: p.extra,
  })),
}

export const TIME_SLOTS = {
  morning:   { label: 'Morning',   range: '05:00–11:30', defaultH: 8,  defaultM: 0, minH: 5,  maxH: 11 },
  afternoon: { label: 'Afternoon', range: '12:00–16:30', defaultH: 12, defaultM: 0, minH: 12, maxH: 16 },
  evening:   { label: 'Evening',   range: '17:00–21:30', defaultH: 18, defaultM: 0, minH: 17, maxH: 21 },
  night:     { label: 'Night',     range: '22:00–04:30', defaultH: 22, defaultM: 0, minH: 22, maxH: 28 },
}

export function isNightHour(h: number): boolean {
  return isNightTime(h)
}

export function calcPrice(
  dropExtra: number,
  daysAhead: number,
  isNight: boolean,
  vehicleExtra: number = 0,
  direction: Direction = 'KI'
) {
  const isSUV = vehicleExtra > 0
  const vehicle = isSUV ? 'suv' : 'sedan'
  const point = PRICING_CONFIG.points.find(p => p.extra === dropExtra) || PRICING_CONFIG.points[0]
  const hour = isNight ? 23 : 10

  const res = computeBookingPrice({
    vehicle,
    pointId: point.id,
    direction,
    daysAhead,
    hour,
  })

  return {
    base: res.baseFare,
    extra: res.pointExtra,
    discount: res.directionDiscount + res.referralDiscount,
    night_extra: res.nightSurcharge,
    same_day_extra: res.sameDaySurcharge,
    next_day_extra: res.nextDaySurcharge,
    total: res.totalFare,
  }
}

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
