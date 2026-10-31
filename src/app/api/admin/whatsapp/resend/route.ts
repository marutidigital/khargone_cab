import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase-server'
import { notify } from '@/lib/booking-notifications'
import type { WhatsAppEvent } from '@/lib/whatsapp-templates'

const EVENT_BY_TEMPLATE: Record<string, WhatsAppEvent> = {
  booking_received_match: 'payment_captured', booking_received_guaranteed: 'payment_captured',
  match_confirmed_customer: 'match_confirmed', match_confirmed_driver: 'match_confirmed',
  no_match_options: 'no_match', refund_processed: 'refund_processed',
  ride_reminder_customer: 'ride_reminder', ride_reminder_driver: 'ride_reminder', feedback_request: 'feedback_request',
}

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request)
  if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const body = await request.json().catch(() => null)
  if (typeof body?.bookingId !== 'string' || typeof body?.template !== 'string' || !EVENT_BY_TEMPLATE[body.template]) {
    return NextResponse.json({ error: 'Choose a booking and a supported template.' }, { status: 400 })
  }
  const db = createServiceClient()
  const { data: booking } = await db.from('bookings').select('id,mode,driver_id').eq('id', body.bookingId).limit(1).single()
  if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  const result = await notify(EVENT_BY_TEMPLATE[body.template], booking.id, { resend: true, eventVersion: `admin-resend:${Date.now()}` })
  return NextResponse.json({ success: result.status === 'sent', result })
}
