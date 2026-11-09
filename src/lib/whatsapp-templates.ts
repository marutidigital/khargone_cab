// src/lib/whatsapp-templates.ts
// Handles formatting, database lookup, and dispatching for the 5 WhatsApp Utility Templates

import { createServiceClient } from '@/lib/supabase-server'
import { sendText, sendTemplate } from '@/lib/whatsapp'

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
    header_text: '🚕 Booking Mil Gayi Hai!',
    body_text: `Hey {{1}}! 👋

Maruti Cab choose karne ke liye shukriya! ❤️
Aapki travel booking request hume mil gayi hai.

🧾 *Booking ID:* {{2}}
📍 *Route:* {{3}}
📅 *Date:* {{4}}
⏰ *Pickup Time:* {{5}}

⏳ *Agla Step (Return Match):*
Hum aapke safar ke liye suitable opposite return ride match kar rahe hain. 🚕💨

Jaise hi gaadi aur driver confirm honge, hum turant aapko message bhejenge. Agar cutoff time tak match nahi mila, to aapka poora advance refund ho jayega. Don't worry! 😊`,
    footer_text: 'Maruti Cab · Safe & Affordable 🚕',
    variables: ['customer_name', 'booking_id', 'route', 'travel_date', 'departure_time'],
  },
  payment_received: {
    template_code: 'payment_received',
    meta_template_name: 'payment_received',
    header_text: '🎉 Advance Payment Confirmed!',
    body_text: `Hey {{1}}! 👋

Aapka advance payment successfully mil gaya hai! 🥳

💰 *Amount Paid:* ₹{{2}}
🧾 *Booking ID:* {{3}}
🔖 *Payment Ref:* {{4}}
📍 *Route:* {{5}}
📅 *Travel Date:* {{6}}

Aapki booking safe hai! Hum ab opposite-direction return ride match confirm kar rahe hain.

Jaise hi match confirm hoga, aapko cab aur driver ki updates mil jayengi. Thank you for trusting Maruti Cab! ❤️`,
    footer_text: 'Khargone ↔ Indore Private Cabs 🚕',
    variables: ['customer_name', 'amount_paid', 'booking_id', 'payment_reference', 'route', 'travel_date'],
  },
  cab_confirmed: {
    template_code: 'cab_confirmed',
    meta_template_name: 'cab_confirmed',
    header_text: '🚕 Super News! Cab Confirm Ho Gayi!',
    body_text: `Hey {{1}}! 🥳

Great news! Aapke trip ke liye return ride match mil gaya hai aur aapki cab officially confirm ho gayi hai! 🎉💨

🧾 *Booking ID:* {{2}}
📍 *Route:* {{3}}
📅 *Travel Date:* {{4}}
⏰ *Pickup Time:* {{5}}

💰 *Fare Details:*
• Total Fare: ₹{{6}}
• Advance Paid: ₹{{7}}
• Baaki Driver ko dena hai: ₹{{8}}

🚗 *Driver & Cab Details:*
Hum aapko driver ka naam, mobile number aur gaadi number trip se pehle WhatsApp par share kar denge.

Kripya pickup time par ready rahein. Shubh yatra! ❤️`,
    footer_text: '24x7 Helpline: +91 72823 16090',
    variables: [
      'customer_name',
      'booking_id',
      'route',
      'travel_date',
      'pickup_time',
      'total_fare',
      'advance_paid',
      'balance_fare',
    ],
  },
  refund_initiated: {
    template_code: 'refund_initiated',
    meta_template_name: 'refund_initiated',
    header_text: '💰 Advance Refund Initiated!',
    body_text: `Hey {{1}}! 👋

Afsos hai ki is baar aapke schedule ke mutabiq return ride match nahi mil paya.

Aapka poora advance payment bina kisi deduction ke refund kar diya gaya hai! 💸

🧾 *Booking ID:* {{2}}
💰 *Refund Amount:* ₹{{3}}
🔖 *Refund Reference:* {{4}}

Ye amount aapke original payment source (UPI/Bank/Card) me jaldi hi credit ho jayega.

Aapko huye asuvidha ke liye hum maafi chahte hain. Umeed hai agli baar aapke saath safar hoga! ❤️`,
    footer_text: 'Maruti Cab · 100% Refund Guarantee 🛡️',
    variables: ['customer_name', 'booking_id', 'refund_amount', 'refund_reference'],
  },
  travel_reminder: {
    template_code: 'travel_reminder',
    meta_template_name: 'travel_reminder',
    header_text: '⏰ Ready For Your Trip?',
    body_text: `Hey {{1}}! 🧳

Bas ek friendly reminder ki aapki Maruti Cab ride aane wali hai! 🚕💨

🧾 *Booking ID:* {{2}}
📍 *Route:* {{3}}
⏰ *Pickup Time:* {{4}}
📌 *Pickup Point:* {{5}}

Driver bhaiya aapse pickup se lagbhag 30 minute pehle call par connect kar lenge. Kripya time par ready rahein. Have a safe & pleasant journey! 😊`,
    footer_text: 'Travel Safe, Travel Happy · Maruti Cab ❤️',
    variables: ['customer_name', 'booking_id', 'route', 'pickup_time', 'pickup_location'],
  },
  driver_car_details: {
    template_code: 'driver_car_details',
    meta_template_name: 'driver_car_details',
    header_text: '🚘 Aapki Cab & Driver Ki Details!',
    body_text: `Hey {{1}}! 👋

Aapke safar ke liye aapki dedicated sedan cab aur driver assign ho chuke hain! 🚕✨

👤 *Driver Name:* {{2}}
📞 *Driver Mobile:* {{3}}
🚘 *Car Model:* {{4}}
🔢 *Vehicle Number:* {{5}}

📍 *Trip Details:*
• Route: {{6}}
• Date: {{7}} at {{8}}
• Pickup Point: {{9}}

💵 *Balance Fare to Driver:* ₹{{10}} (Gaadi me cash ya UPI se pay karein)

Driver bhaiya pickup se 30 minute pehle aapse call par connect kar lenge. Shubh Yatra! ❤️`,
    footer_text: 'Support: +91 72823 16090 · MarutiCab 🚕',
    variables: ['customer_name', 'driver_name', 'driver_phone', 'car_model', 'vehicle_number', 'route', 'travel_date', 'pickup_time', 'pickup_point', 'balance_amount'],
  },
  ride_completed_feedback: {
    template_code: 'ride_completed_feedback',
    meta_template_name: 'ride_completed_feedback',
    header_text: '⭐ Trip Complete! Kaisa Raha Safar?',
    body_text: `Namaste {{1}}! 🙏

Aapka {{2}} ka safar complete ho gaya hai. MarutiCab choose karne ke liye dil se shukriya! ❤️

Driver bhaiya ({{3}}) aur gadi ki cleanliness aapko kaisi lagi? 

Aapka 1 minute ka feedback hamare liye bohot keemti hai. Kripya apna experience zaroor share karein! ⭐⭐⭐⭐⭐`,
    footer_text: 'MarutiCab · Safe & Comfortable Travels 🚕',
    variables: ['customer_name', 'route', 'driver_name'],
  },
  admin_new_booking: {
    template_code: 'admin_new_booking',
    meta_template_name: 'admin_new_booking',
    header_text: '🚨 Nayi Booking Aayi Hai!',
    body_text: `Namaste Admin ji! 🚕

Website par ek nayi private cab booking request aayi hai:

🧾 Booking Ref: #{{1}}
👤 Passenger: {{2}} (📞 {{3}})
📍 Route: {{4}}
📅 Date: {{5}}
⏰ Pickup Time: {{6}}
💳 Online Advance: ₹{{7}}
💵 Balance to Collect: ₹{{8}}

⏳ Status: Waiting for opposite return ride match. Jaise hi return ride aayegi, system match try karega.`,
    footer_text: 'MarutiCab Dispatch Operations 🛡️',
    variables: ['booking_ref', 'passenger_name', 'phone', 'route', 'travel_date', 'pickup_time', 'advance_paid', 'balance_amount'],
  },
  admin_round_match_action: {
    template_code: 'admin_round_match_action',
    meta_template_name: 'admin_round_match_action',
    header_text: '🎉 Round Booking Confirm! Driver Jodein',
    body_text: `🚨 ACTION REQUIRED: ROUND MATCH CONFIRMED! 🚕💨

Aapka ek return round complete pair lock ho gaya hai:

🔁 Pair Details:
• Leg 1: #{{1}} ({{2}} ko {{3}})
• Leg 2: #{{4}} ({{5}} ko {{6}})

⚠️ IMPORTANT: You need to connect new car and driver details in this confirmed round booking now!

Kripya admin portal open karein aur turant driver aur gaadi assign karein taaki dono customers ko driver details bheji ja sakein.`,
    footer_text: 'MarutiCab Admin Desk · Priority 1 🚨',
    variables: ['out_ref', 'out_route', 'out_time', 'back_ref', 'back_route', 'back_time'],
  },
  admin_driver_reminder: {
    template_code: 'admin_driver_reminder',
    meta_template_name: 'admin_driver_reminder',
    header_text: '⏰ Reminder: Driver & Car Pending!',
    body_text: `Attention Admin ji! ⚠️

Neeche di gayi confirmed booking ke liye abhi tak driver aur cab assign nahi hui hai:

🧾 Booking Ref: #{{1}}
👤 Passenger: {{2}} (📞 {{3}})
📍 Route: {{4}}
⏰ Departure Time: {{5}} (Sirf {{6}} ghante bache hain!)

🚨 Driver Reminder: Kripya turant driver ka naam, mobile number aur car model update karein taaki passenger ko trip se pehle dispatch message mil sake.`,
    footer_text: 'MarutiCab Fleet Management 🚘',
    variables: ['booking_ref', 'passenger_name', 'phone', 'route', 'departure_time', 'hours_left'],
  },
  admin_cancel_alert: {
    template_code: 'admin_cancel_alert',
    meta_template_name: 'admin_cancel_alert',
    header_text: '⚠️ Booking Cancelled / Auto-Refund',
    body_text: `Admin Alert: Booking Cancelled! ℹ️

Ek booking cancel/close ho gayi hai:

🧾 Booking Ref: #{{1}}
👤 Customer: {{2}} (📞 {{3}})
📍 Route: {{4}} on {{5}}
Reason: {{6}}

💰 Refund Status: ₹{{7}} auto-refund initiate kar diya gaya hai. Razorpay portal me check kar lein.`,
    footer_text: 'MarutiCab Accounts & Safety 🛡️',
    variables: ['booking_ref', 'customer_name', 'phone', 'route', 'travel_date', 'reason', 'refund_amount'],
  },
  admin_client_issue: {
    template_code: 'admin_client_issue',
    meta_template_name: 'admin_client_issue',
    header_text: '🆘 Client Issue / Support Needed!',
    body_text: `Admin Attention: Client Support Request! 📞

Customer ko trip ke regarding help chahiye:

👤 Customer: {{1}}
📞 Mobile: {{2}}
🧾 Booking Ref: #{{3}}
💬 Issue / Message: "{{4}}"

Kripya client se turant connect karein aur unka issue solve karein!`,
    footer_text: 'MarutiCab Customer First ❤️',
    variables: ['customer_name', 'phone', 'booking_ref', 'message_text'],
  },
  provider_availability_request: {
    template_code: 'provider_availability_request',
    meta_template_name: 'provider_availability_request',
    header_text: '🚕 MarutiCab Round Trip Duty',
    body_text: `Namaste {{1}} ji! MarutiCab ke liye Khargone ⇄ Indore round trip duty available hai.

Date: {{2}}
Leg 1: {{3}} (Pickup {{4}})
Leg 2: {{5}} (Pickup {{6}})

Kya aapki gaadi chalegi? Kripya agle 1 ghante me Yes ya No batayein:`,
    footer_text: 'MarutiCab Dispatch Operations 🚖',
    variables: ['provider_name', 'travel_date', 'leg1_route', 'leg1_pickup', 'leg2_route', 'leg2_pickup'],
  },
  provider_car_driver_details: {
    template_code: 'provider_car_driver_details',
    meta_template_name: 'provider_car_driver_details',
    header_text: '🚘 Gaadi & Driver Details',
    body_text: `Dhanyavad {{1}} ji! Khargone ⇄ Indore trip confirm karne ke liye kripya Driver Name, Mobile Number, Car Model aur Vehicle Number enter karein.`,
    footer_text: 'MarutiCab Dispatch Desk 🚕',
    variables: ['provider_name'],
  },
  provider_details_reminder: {
    template_code: 'provider_details_reminder',
    meta_template_name: 'provider_details_reminder',
    header_text: '⏰ Driver Details Reminder',
    body_text: `Namaste {{1}} ji, aapne Khargone ⇄ Indore trip confirm kiya tha. Kripya driver aur gaadi ki details jaldi share karein taaki booking lock ho sake.`,
    footer_text: 'MarutiCab Fleet Management',
    variables: ['provider_name'],
  },
  provider_trip_completed_thanks: {
    template_code: 'provider_trip_completed_thanks',
    meta_template_name: 'provider_trip_completed_thanks',
    header_text: '🎉 Round Trip Complete!',
    body_text: `MarutiCab: Dono rides successfully complete ho gayi hain. Aapke sahyog ke liye dhanyavad! Agli booking par hum aapse WhatsApp par connect karenge.`,
    footer_text: 'MarutiCab Partner Network ❤️',
    variables: [],
  },
  customer_feedback_buttons: {
    template_code: 'customer_feedback_buttons',
    meta_template_name: 'customer_feedback_buttons',
    header_text: '⭐ Kaisa Raha Safar?',
    body_text: `Namaste {{1}}! Aapka {{2}} ka safar complete ho gaya hai. Driver bhaiya ({{3}}) aur safar ka anubhav kaisa raha? Kripya rating dein:`,
    footer_text: 'MarutiCab · Safe & Comfortable Travels 🚕',
    variables: ['customer_name', 'route', 'driver_name'],
  },
  customer_cancellation_confirmed: {
    template_code: 'customer_cancellation_confirmed',
    meta_template_name: 'customer_cancellation_confirmed',
    header_text: '✅ Booking Cancelled',
    body_text: `Namaste {{1}}, aapki booking #{{2}} cancel ho gayi hai. Advance ₹{{3}} bina kisi deduction ke aapke account me 5-7 din me credit ho jayega.`,
    footer_text: 'MarutiCab 100% Refund Guarantee 🛡️',
    variables: ['customer_name', 'booking_ref', 'refund_amount'],
  },
  customer_partner_cancelled_rematch: {
    template_code: 'customer_partner_cancelled_rematch',
    meta_template_name: 'customer_partner_cancelled_rematch',
    header_text: '⚠️ Re-Matching Alert',
    body_text: `Namaste {{1}}, aapki booking #{{2}} ke opposite return passenger ne cancel kiya hai. Hum turant aapke liye doosra match dhoondh rahe hain. Aapki ride priority par hai.`,
    footer_text: 'MarutiCab Support: +91 72823 16090',
    variables: ['customer_name', 'booking_ref'],
  },
  customer_booking_abandoned_retry: {
    template_code: 'customer_booking_abandoned_retry',
    meta_template_name: 'customer_booking_abandoned_retry',
    header_text: '🚖 Complete Your Booking',
    body_text: `Namaste {{1}}, aapki {{2}} ki cab booking adhuri reh gayi hai. Apni seat confirm karne ke liye yahan se ₹500 advance pay karein: {{3}}`,
    footer_text: 'MarutiCab · Fixed Fares AC Sedans 🚕',
    variables: ['customer_name', 'route', 'payment_link'],
  },
  driver_payment_received_prompt: {
    template_code: 'driver_payment_received_prompt',
    meta_template_name: 'driver_payment_received_prompt',
    header_text: '💰 Payment Mila?',
    body_text: `Trip drop complete! Kya aapko customer se cash/UPI balance amount ₹{{1}} receive ho gaya hai?`,
    footer_text: 'MarutiCab Duty Dispatch',
    variables: ['balance_amount'],
  },
  admin_closing_commission_summary: {
    template_code: 'admin_closing_commission_summary',
    meta_template_name: 'admin_closing_commission_summary',
    header_text: '📊 Round Trip Closed',
    body_text: `📊 Round Trip Settlement Summary: Match #{{1}}
Total Fares: ₹4,000 (Advance: ₹1,000, Driver Collected: ₹3,000)
Provider Payout: ₹{{2}}
MarutiCab Net Commission: ₹{{3}}
Status: Successfully Closed 🎉`,
    footer_text: 'MarutiCab Accounts Desk 💰',
    variables: ['match_ref', 'provider_payout', 'commission_amount'],
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
  templateCode:
    | 'booking_received'
    | 'payment_received'
    | 'cab_confirmed'
    | 'driver_car_details'
    | 'travel_reminder'
    | 'ride_completed_feedback'
    | 'refund_initiated'
    | 'admin_new_booking'
    | 'admin_round_match_action'
    | 'admin_driver_reminder'
    | 'admin_cancel_alert'
    | 'admin_client_issue'
    | (string & {})
  variables: string[]
  bookingId?: string
  customerId?: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const db = createServiceClient()
  const { toPhone, templateCode, variables, bookingId } = params

  try {
    // 1. Fetch dynamic template metadata from database or fall back to definitions
    const { data: dbTemplate } = await db
      .from('whatsapp_message_templates')
      .select('*')
      .eq('template_code', templateCode)
      .eq('active', true)
      .limit(1)
      .single()

    const metaTemplateName =
      dbTemplate?.meta_template_name ||
      TEMPLATE_DEFINITIONS[templateCode]?.meta_template_name ||
      templateCode

    const templateLanguage = dbTemplate?.language || 'en'

    // 2. Dispatch via genuine Meta WhatsApp Template API (required for outside 24-hr customer service window)
    const sendResult = (await sendTemplate({
      to: toPhone,
      template: metaTemplateName,
      language: templateLanguage,
      variables: variables.map((v) => String(v ?? '')),
    })) as any

    const msgId = sendResult?.messages?.[0]?.id || sendResult?.id || null

    // 3. Log success into notifications table
    const recipientType = templateCode.startsWith('admin_') ? 'admin' : 'customer'
    await db.from('notifications').insert({
      booking_id: bookingId || null,
      template: metaTemplateName,
      recipient: toPhone,
      status: msgId ? 'sent' : 'failed',
      wa_message_id: msgId,
      provider_message_id: msgId,
      sent_at: new Date().toISOString(),
      recipient_type: recipientType,
      event_version: `tpl:${templateCode}`,
    })

    return { success: true, messageId: msgId || undefined }
  } catch (err: any) {
    console.error(`Error sending Meta WhatsApp template ${templateCode}:`, err)

    // Log failure with error reason into notifications table
    const recipientType = templateCode.startsWith('admin_') ? 'admin' : 'customer'
    await db.from('notifications').insert({
      booking_id: bookingId || null,
      template: templateCode,
      recipient: toPhone,
      status: 'failed',
      error: err?.message || 'Failed to dispatch WhatsApp template.',
      sent_at: new Date().toISOString(),
      recipient_type: recipientType,
      event_version: `tpl:${templateCode}`,
    }).catch(() => {})

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

