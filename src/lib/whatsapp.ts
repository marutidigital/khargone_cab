// src/lib/whatsapp.ts

function getWhatsAppConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION ?? 'v23.0'

  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp Cloud API is not configured')
  }

  return {
    accessToken,
    apiUrl: `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
  }
}

interface TextMessage {
  to: string
  text: string
}

async function sendRaw(body: object) {
  const { apiUrl, accessToken } = getWhatsAppConfig()
  const res = await fetch(apiUrl, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('WhatsApp API error:', err)
    throw new Error(`WhatsApp send failed: ${res.status}`)
  }
  return res.json()
}

export async function sendTextMessage({ to, text }: TextMessage) {
  const phone = to.replace(/\D/g, '')
  return sendRaw({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: { body: text },
  })
}

export async function sendBookingConfirmation(booking: {
  passenger_name: string
  phone: string
  booking_ref: string
  direction: string
  drop_name: string
  travel_date: string
  pickup_time: string
  total_fare: number
  status: string
  is_night: boolean
  discount: number
}) {
  const dirLabel = booking.direction === 'KI' ? 'Khargone → Indore' : 'Indore → Khargone'
  const statusIcon = booking.status === 'confirmed' ? '✅' : '⏳'
  const statusText = booking.status === 'confirmed' ? 'CONFIRMED' : 'WAITING FOR MATCH'

  let msg = `*Hanscab (hanscab.in)*\n`
  msg += `━━━━━━━━━━━━━━\n`
  msg += `${statusIcon} Booking ${statusText}\n\n`
  msg += `*Ref:* ${booking.booking_ref}\n`
  msg += `*Route:* ${dirLabel}\n`
  msg += `*Drop:* ${booking.drop_name}\n`
  msg += `*Date:* ${booking.travel_date}\n`
  msg += `*Time:* ${booking.pickup_time}${booking.is_night ? ' 🌙 Night' : ''}\n\n`
  msg += `*Amount: Rs ${booking.total_fare.toLocaleString('en-IN')}*`
  if (booking.discount > 0) msg += ` _(−Rs ${booking.discount} discount)_`
  msg += `\n\n`

  if (booking.status === 'confirmed') {
    msg += `Your private cab is confirmed! Driver details will be shared before pickup.\n\n`
  } else {
    msg += `Booking request received! Driver details will be confirmed shortly. Full refund if trip cannot be confirmed.\n\n`
  }

  msg += `Questions? Reply to this message.\n`
  msg += `_Hanscab — Reliable Private Cabs Khargone ↔ Indore_`

  return sendTextMessage({ to: booking.phone, text: msg })
}

export async function sendMatchNotification(booking: {
  passenger_name: string
  phone: string
  booking_ref: string
  direction: string
  travel_date: string
  pickup_time: string
}) {
  const dirLabel = booking.direction === 'KI' ? 'Khargone → Indore' : 'Indore → Khargone'
  const msg = `*Hanscab* ✅\n\nGreat news, ${booking.passenger_name}!\n\nYour booking *${booking.booking_ref}* has been *CONFIRMED*!\n\n*Route:* ${dirLabel}\n*Date:* ${booking.travel_date} · ${booking.pickup_time}\n\nYour driver will call you 30 minutes before pickup. Reply with any questions.`
  return sendTextMessage({ to: booking.phone, text: msg })
}

export function formatIncomingMessage(body: any): { phone: string; text: string } | null {
  try {
    const entry   = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value   = changes?.value
    const msg     = value?.messages?.[0]
    if (!msg || msg.type !== 'text') return null
    return {
      phone: msg.from,
      text:  msg.text.body,
    }
  } catch {
    return null
  }
}
