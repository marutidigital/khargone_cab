import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { isMatchTimeCompatible, type RouteDirection } from '@/lib/config'
import { z } from 'zod'

const Query = z.object({ direction: z.enum(['K2I', 'I2K']), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) })

export async function GET(request: NextRequest) {
  const parsed = Query.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid availability query.' }, { status: 400 })
  const { direction, date, time } = parsed.data
  const opposite = direction === 'K2I' ? 'IK' : 'KI'
  const db = createServiceClient()
  const { data, error } = await db.from('bookings')
    .select('direction,pickup_time')
    .eq('mode', 'match').eq('status', 'waiting').eq('travel_date', date).eq('direction', opposite)
  if (error) return NextResponse.json({ ready: false, count: 0 }, { status: 200 })
  const count = (data ?? []).filter((row: { direction: string; pickup_time: string }) =>
    isMatchTimeCompatible(direction as RouteDirection, time, row.direction === 'KI' ? 'K2I' : 'I2K', row.pickup_time.slice(0, 5))
  ).length
  return NextResponse.json({ ready: count > 0, count }, { headers: { 'Cache-Control': 'no-store' } })
}
