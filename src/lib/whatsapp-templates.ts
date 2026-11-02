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

export function mapTemplateVariables(template: BuiltInTemplate, booking: Record<string, any>, driver: Record<string, any> | null = null) {
  const from = routeLabel(booking.direction)
  const to = destinationLabel(booking.direction)
  const date = String(booking.travel_date || '')
  const time = String(booking.pickup_time || '').slice(0, 5)
  const name = String(booking.passenger_name || 'Customer')
  const pickup = String(booking.address || booking.drop_name || booking.drop_point || 'Pickup point')
  const driverName = String(driver?.name || booking.driver_name || 'MarutiCab driver')
  const driverPhone = String(driver?.phone || booking.driver_phone || '')
  const car = String(driver?.vehicle_number || booking.vehicle_number || 'MarutiCab sedan')
  switch (template) {
    case 'booking_received_match':
    case 'booking_received_guaranteed':
      return [name, from, to, date, time, money(booking.advance_amount)]
    case 'match_confirmed_customer':
      return [name, from, to, date, time, driverName, car, driverPhone, money(booking.balance_amount)]
    case 'match_confirmed_driver':
      return [`${from} to ${to}`, time, pickup, date, name, String(booking.phone || ''), String(booking.passenger_count || booking.passengers || 1), money(booking.balance_amount)]
    case 'no_match_options':
      return [name, date, time, money(booking.guaranteed_total_fare || calculateBookingFare({ mode: 'guaranteed', point: booking.drop_point as DropPointId, pickupTime: time }).totalFare)]
    case 'refund_processed':
      return [name, money(booking.advance_amount || booking.refund_amount || 500)]
    case 'ride_reminder_customer':
      return [time, pickup, driverName, driverPhone]
    case 'ride_reminder_driver':
      return [time, pickup, name, String(booking.phone || '')]
    case 'feedback_request':
      return [name]
    case 'admin_alert':
      return [String(booking.alert_event || 'Booking needs attention'), String(booking.booking_ref || booking.id || ''), `${from} to ${to}`, date, time]
  }
}
import { calculateBookingFare, type DropPointId } from '@/lib/config'

