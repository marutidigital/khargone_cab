import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { parsePickupDateTime } from '@/lib/config'
import { notify } from '@/lib/booking-notifications'

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = createServiceClient()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
  const tomorrow = new Date(Date.now() + 36 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const { data, error } = await db.from('bookings').select('*').in('status', ['confirmed', 'matched']).gte('travel_date', today).lte('travel_date', tomorrow).is('reminder_sent_at', null).limit(200)
  if (error) return NextResponse.json({ error: 'Could not load upcoming rides.' }, { status: 503 })
  const now = Date.now()
  let sent = 0
  for (const booking of data ?? []) {
    const pickup = parsePickupDateTime(booking.travel_date, String(booking.pickup_time).slice(0, 5))
    if (!pickup || pickup.getTime() - now > 2 * 60 * 60 * 1000 || pickup.getTime() - now < 90 * 60 * 1000) continue
    const { data: changed } = await db.from('bookings').update({ reminder_sent_at: new Date().toISOString() }).eq('id', booking.id).is('reminder_sent_at', null).select('id')
    if (!changed?.length) continue
    await notify('ride_reminder', booking.id, { eventVersion: `pickup:${booking.travel_date}:${String(booking.pickup_time).slice(0, 5)}` })
    sent++
  }
  const { data: feedbackDue, error: feedbackError } = await db.from('bookings').select('id,feedback_due_at').eq('status', 'completed').lte('feedback_due_at', new Date().toISOString()).is('feedback_sent_at', null).limit(200)
  if (feedbackError) return NextResponse.json({ error: 'Could not load feedback reminders.' }, { status: 503 })
  let feedbackSent = 0
  for (const booking of feedbackDue ?? []) {
    const claimedAt = new Date().toISOString()
    const { data: claimed } = await db.from('bookings').update({ feedback_sent_at: claimedAt }).eq('id', booking.id).is('feedback_sent_at', null).select('id')
    if (!claimed?.length) continue
    const result = await notify('feedback_request', booking.id, { eventVersion: `feedback:${booking.feedback_due_at}` })
    if (result.status === 'sent') feedbackSent += 1
    else await db.from('bookings').update({ feedback_sent_at: null }).eq('id', booking.id).eq('feedback_sent_at', claimedAt)
  }
  return NextResponse.json({ sent, feedbackSent })
}
