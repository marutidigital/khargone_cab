import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { PRICING_CONFIG } from '@/config/pricing'

export const dynamic = 'force-dynamic'

function todayInIndia(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function formatTime12(timeStr: string): string {
  const [hourText, minuteText] = timeStr.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return timeStr
  const hour12 = hour % 12 || 12
  const ampm = hour < 12 ? 'AM' : 'PM'
  return `${hour12}:${String(minute).padStart(2, '0')} ${ampm}`
}

function formatDateDisplay(dateStr: string): string {
  try {
    const d = new Date(`${dateStr}T12:00:00+05:30`)
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const directionParam = searchParams.get('direction') // 'K2I' | 'I2K' or null

    const db = createServiceClient()
    const today = todayInIndia()
    const nowIso = new Date().toISOString()

    let query = db
      .from('bookings')
      .select('id, direction, travel_date, pickup_time, drop_point, drop_name, passenger_count, total_fare, advance_paid, advance_amount, cutoff_at, status, match_id')
      .eq('status', 'waiting')
      .is('match_id', null)
      .gte('travel_date', today)
      .gt('cutoff_at', nowIso)
      .order('travel_date', { ascending: true })
      .order('pickup_time', { ascending: true })
      .limit(50)

    if (directionParam === 'K2I') {
      query = query.eq('direction', 'KI')
    } else if (directionParam === 'I2K') {
      query = query.eq('direction', 'IK')
    }

    const { data: bookings, error } = await query

    if (error) {
      console.error('Error fetching available public rides:', error)
      return NextResponse.json({ rides: [] }, { status: 500 })
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ rides: [] }, { headers: { 'Cache-Control': 'no-store' } })
    }

    // Exclude rides currently under active hold in booking_match_reservations
    const rideIds = bookings.map((b: any) => b.id)
    const { data: activeReservations } = await db
      .from('booking_match_reservations')
      .select('candidate_booking_id')
      .in('candidate_booking_id', rideIds)
      .gt('expires_at', nowIso)

    const reservedSet = new Set((activeReservations || []).map((r: any) => r.candidate_booking_id))

    const pointMap = new Map<string, string>(
      PRICING_CONFIG.points.map((p) => [p.id, p.name])
    )

    const rides = bookings
      .filter((b: any) => !reservedSet.has(b.id))
      .map((b: any) => {
        const isKI = b.direction === 'KI'
        const pickupClean = String(b.pickup_time || '12:00').slice(0, 5)
        const advance = b.advance_paid || b.advance_amount || 500

        return {
          id: b.id,
          direction: b.direction as 'KI' | 'IK',
          routeDirection: (isKI ? 'K2I' : 'I2K') as 'K2I' | 'I2K',
          routeLabel: isKI ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone',
          travelDate: b.travel_date,
          travelDateFormatted: formatDateDisplay(b.travel_date),
          pickupTime: pickupClean,
          pickupTimeFormatted: formatTime12(pickupClean),
          passengerCount: b.passenger_count || 1,
          dropPoint: b.drop_point || 'rajendra',
          dropName: b.drop_name || pointMap.get(b.drop_point) || (isKI ? 'Indore City Point' : 'Khargone'),
          totalFare: b.total_fare || (isKI ? 2200 : 1800),
          advanceAmount: advance,
          oppositeDirection: (isKI ? 'I2K' : 'K2I') as 'I2K' | 'K2I',
          oppositeRouteLabel: isKI ? 'Indore ➔ Khargone' : 'Khargone ➔ Indore',
          oppositeBaseFare: isKI ? 1800 : 2200,
          statusText: 'Waiting for Return Match',
        }
      })

    return NextResponse.json(
      { rides },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
        },
      }
    )
  } catch (err: any) {
    console.error('Available rides API handler error:', err)
    return NextResponse.json({ rides: [] }, { status: 500 })
  }
}
