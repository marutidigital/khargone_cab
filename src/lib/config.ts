export type BookingMode = 'match' | 'guaranteed'
export type RouteDirection = 'K2I' | 'I2K'
export type DropPointId = 'rajendra' | 'bhawarkua' | 'railway' | 'airport' | 'rajwada'

function envAmount(raw: string | undefined, fallback: number): number {
  const value = Number(raw)
  return Number.isSafeInteger(value) && value >= 0 ? value : fallback
}

function readDepartures(raw: string | undefined, fallback: Record<RouteDirection, string[]>) {
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw) as Partial<Record<RouteDirection, unknown>>
    const isTimeList = (value: unknown): value is string[] =>
      Array.isArray(value) && value.length > 0 && value.every((time) => typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    if (isTimeList(parsed.K2I) && isTimeList(parsed.I2K)) return { K2I: parsed.K2I, I2K: parsed.I2K }
  } catch {
    // Invalid environment JSON falls back to the reviewed departure list.
  }
  return fallback
}

export const BOOKING_CONFIG = {
  baseRouteKm: 157,
  travelHours: 3.5,
  guaranteedFares: {
    rajendra: 2200,
    bhawarkua: 2300,
    railway: 2500,
    airport: 2700,
    rajwada: 2400,
  } satisfies Record<DropPointId, number>,
  matchDealBaseFares: {
    K2I: 2200,
    I2K: 1800,
  } satisfies Record<RouteDirection, number>,
  suvExtra: envAmount(process.env.NEXT_PUBLIC_SUV_EXTRA, 500),
  nightSurcharge: envAmount(process.env.NEXT_PUBLIC_NIGHT_SURCHARGE, 400),
  matchAdvance: envAmount(process.env.NEXT_PUBLIC_MATCH_ADVANCE, 500),
  guaranteedAdvance: envAmount(process.env.NEXT_PUBLIC_ADVANCE_FOR_GUARANTEED, 500),
  matchCutoffHours: envAmount(process.env.NEXT_PUBLIC_MATCH_CUTOFF_HOURS, 24),
  matchMinAdvanceHours: 0,
  matchMinGapHours: envAmount(process.env.NEXT_PUBLIC_MATCH_MIN_GAP_HOURS, 4),
  matchMaxGapHours: envAmount(process.env.NEXT_PUBLIC_MATCH_MAX_GAP_HOURS, 8),
  extraKmRate: envAmount(process.env.NEXT_PUBLIC_EXTRA_KM_RATE, 13),
  guaranteedMinLeadHours: envAmount(process.env.NEXT_PUBLIC_GUARANTEED_MIN_LEAD_HOURS, 0),
  maxAdvanceDays: 60,
  enableSuv: process.env.NEXT_PUBLIC_ENABLE_SUV === 'true',
  matchDepartures: readDepartures(process.env.NEXT_PUBLIC_MATCH_DEPARTURES, {
    K2I: ['06:00', '07:00', '09:00', '12:00', '15:00'],
    I2K: ['11:00', '13:00', '16:00', '18:00', '20:00'],
  }),
} as const

export interface FareBreakdown {
  baseFare: number
  dropPointExtra: number
  nightSurcharge: number
  vehicleExtra: number
  totalFare: number
  advanceAmount: number
  balanceAmount: number
}

export function getDropPointExtra(point: DropPointId): number {
  return BOOKING_CONFIG.guaranteedFares[point] - BOOKING_CONFIG.guaranteedFares.rajendra
}

export function isNightPickup(time: string): boolean {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time)
  if (!match) return false
  const hour = Number(match[1])
  const minute = Number(match[2])
  return hour >= 21 || hour < 4 || (hour === 4 && minute === 0)
}

