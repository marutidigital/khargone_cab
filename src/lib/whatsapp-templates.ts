// src/lib/whatsapp-templates.ts
// Handles formatting, database lookup, and dispatching for the 5 WhatsApp Utility Templates

import { createServiceClient } from '@/lib/supabase-server'
import { sendText } from '@/lib/whatsapp'

export interface WhatsAppTemplateRecord {
  template_code: string
  meta_template_name: string
  header_text: string | null
  body_text: string
  footer_text: string | null
  variables: string[]
}

export const TEMPLATE_DEFINITIONS: Record<string, WhatsAppTemplateRecord> = {
  booking_received: {
    template_code: 'booking_received',
    meta_template_name: 'booking_received',
    header_text: '🚕 We\'ve Got Your Booking!',
    body_text: `Hey {{1}}! 👋

Thanks for choosing Maruti Cab Booking!

We've received your travel request.

🧾 Booking ID: {{2}}
📍 Route: {{3}}
📅 Travel Date: {{4}}
⏰ Departure Time: {{5}}

We're now looking for the right return-ride match for your journey.

💡 ज़रूरी जानकारी:

आपकी बुकिंग अभी कन्फर्म नहीं हुई है। हम आपकी यात्रा के लिए सही रिटर्न राइड की व्यवस्था कर रहे हैं। जैसे ही रिटर्न राइड, ड्राइवर और गाड़ी की व्यवस्था पक्की हो जाएगी, हम आपको पूरी जानकारी भेज देंगे।

अगर तय समय सीमा तक सही रिटर्न राइड नहीं मिलती है, तो आपकी बुकिंग कैंसिल कर दी जाएगी और आपका पूरा ₹500 एडवांस रिफंड उसी समय शुरू कर दिया जाएगा।`,
    footer_text: 'Your journey matters to us! ❤️',
    variables: ['customer_name', 'booking_id', 'route', 'travel_date', 'departure_time'],
  },
  payment_received: {
    template_code: 'payment_received',
    meta_template_name: 'payment_received',
    header_text: '🎉 Your Advance Payment Is In!',
    body_text: `Hey {{1}}! 👋

Payment received! You're one step closer to your journey. 😊

💰 Amount Paid: ₹500
🧾 Booking ID: {{2}}
🔖 Payment Reference: {{3}}
📍 Route: {{4}}
📅 Travel Date: {{5}}

We're now looking for a suitable return-ride match for you.

We'll message you as soon as your ride is arranged!

Thanks for trusting Maruti Cab Booking. ❤️`,
    footer_text: 'We\'re happy to have you onboard! 🚕',
    variables: ['customer_name', 'booking_id', 'payment_reference', 'route', 'travel_date'],
  },
  cab_confirmed: {
    template_code: 'cab_confirmed',
    meta_template_name: 'cab_confirmed',
    header_text: '🎉 Your Ride Is All Set!',
    body_text: `Hey {{1}}! 😍

Good news! We've found your return-ride match, and your ride is officially confirmed!

Here are your travel details:

🧾 Booking ID: {{2}}
📍 Route: {{3}}
📅 Travel Date: {{4}}
⏰ Pickup Time: {{5}}

🚘 Your Cab Details

Vehicle: {{6}}
Registration Number: {{7}}

👨✈️ Your Driver

Name: {{8}}
Contact: {{9}}

💰 Fare Details

Total Fare: ₹{{10}}
Advance Paid: ₹500
Balance in Cab: ₹{{11}}

Just be ready at your pickup location on time.

Have a wonderful and safe trip! ❤️`,
    footer_text: 'Happy journey with Maruti! ❤️',
    variables: [
      'customer_name',
      'booking_id',
      'route',
      'travel_date',
      'pickup_time',
      'vehicle_model',
      'reg_number',
      'driver_name',
      'driver_phone',
      'total_fare',
      'balance_fare',
    ],
  },
  refund_initiated: {
    template_code: 'refund_initiated',
    meta_template_name: 'refund_initiated',
    header_text: '💸 An Update About Your Refund',
    body_text: `Hey {{1}}! 👋

We're really sorry, but unfortunately, we couldn't find a suitable return-ride match for your journey this time.

Your booking has been cancelled, and your full advance refund has been submitted for processing.

🧾 Booking ID: {{2}}
💰 Refund Amount: ₹500
🔖 Refund Reference: {{3}}

The amount should reflect in your original payment method within your payment provider's processing time.

We're sorry things didn't work out this time. We hope to get you on the road with us soon! ❤️`,
    footer_text: 'Thank you for understanding. – Maruti Cab Booking',
    variables: ['customer_name', 'booking_id', 'refund_reference'],
  },
  travel_reminder: {
    template_code: 'travel_reminder',
    meta_template_name: 'travel_reminder',
    header_text: '🧳 Your Journey Is Coming Up!',
    body_text: `Hey {{1}}! 👋

Just a friendly reminder that your trip with Maruti Cab Booking is coming up!

🧾 Booking ID: {{2}}
📍 Route: {{3}}
📅 Travel Date: {{4}}
⏰ Pickup Time: {{5}}
📌 Pickup Location: {{6}}

Your cab is confirmed, so it's almost time to hit the road! 🚕💨

Please be ready at your pickup location on time.

Need any help? Just reply to this message. 😊`,
    footer_text: 'Travel safe, travel happy! ❤️',
    variables: ['customer_name', 'booking_id', 'route', 'travel_date', 'pickup_time', 'pickup_location'],
  },
}

