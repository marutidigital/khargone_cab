import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getMatchCutoffAt } from '@/lib/config'
import { sendText } from '@/lib/whatsapp'
import { notifyAdmin } from '@/lib/booking-notifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const db = createServiceClient()
    const body = await req.json().catch(() => null)

    const { booking_id, pickup_time, travel_date, notify_customer = true } = body || {}

    if (!booking_id) {
      return NextResponse.json({ error: 'Booking ID is required.' }, { status: 400 })
    }
    if (!pickup_time) {
      return NextResponse.json({ error: 'Pickup time is required.' }, { status: 400 })
    }

    // Format pickup_time as HH:MM:00
    const timeMatch = String(pickup_time).trim().match(/^(\d{1,2}):(\d{2})(:(\d{2}))?/)
    if (!timeMatch) {
      return NextResponse.json({ error: 'Invalid time format. Use HH:MM.' }, { status: 400 })
    }
    const cleanTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}:00`

    // Fetch existing booking
    const { data: booking, error: bErr } = await db
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single()

    if (bErr || !booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }

    const cleanDate = travel_date || booking.travel_date
    const newCutoff = getMatchCutoffAt(cleanDate, cleanTime.slice(0, 5))

    const { data: updated, error: uErr } = await db
      .from('bookings')
      .update({
        pickup_time: cleanTime,
        travel_date: cleanDate,
        cutoff_at: newCutoff,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id)
      .select('*')
      .single()

    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 500 })
    }

    // Send WhatsApp update to customer if requested
    if (notify_customer && booking.phone) {
      const route = booking.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'
      const time12 = new Date(`2000-01-01T${cleanTime}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      const text = [
        `🚕 *Maruti Cab Pickup Schedule Update* ⏰`,
        ``,
        `Namaste *${booking.passenger_name || 'Passenger'}*!`,
        `Aapki booking *#${booking.booking_ref}* (${route}) ka pickup schedule update kiya gaya hai:`,
        ``,
        `📅 *Travel Date:* ${cleanDate}`,
        `⏰ *New Pickup Time:* ${time12} (${cleanTime.slice(0, 5)})`,
        `📍 *Pickup / Drop:* ${booking.address || booking.drop_name || 'City Point'}`,
        ``,
        `Driver bhaiya is naye samay par aapse call par connect karenge.`,
        `Kripya time par ready rahein. Shubh yatra! ❤️`,
        ``,
        `📞 24x7 Helpline: +91 72823 16090`,
      ].join('\n')

      try {
        await sendText({
          to: booking.phone,
          body: text,
          bookingId: booking.id,
          eventVersion: `time_updated:${Date.now()}`,
        })
      } catch (waErr) {
        console.warn('Customer time update WA notice:', waErr)
      }
    }

    // Notify Admin of schedule modification
    await notifyAdmin(
      `time_update:${booking.id}`,
      booking.id,
      `✏️ Admin schedule update for #${booking.booking_ref} (${booking.passenger_name}): New time ${cleanTime.slice(0, 5)} on ${cleanDate}.`
    )

    return NextResponse.json({
      success: true,
      booking: updated,
      message: `Pickup time updated to ${cleanTime.slice(0, 5)} successfully!`,
    })
  } catch (err: any) {
    console.error('Error updating booking time:', err)
    return NextResponse.json({ error: err.message || 'Failed to update time.' }, { status: 500 })
  }
}