export function calculateBookingFare(input: {
  mode: BookingMode
  direction: RouteDirection
  point: DropPointId
  pickupTime: string
  vehicle?: 'economy_sedan' | 'premium_suv'
}): FareBreakdown {
  if (input.vehicle === 'premium_suv' && !BOOKING_CONFIG.enableSuv) {
    throw new Error('Premium SUV is not currently available.')
  }
  const dropPointExtra = getDropPointExtra(input.point)
  const dirKey = input.direction === 'I2K' ? 'I2K' : 'K2I'
  const baseFare = BOOKING_CONFIG.matchDealBaseFares[dirKey]
  const nightSurcharge = isNightPickup(input.pickupTime) ? BOOKING_CONFIG.nightSurcharge : 0
  const vehicleExtra = input.vehicle === 'premium_suv' ? BOOKING_CONFIG.suvExtra : 0
  const totalFare = baseFare + dropPointExtra + nightSurcharge + vehicleExtra
  const advanceAmount = input.mode === 'match'
    ? BOOKING_CONFIG.matchAdvance
    : BOOKING_CONFIG.guaranteedAdvance

  return {
    baseFare,
    dropPointExtra,
    nightSurcharge,
    vehicleExtra,
    totalFare,
    advanceAmount,
    balanceAmount: Math.max(0, totalFare - advanceAmount),
  }
}

export function parsePickupDateTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null
  const result = new Date(`${date}T${time}:00+05:30`)
  if (Number.isNaN(result.getTime())) return null
  const indiaDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(result)
  const indiaTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(result)
  return indiaDate === date && indiaTime === time ? result : null
}

export function isMatchDealWithinWindow(date: string, time: string, now = new Date()): boolean {
  const pickup = parsePickupDateTime(date, time)
  if (!pickup) return false
  return pickup.getTime() > now.getTime()
}

export function getMatchCutoffAt(date: string, time: string, now = new Date()): string | null {
  const pickup = parsePickupDateTime(date, time)
  if (!pickup) return null
  const nowMs = now.getTime()
  const pickupMs = pickup.getTime()
  const sixHoursBefore = pickupMs - 6 * 60 * 60 * 1000

  // If pickup is more than 6 hours away, standard 6-hour prior cutoff applies
  if (sixHoursBefore > nowMs) {
    return new Date(sixHoursBefore).toISOString()
  }

  // Same-day / short-notice booking (within 6 hours):
  // Set cutoff to 1 hour prior to pickup so the booking remains active on the public board
  const oneHourBefore = pickupMs - 60 * 60 * 1000
  if (oneHourBefore > nowMs) {
    return new Date(oneHourBefore).toISOString()
  }

  return new Date(pickupMs).toISOString()
}

export function isCutoffExpired(cutoffAt: string | null | undefined, now = new Date()): boolean {
  if (!cutoffAt) return false
  const cutoff = Date.parse(cutoffAt)
  return Number.isFinite(cutoff) && cutoff <= now.getTime()
}

export function isAutoRefundDue(decisionAt: string | null | undefined, now = new Date()): boolean {
  if (!decisionAt) return false
  const decided = Date.parse(decisionAt)
  return Number.isFinite(decided) && now.getTime() - decided >= 6 * 60 * 60 * 1000
}

export function isMatchTimeCompatible(
  firstDirection: RouteDirection,
  firstTime: string,
  otherDirection: RouteDirection,
  otherTime: string
): boolean {
  if (firstDirection === otherDirection) return false
  const toMinutes = (value: string) => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
    return match ? Number(match[1]) * 60 + Number(match[2]) : null
  }
  const first = toMinutes(firstTime)
  const other = toMinutes(otherTime)
  if (first === null || other === null) return false

  const outbound = firstDirection === 'K2I' ? first : other
  const returnTime = firstDirection === 'I2K' ? first : other
  const gapHours = (returnTime - outbound) / 60
  return gapHours >= BOOKING_CONFIG.matchMinGapHours && gapHours <= BOOKING_CONFIG.matchMaxGapHours
}

export function getCompatibleMatchDepartures(direction: RouteDirection, time: string): string[] {
  const opposite: RouteDirection = direction === 'K2I' ? 'I2K' : 'K2I'
  return BOOKING_CONFIG.matchDepartures[opposite].filter((candidate) =>
    isMatchTimeCompatible(direction, time, opposite, candidate)
  )
}

export function isAllowedMatchDeparture(direction: RouteDirection, time: string): boolean {
  return (BOOKING_CONFIG.matchDepartures[direction] as readonly string[]).includes(time)
}
