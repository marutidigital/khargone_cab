// src/lib/constants.ts

import type { DropOption, Direction } from '@/types'

export const BASE_FARE = 2000
export const NIGHT_EXTRA = 300

export const POINTS: Record<Direction, DropOption[]> = {
  KI: [
    { id: 'rajendra', name: 'Rajendra Nagar', sub: 'City drop · base fare', extra: 0 },
    { id: 'railway',  name: 'Railway Station', sub: 'Indore Junction · +₹200', extra: 200 },
    { id: 'airport',  name: 'Airport (IDR)',   sub: 'Devi Ahilya Airport · +₹300', extra: 300 },
  ],
  IK: [
    { id: 'rajendra', name: 'Rajendra Nagar', sub: 'City pickup · base fare', extra: 0 },
    { id: 'railway',  name: 'Railway Station', sub: 'Indore Junction · +₹200', extra: 200 },
    { id: 'airport',  name: 'Airport (IDR)',   sub: 'Devi Ahilya Airport · +₹300', extra: 300 },
  ],
}

export const TIME_SLOTS = {
  morning:   { label: 'Morning',   range: '05:00–10:59', defaultH: 8,  defaultM: 0, minH: 5,  maxH: 10 },
  afternoon: { label: 'Afternoon', range: '11:00–16:59', defaultH: 12, defaultM: 0, minH: 11, maxH: 16 },
  evening:   { label: 'Evening',   range: '17:00–21:59', defaultH: 18, defaultM: 0, minH: 17, maxH: 21 },
  night:     { label: 'Night',     range: '22:00–04:59', defaultH: 22, defaultM: 0, minH: 22, maxH: 28 },
}

export function getDiscount(daysAhead: number): number {
  if (daysAhead >= 4) return 300
  if (daysAhead === 3) return 200
  if (daysAhead === 2) return 100
  return 0
}

export function isNightHour(h: number): boolean {
  return h >= 22 || h < 5
}

export function calcPrice(dropExtra: number, daysAhead: number, isNight: boolean, vehicleExtra: number = 0) {
  const base     = BASE_FARE + vehicleExtra
  const discount = getDiscount(daysAhead)
  const night    = isNight ? NIGHT_EXTRA : 0
  return {
    base,
    extra: dropExtra,
    discount,
    night_extra: night,
    total: base + dropExtra - discount + night,
  }
}

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
