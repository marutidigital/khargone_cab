import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase-server'
import { isMatchTimeCompatible, parsePickupDateTime, type RouteDirection } from '@/lib/config'
import { PRICING_CONFIG } from '@/config/pricing'

const Query = z.object({ direction: z.enum(['K2I', 'I2K']) })
const SLOT_INTERVAL_MINUTES = 30
const MAX_RIDES = 100

function labelTime(value: string) {
  const [hour, minute] = value.split(':').map(Number)
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
}

export async function GET(request: NextRequest) {
  const parsed = Query.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Choose a valid route.' }, { status: 400 })

  const direction: RouteDirection = parsed.data.direction
  const opposite: RouteDirection = direction === 'K2I' ? 'I2K' : 'K2I'
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const lastDate = new Date(`${today}T00:00:00+05:30`)
  lastDate.setDate(lastDate.getDate() + 60)
  const through = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(lastDate)
  const db = createServiceClient()
  const { data, error } = await db.from('bookings')
    .select('id,direction,travel_date,pickup_time,drop_point,drop_name,cutoff_at')
    .eq('mode', 'match').eq('status', 'waiting').is('match_id', null).eq('direction', opposite)
    .gte('travel_date', today).lte('travel_date', through)
    .gt('cutoff_at', new Date().toISOString())
    .order('travel_date', { ascending: true }).order('pickup_time', { ascending: true }).limit(MAX_RIDES)

  if (error) {
    console.error('Confirmed ride lookup failed:', error)
    return NextResponse.json({ error: 'Upcoming rides are temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }

  const ids = (data ?? []).map((ride: { id: string }) => ride.id)
  const { data: reservations, error: reservationError } = ids.length
    ? await db.from('booking_match_reservations').select('candidate_booking_id').in('candidate_booking_id', ids).gt('expires_at', new Date().toISOString())
    : { data: [], error: null }
  if (reservationError) {
    console.error('Confirmed ride reservation lookup failed:', reservationError)
    return NextResponse.json({ error: 'Upcoming rides are temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
  const reserved = new Set((reservations ?? []).map((row: { candidate_booking_id: string }) => row.candidate_booking_id))
  const names = new Map<string, string>(PRICING_CONFIG.points.map((point) => [point.id, point.name]))
  const now = new Date()
  const rides = (data ?? []).flatMap((ride: { id: string; direction: string; travel_date: string; pickup_time: string; drop_point: string; drop_name: string | null }) => {
    if (reserved.has(ride.id)) return []
    const existingDirection: RouteDirection = ride.direction === 'KI' ? 'K2I' : 'I2K'
    const existingTime = ride.pickup_time.slice(0, 5)
    const returnTimes: string[] = []
    for (let minute = 0; minute < 24 * 60; minute += SLOT_INTERVAL_MINUTES) {
      const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
      const pickup = parsePickupDateTime(ride.travel_date, time)
      if (pickup && pickup > now && isMatchTimeCompatible(direction, time, existingDirection, existingTime)) returnTimes.push(time)
    }
    if (!returnTimes.length) return []
    return [{
      id: ride.id,
      date: ride.travel_date,
      existingDirection,
      existingTime,
      pointId: ride.drop_point,
      pointName: ride.drop_name || names.get(ride.drop_point) || 'Indore',
      returnTimes: returnTimes.map((time) => ({ value: time, label: labelTime(time) })),
    }]
  })

  return NextResponse.json({ rides }, { headers: { 'Cache-Control': 'no-store' } })
}
