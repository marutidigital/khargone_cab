import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { PRICING_CONFIG } from '@/config/pricing'

export const dynamic = 'force-dynamic'

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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Ride ID is required' }, { status: 400 })
    }

    const db = createServiceClient()
    const { data: b, error } = await db
      .from('bookings')
      .select('id, direction, travel_date, pickup_time, drop_point, drop_name, passenger_count, total_fare, advance_paid, advance_amount, cutoff_at, status, match_id')
      .eq('id', id)
      .maybeSingle()

    if (error || !b) {
      return NextResponse.json({ error: 'Return ride not found' }, { status: 404 })
    }

    const pointMap = new Map<string, string>(
      PRICING_CONFIG.points.map((p) => [p.id, p.name])
    )

    const isKI = b.direction === 'KI'
    const pickupClean = String(b.pickup_time || '12:00').slice(0, 5)
    const advance = b.advance_paid || b.advance_amount || 500

    const ride = {
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
      status: b.status,
      statusText: b.status === 'waiting' && !b.match_id ? 'Waiting for Return Match' : 'Already Booked',
      isAvailable: b.status === 'waiting' && !b.match_id,
    }

    return NextResponse.json({ ride })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch ride' }, { status: 500 })
  }
}