export function renderTemplateText(templateCode: string, values: string[]): { header?: string; body: string; footer?: string; fullText: string } {
  const tpl = TEMPLATE_DEFINITIONS[templateCode]
  if (!tpl) {
    throw new Error(`Unknown template code: ${templateCode}`)
  }

  let body = tpl.body_text
  values.forEach((val, idx) => {
    const placeholder = new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g')
    body = body.replace(placeholder, String(val ?? ''))
  })

  const header = tpl.header_text || undefined
  const footer = tpl.footer_text || undefined

  const parts = [header ? `*${header}*\n` : null, body, footer ? `\n_${footer}_` : null].filter(Boolean)
  const fullText = parts.join('\n')

  return { header, body, footer, fullText }
}

export async function sendWhatsAppTemplateMessage(params: {
  toPhone: string
  templateCode: 'booking_received' | 'payment_received' | 'cab_confirmed' | 'refund_initiated' | 'travel_reminder'
  variables: string[]
  bookingId?: string
  customerId?: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const db = createServiceClient()
  const { toPhone, templateCode, variables, bookingId } = params

  try {
    // 1. Try to fetch dynamic template from database, fallback to built-in definition
    const { data: dbTemplate } = await db
      .from('whatsapp_message_templates')
      .select('*')
      .eq('template_code', templateCode)
      .eq('active', true)
      .limit(1)
      .single()

    let bodyText = dbTemplate?.body_text || TEMPLATE_DEFINITIONS[templateCode]?.body_text
    const headerText = dbTemplate?.header_text || TEMPLATE_DEFINITIONS[templateCode]?.header_text
    const footerText = dbTemplate?.footer_text || TEMPLATE_DEFINITIONS[templateCode]?.footer_text

    if (!bodyText) {
      throw new Error(`Template ${templateCode} not found in database or defaults.`)
    }

    variables.forEach((val, idx) => {
      const placeholder = new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g')
      bodyText = bodyText.replace(placeholder, String(val ?? ''))
    })

    const fullMessage = [
      headerText ? `*${headerText}*\n` : '',
      bodyText,
      footerText ? `\n_${footerText}_` : '',
    ]
      .filter(Boolean)
      .join('\n')

    // 2. Dispatch via WhatsApp Cloud API
    const sendResult = await sendText({
      to: toPhone,
      body: fullMessage,
      bookingId: bookingId,
      eventVersion: `tpl:${templateCode}:${Date.now()}`,
    })

    const msgId = (sendResult as any)?.messages?.[0]?.id || (sendResult as any)?.id || null

    // 3. Log into notifications table
    await db.from('notifications').insert({
      booking_id: bookingId || null,
      template: templateCode,
      recipient: toPhone,
      status: msgId ? 'sent' : 'failed',
      wa_message_id: msgId,
      provider_message_id: msgId,
      sent_at: new Date().toISOString(),
      recipient_type: 'customer',
      event_version: `tpl:${templateCode}`,
    }).catch((err: any) => console.error('Failed to log notification:', err))

    return { success: true, messageId: msgId || undefined }
  } catch (err: any) {
    console.error(`Error sending template ${templateCode}:`, err)
    return { success: false, error: err?.message || 'Failed to dispatch WhatsApp template.' }
  }
}

// Backward compatibility exports for existing notification modules
export type WhatsAppEvent =
  | 'payment_captured'
  | 'match_confirmed'
  | 'no_match'
  | 'refund_processed'
  | 'ride_reminder'
  | 'feedback_request'
  | 'admin_alert'

export const WHATSAPP_TEMPLATES = {
  booking_received_match: { category: 'UTILITY', language: 'en', body: 'Hi {{1}}, aapki MarutiCab Match Deal booking mil gayi. {{2}} se {{3}}, {{4}} ko {{5}} baje. Advance Rs {{6}} mila. Hum aapka match dhundh rahe hain. Match na mila to Rs 500 poore wapas. Status dekhne ke liye neeche button dabaye.' },
  booking_received_guaranteed: { category: 'UTILITY', language: 'en', body: 'Hi {{1}}, aapki MarutiCab booking mil gayi. {{2}} se {{3}}, {{4}} ko {{5}} baje. Advance Rs {{6}} mila. Driver ki details ride se pehle bhej di jayengi.' },
  match_confirmed_customer: { category: 'UTILITY', language: 'en', body: 'Good news {{1}}! Aapki ride confirm ho gayi. {{2}} se {{3}}, {{4}} ko {{5}} baje. Driver: {{6}}, Gaadi: {{7}}, Phone: {{8}}. Baaki Rs {{9}} gaadi mein dena hai.' },
  match_confirmed_driver: { category: 'UTILITY', language: 'en', body: 'Nayi ride: {{1}}, {{2}} baje. Pickup: {{3}} ({{4}}). Customer: {{5}}, {{6}}. Passengers: {{7}}. Customer se Rs {{8}} lena hai.' },
  no_match_options: { category: 'UTILITY', language: 'en', body: 'Hi {{1}}, afsos hai ki {{2}} ko {{3}} baje ki aapki Match Deal ke liye abhi koi match nahi mila. Aap kya karna chahenge? Rs 500 refund, ya Rs {{4}} mein pakki private ride (upgrade).' },
  refund_processed: { category: 'UTILITY', language: 'en', body: 'Hi {{1}}, aapke Rs {{2}} refund kar diye gaye hain. Original payment method mein 5-7 working days mein aa jayenge. Dobara booking ke liye maruticab.in par aayein.' },
  ride_reminder_customer: { category: 'UTILITY', language: 'en', body: 'Reminder: aapki MarutiCab ride aaj {{1}} baje hai. Pickup: {{2}}. Driver {{3}} ({{4}}) aapko 30 minute pehle call karenge.' },
  ride_reminder_driver: { category: 'UTILITY', language: 'en', body: 'Reminder: {{1}} baje pickup, {{2}}. Customer {{3}} ({{4}}).' },
  feedback_request: { category: 'UTILITY', language: 'en', body: 'Hi {{1}}, MarutiCab mein safar karne ke liye dhanyavad! Aapka anubhav kaisa raha? Review dene ke liye neeche button dabaye, aur dost ko refer karein.' },
  admin_alert: { category: 'UTILITY', language: 'en', body: 'MarutiCab alert: {{1}}. Booking {{2}}, {{3}} on {{4}} at {{5}}.' },
} as const

export type BuiltInTemplate = keyof typeof WHATSAPP_TEMPLATES

export function getTemplateName(event: WhatsAppEvent, mode: unknown, recipient: 'customer' | 'driver' | 'admin' = 'customer'): BuiltInTemplate {
  if (recipient === 'admin') return 'admin_alert'
  if (event === 'payment_captured') return mode === 'match' ? 'booking_received_match' : 'booking_received_guaranteed'
  if (event === 'match_confirmed') return recipient === 'driver' ? 'match_confirmed_driver' : 'match_confirmed_customer'
  if (event === 'no_match') return 'no_match_options'
  if (event === 'refund_processed') return 'refund_processed'
  if (event === 'ride_reminder') return recipient === 'driver' ? 'ride_reminder_driver' : 'ride_reminder_customer'
  if (event === 'feedback_request') return 'feedback_request'
  return 'admin_alert'
}

const routeLabel = (direction: unknown) => direction === 'KI' || direction === 'K2I' ? 'Khargone' : 'Indore'
const destinationLabel = (direction: unknown) => direction === 'KI' || direction === 'K2I' ? 'Indore' : 'Khargone'
const money = (value: unknown) => String(Math.max(0, Math.round(Number(value) || 0)))

export function mapTemplateVariables(template: BuiltInTemplate, booking: Record<string, any>, driver: Record<string, any> | null = null): string[] {
  const from = routeLabel(booking.direction)
  const to = destinationLabel(booking.direction)
  const date = String(booking.travel_date || '')
  const time = String(booking.pickup_time || '').slice(0, 5)
  const name = String(booking.passenger_name || 'Customer')
  const pickup = String(booking.address || booking.drop_name || booking.drop_point || 'Pickup point')
  const driverName = String(driver?.name || booking.driver_name || 'MarutiCab driver')
  const driverPhone = String(driver?.phone || booking.driver_phone || '')
  const vehicle = String(driver?.vehicle || booking.vehicle || 'Sedan (Dzire/Amaze)')
  const advance = money(booking.advance_amount ?? 500)
  const fare = money(booking.fare_quoted || booking.total_fare || (booking.direction === 'KI' || booking.direction === 'K2I' ? 2200 : 1800))
  const balance = money(Number(fare) - Number(advance))

  switch (template) {
    case 'booking_received_match':
      return [name, from, to, date, time, advance]
    case 'booking_received_guaranteed':
      return [name, from, to, date, time, advance]
    case 'match_confirmed_customer':
      return [name, from, to, date, time, driverName, vehicle, driverPhone, balance]
    case 'match_confirmed_driver':
      return [date, time, from, pickup, name, String(booking.phone || ''), String(booking.passengers || 1), balance]
    case 'no_match_options':
      return [name, date, time, fare]
    case 'refund_processed':
      return [name, advance]
    case 'ride_reminder_customer':
      return [time, pickup, driverName, driverPhone]
    case 'ride_reminder_driver':
      return [time, pickup, name, String(booking.phone || '')]
    case 'feedback_request':
      return [name]
    case 'admin_alert':
      return [String(booking.alert || 'System notification'), String(booking.id || ''), `${from} to ${to}`, date, time]
    default:
      return []
  }
}

