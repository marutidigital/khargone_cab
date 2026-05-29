// src/lib/email.ts
import { Resend } from 'resend'
import type { Booking } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = process.env.RESEND_FROM_EMAIL ?? 'bookings@khargonecabs.com'
const ADMIN  = process.env.ADMIN_EMAIL ?? 'admin@khargonecabs.com'

function dirLabel(d: string) {
  return d === 'KI' ? 'Khargone → Indore' : 'Indore → Khargone'
}

function bookingEmailHtml(b: Booking, type: 'confirmation' | 'admin') {
  const statusColor = b.status === 'confirmed' ? '#4CAF82' : '#D4843A'
  const statusText  = b.status === 'confirmed' ? 'Confirmed' : 'Waiting for Match'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>KC · Booking ${b.booking_ref}</title>
</head>
<body style="margin:0;padding:0;background:#0C0C0B;font-family:'Courier New',monospace;color:#F0EFE8;">
  <div style="max-width:480px;margin:0 auto;padding:24px 16px;">
    <div style="margin-bottom:24px;">
      <span style="font-size:24px;font-weight:700;letter-spacing:-0.03em;">KC<span style="color:#C9A84C;">.</span></span>
      <span style="font-size:10px;color:#6B6B65;letter-spacing:0.1em;text-transform:uppercase;margin-left:12px;">Khargone Cabs</span>
    </div>

    <div style="background:#141413;border-radius:12px;border:1px solid #232321;overflow:hidden;margin-bottom:16px;">
      <div style="padding:20px;border-bottom:1px solid #232321;">
        <div style="font-size:11px;color:#6B6B65;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;">
          ${type === 'admin' ? '🔔 New Booking' : 'Your Booking'}
        </div>
        <div style="font-size:28px;color:#C9A84C;letter-spacing:-0.03em;font-weight:700;">${b.booking_ref}</div>
        <div style="display:inline-block;margin-top:10px;padding:4px 12px;border-radius:20px;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}44;">
          ${statusText}
        </div>
      </div>

      <div style="padding:20px;border-bottom:1px solid #232321;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;font-size:10px;color:#6B6B65;text-transform:uppercase;letter-spacing:0.08em;width:40%;">Route</td>
            <td style="padding:6px 0;font-size:13px;color:#F0EFE8;">${dirLabel(b.direction)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:10px;color:#6B6B65;text-transform:uppercase;letter-spacing:0.08em;">Drop Point</td>
            <td style="padding:6px 0;font-size:13px;color:#F0EFE8;">${b.drop_name}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:10px;color:#6B6B65;text-transform:uppercase;letter-spacing:0.08em;">Date</td>
            <td style="padding:6px 0;font-size:13px;color:#F0EFE8;">${b.travel_date}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:10px;color:#6B6B65;text-transform:uppercase;letter-spacing:0.08em;">Time</td>
            <td style="padding:6px 0;font-size:13px;color:#F0EFE8;">${b.pickup_time}${b.is_night ? ' 🌙' : ''}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:10px;color:#6B6B65;text-transform:uppercase;letter-spacing:0.08em;">Passenger</td>
            <td style="padding:6px 0;font-size:13px;color:#F0EFE8;">${b.passenger_name}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:10px;color:#6B6B65;text-transform:uppercase;letter-spacing:0.08em;">Mobile</td>
            <td style="padding:6px 0;font-size:13px;color:#F0EFE8;">${b.phone}</td>
          </tr>
        </table>
      </div>

      <div style="padding:20px;">
        <div style="font-size:10px;color:#6B6B65;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Fare Breakdown</div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#6B6B65;margin-bottom:4px;">
          <span>Base fare</span><span>₹${b.base_fare.toLocaleString('en-IN')}</span>
        </div>
        ${b.discount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#4CAF82;margin-bottom:4px;"><span>Early discount</span><span>−₹${b.discount.toLocaleString('en-IN')}</span></div>` : ''}
        ${b.night_extra > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#D4843A;margin-bottom:4px;"><span>Night surcharge</span><span>+₹${b.night_extra.toLocaleString('en-IN')}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:20px;color:#C9A84C;font-weight:700;margin-top:10px;padding-top:10px;border-top:1px solid #232321;">
          <span>Total</span><span>₹${b.total_fare.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>

    <div style="font-size:10px;color:#3D3D39;text-align:center;line-height:1.6;">
      Full Dzire AC · 1–4 passengers · Driver: +₹15/km beyond Rajendra Nagar<br>
      Khargone Cabs · khargonecabs.com
    </div>
  </div>
</body>
</html>`
}

export async function sendBookingEmail(booking: Booking) {
  if (!booking.email) return

  const dirText = dirLabel(booking.direction)
  const subject = booking.status === 'confirmed'
    ? `✅ Confirmed — ${booking.booking_ref} | ${dirText}`
    : `⏳ Booking Placed — ${booking.booking_ref} | ${dirText}`

  return resend.emails.send({
    from: FROM,
    to:   booking.email,
    subject,
    html: bookingEmailHtml(booking, 'confirmation'),
  })
}

export async function sendAdminAlert(booking: Booking) {
  return resend.emails.send({
    from: FROM,
    to:   ADMIN,
    subject: `🔔 New Booking ${booking.booking_ref} — ${booking.passenger_name} — ${dirLabel(booking.direction)}`,
    html: bookingEmailHtml(booking, 'admin'),
  })
}

export async function sendMatchEmail(booking: Booking) {
  if (!booking.email) return

  const subject = `✅ Match Found! Booking ${booking.booking_ref} Confirmed`
  return resend.emails.send({
    from: FROM,
    to:   booking.email,
    subject,
    html: bookingEmailHtml({ ...booking, status: 'confirmed' }, 'confirmation'),
  })
}
