// src/lib/whatsapp-ai-assistant.ts
// Intelligent WhatsApp Conversational AI Assistant for MarutiCab
// Powered by OpenAI (gpt-4o-mini) + Interactive WhatsApp Buttons & Templates

import { createChatCompletion, type OpenAIMessage } from '@/lib/openai'
import { evaluateBookingLeadTime, formatInKolkata } from '@/lib/booking-rules'
import { createServiceClient } from '@/lib/supabase-server'
import { sendInChatPaymentOrder, sendInteractiveButtons, sendText } from '@/lib/whatsapp'
import { sendWhatsAppTemplateMessage } from '@/lib/whatsapp-templates'
import { getConversation, saveConversation, type ConversationState } from '@/lib/whatsapp-conversation'
import { randomBytes } from 'node:crypto'

export interface WhatsAppButton {
  id: string
  title: string
}

export interface AIChatbotOutput {
  replyText: string
  buttons?: WhatsAppButton[]
  templateCode?: string
  templateVariables?: string[]
  paymentOrder?: {
    amountInRs: number
    bookingRef: string
    bookingId: string
    customerName: string
    routeName: string
    travelDate: string
    pickupTime: string
  }
}

const FARES = {
  KI: { name: 'Khargone ➔ Indore', fare: 2200, advance: 500, balance: 1700 },
  IK: { name: 'Indore ➔ Khargone', fare: 1800, advance: 500, balance: 1300 },
}

/**
 * Helper to dispatch any official Meta WhatsApp Template
 */
export async function dispatchRequestedTemplate(
  templateCode: string,
  phone: string,
  booking?: any,
  issueText?: string
): Promise<{ success: boolean; variables: string[] }> {
  const db = createServiceClient()
  const cleanPhone = phone.replace(/\D/g, '').slice(-10)

  let targetBooking = booking
  if (!targetBooking) {
    const { data: bList } = await db
      .from('bookings')
      .select('*')
      .eq('phone', cleanPhone)
      .order('created_at', { ascending: false })
      .limit(1)
    targetBooking = bList?.[0] || null
  }

  const custName = String(targetBooking?.passenger_name || 'Passenger').trim()
  const bookingRef = String(targetBooking?.booking_ref || 'KC00000')
  const isKI = targetBooking?.direction === 'KI'
  const routeLabel = isKI ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'
  const travelDate = String(targetBooking?.travel_date || new Date().toISOString().slice(0, 10))
  const pickupTime = String(targetBooking?.pickup_time || '09:00').slice(0, 5)
  const totalFare = String(targetBooking?.total_fare || (isKI ? 2200 : 1800))
  const advancePaid = String(targetBooking?.advance_paid || targetBooking?.advance_amount || 500)
  const balanceFare = String(targetBooking?.balance_amount || (isKI ? 1700 : 1300))

  let variables: string[] = []
  let recipientPhone = cleanPhone

  switch (templateCode) {
    case 'booking_received':
      variables = [custName, bookingRef, routeLabel, travelDate, pickupTime]
      break
    case 'payment_received':
      variables = [
        custName,
        advancePaid,
        bookingRef,
        targetBooking?.extras?.razorpay_payment_id || `PAY_${bookingRef}`,
        routeLabel,
        travelDate,
      ]
      break
    case 'cab_confirmed':
      variables = [
        custName,
        bookingRef,
        routeLabel,
        travelDate,
        pickupTime,
        totalFare,
        advancePaid,
        balanceFare,
      ]
      break
    case 'driver_car_details':
      variables = [
        custName,
        targetBooking?.driver_name || 'Assigned Driver',
        targetBooking?.driver_phone || '+91 72823 16090',
        targetBooking?.vehicle_model || 'Swift Dzire AC',
        targetBooking?.vehicle_number || 'MP09 CAB',
        routeLabel,
        travelDate,
        pickupTime,
        targetBooking?.address || 'Pickup Point',
        balanceFare,
      ]
      break
    case 'travel_reminder':
      variables = [custName, bookingRef, routeLabel, pickupTime, targetBooking?.address || 'Pickup Point']
      break
    case 'refund_initiated':
      variables = [
        custName,
        bookingRef,
        advancePaid,
        `REF_${bookingRef}`,
      ]
      break
    case 'ride_completed_feedback':
      variables = [custName, routeLabel, targetBooking?.driver_name || 'Driver Bhaiya']
      break
    case 'admin_client_issue':
      recipientPhone = process.env.ADMIN_WHATSAPP_NUMBER || '918878933778'
      variables = [custName, cleanPhone, bookingRef, (issueText || 'Customer support escalation').slice(0, 200)]
      break
    default:
      variables = [custName, bookingRef, routeLabel]
  }

  try {
    const res = await sendWhatsAppTemplateMessage({
      toPhone: recipientPhone,
      templateCode: templateCode as any,
      variables,
      bookingId: targetBooking?.id,
    })
    return { success: res.success, variables }
  } catch (err) {
    console.warn(`[dispatchRequestedTemplate] ${templateCode} notice:`, err)
    return { success: false, variables }
  }
}

/**
 * System prompt teaching the AI who MarutiCab is and what we do in Hinglish
 */
function getSystemPrompt(todayIST: string, timeIST: string): string {
  return `You are "MarutiCab Sahayak", the official AI Assistant for MarutiCab operating dedicated private intercity AC cabs between Khargone and Indore (Madhya Pradesh).

TODAY'S DATE & TIME IN INDIA (IST):
Date: ${todayIST}
Time: ${timeIST}

WHO WE ARE & WHAT WE DO:
- MarutiCab provides 100% dedicated private AC sedan cabs (Swift Dzire, Hyundai Aura, Tata Tigor, Toyota Etios) between Khargone and Indore.
- NO STRANGERS / NO SHARING: The entire car is exclusively for the customer and their family/group (up to 4 passengers).
- ALL INCLUSIVE: All Toll Taxes, Fuel, Driver Allowance, and AC are 100% included in the fixed fare. No hidden or extra charges.
- FIXED ROUTE FARES:
  1. Khargone ➔ Indore: Fixed ₹2,200 (Advance: ₹500 online, Balance: ₹1,700 to driver in cab).
  2. Indore ➔ Khargone: Fixed ₹1,800 (Advance: ₹500 online, Balance: ₹1,300 to driver in cab).
- ADVANCE PAYMENT & POLICY:
  * An advance payment of ₹500 is required to confirm and reserve the private cab.
  * Test coupon codes: "MARUTI2" or "CAB2" (reduces advance to ₹2 for testing).
  * Remaining balance is paid directly to the driver in the cab by Cash or UPI.
- MATCH DEAL & 100% REFUND GUARANTEE:
  * We pair opposite-direction passengers to offer a private cab at half the round-trip price.
  * 100% Refund Guarantee: If an opposite match is not found before the cutoff deadline, 100% of the ₹500 advance is automatically refunded to the customer's original payment method without any cancellation fee.
  * Confirmed One-Way option is also available if the customer needs an instantly confirmed cab.
- PICKUP & DROP LOCATIONS:
  * Khargone: Doorstep pickup anywhere in Khargone city, Bus Stand, Collectorate, etc.
  * Indore: Rajendra Nagar, Bhawarkua, Railway Station, Indore Airport, Rajwada, Palasia, Vijay Nagar, etc.
- DRIVER & CAB DETAILS:
  * Driver name, phone number, vehicle model, and car number are dispatched via WhatsApp 2–3 hours before pickup time.
  * Driver calls the passenger 30 minutes before arrival.
- CANCELLATION:
  * Unmatched bookings get 100% auto-refund.
  * Once a driver is assigned and trip confirmed, cancellation is restricted as the dedicated cab is locked.
- CONTACT & SUPPORT:
  * 24x7 Helpline: +91 72823 16090
  * Website: https://maruticab.in
  * Office: Bus Stand, Khargone (M.P.)

COMMUNICATION STYLE (STRICT RULES):
1. ALWAYS talk in friendly, respectful, natural, polite HINGLISH (Hindi written in Roman English alphabet).
2. Never speak pure English or formal pure Devanagari Hindi. Use natural spoken conversational tone: "Namaste ji!", "Bohot badhiya!", "Kripya batayein", "Aapka safar shubh rahe", etc.
3. Be concise and crisp (WhatsApp messages should be easy to read with emojis and bullet points).
4. Extract any mentioned booking details: direction, date, time, pickup, drop, passenger count, customer name, coupon.
5. If the user asks a question (fares, luggage, safety, route), answer accurately and guide them to book.

OFFICIAL WHATSAPP TEMPLATES (YOU HAVE FULL POWER TO TRIGGER THESE):
You can trigger any official Meta template when relevant by setting "trigger_template":
1. "booking_received": Trigger when user reserves/creates a booking or asks for booking details card.
2. "payment_received": Trigger when user asks for advance payment receipt / confirmation.
3. "cab_confirmed": Trigger when cab is confirmed/matched and user asks for confirmation ticket.
4. "driver_car_details": Trigger when user asks for driver name, phone, car number or vehicle details.
5. "travel_reminder": Trigger when user requests a departure reminder or journey schedule.
6. "refund_initiated": Trigger when user asks about their refund status or requests refund confirmation.
7. "ride_completed_feedback": Trigger when a trip is completed and requesting rating/review.
8. "admin_client_issue": Trigger when user reports a complaint, driver issue, emergency, or needs urgent human callback.

OUTPUT FORMAT:
You MUST respond with a valid JSON object strictly matching this schema:
{
  "response_text": "Your helpful, friendly reply in Hinglish to the user",
  "intent": "book_cab" | "check_fares" | "track_booking" | "cancel_booking" | "apply_coupon" | "ask_faq" | "request_template" | "report_issue" | "greeting" | "general",
  "extracted_data": {
    "direction": "KI" | "IK" | null,
    "travel_date": "YYYY-MM-DD" | null,
    "pickup_time": "HH:MM" (24-hour format) | null,
    "pickup_address": string | null,
    "drop_address": string | null,
    "passenger_count": number (1 to 4) | null,
    "customer_name": string | null,
    "coupon_code": string | null
  },
  "trigger_template": "booking_received" | "payment_received" | "cab_confirmed" | "driver_car_details" | "travel_reminder" | "refund_initiated" | "ride_completed_feedback" | "admin_client_issue" | null,
  "recommended_buttons": [
    { "id": "BTN_...", "title": "Button Title (Max 20 chars)" }
  ] (max 3 buttons)
}
Do NOT include markdown code blocks or backticks. Return raw JSON only.`
}

/**
 * Helper to get current Indian IST Date & Time
 */
function getIndianDateTime() {
  const now = new Date()
  const dateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now)
  const timeIST = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(now)
  return { dateIST, timeIST }
}

/**
 * Normalizes button clicks or text commands into booking intent
 */
export async function handleWhatsAppAIConversation(
  fromPhone: string,
  userMessage: string,
  senderName?: string
): Promise<AIChatbotOutput> {
  const cleanPhone = fromPhone.replace(/\D/g, '').slice(-10)
  const text = userMessage.trim()
  const upper = text.toUpperCase()
  const conv = await getConversation(cleanPhone)
  const db = createServiceClient()
  const { dateIST, timeIST } = getIndianDateTime()

  // ── 1. PRE-CHECK BUTTON CLICKS OR FAST COMMANDS ──

  // Welcome Greetings (Exact Spec Response)
  const isGreeting = [
    'HI', 'HEY', 'HELLO', 'NAMASTE', 'START', 'MENU', 'HELP',
    'RAM RAM', 'GOOD MORNING', 'KHARGONE CAB', 'MARUTICAB'
  ].includes(upper)

  if (isGreeting) {
    return {
      replyText: `Namaste! 🙏 Welcome to MarutiCab 🚕\n\nKhargone ↔ Indore ki comfortable Private Sedan Cab Service.\n\nAapki journey ko easy aur affordable banana hamara goal hai.\n\nAapko kis cheez mein help chahiye?\n\n────────────────\n*MarutiCab | 24×7 Support: +91 72823 16090*`,
      buttons: [
        { id: 'BTN_BOOK_CAB', title: '🚕 Book a Cab' },
        { id: 'BTN_MY_BOOKING', title: '📊 My Booking' },
        { id: 'BTN_SUPPORT', title: '📞 Talk to Support' },
      ],
    }
  }

  // Button: Book a Cab
  if (
    upper === 'BTN_BOOK_CAB' ||
    upper === 'BOOK A CAB' ||
    upper === 'BOOK CAB' ||
    upper === 'NAYI CAB BOOKING' ||
    upper === 'CAB BOOK KARNI HAI'
  ) {
    conv.state = 'SELECT_ROUTE'
    conv.step = 1
    await saveConversation(conv)

    return {
      replyText: `Aap kahan jaana chahte hain? 🚕\n\n1️⃣ *Khargone ➔ Indore*: Fixed ₹2,200\n2️⃣ *Indore ➔ Khargone*: Fixed ₹1,800\n\n✨ *Included in Every Ride:*\n• Dedicated Private Sedan (Swift Dzire / Aura)\n• No strangers / No sharing (Max 4 passengers)\n• All Toll Taxes, Fuel & AC 100% Included\n• Doorstep pickup & city point drop`,
      buttons: [
        { id: 'BTN_ROUTE_KI', title: '🚕 Khargone ➔ Indore' },
        { id: 'BTN_ROUTE_IK', title: '🚖 Indore ➔ Khargone' },
        { id: 'BTN_FARES', title: '💰 View All Fares' },
      ],
    }
  }

  // Direct Booking ID Lookup (e.g. KC33329 or #KC33329)
  const bookingRefMatch = upper.match(/^#?(KC\d{4,6})$/)
  if (bookingRefMatch) {
    const searchRef = bookingRefMatch[1]
    const { data: bList } = await db
      .from('bookings')
      .select('*')
      .eq('booking_ref', searchRef)
      .limit(1)

    const b = bList?.[0]
    if (b) {
      const isKI = b.direction === 'KI'
      const route = isKI ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'
      const isConfirmed = b.status === 'confirmed' || b.status === 'matched'
      const isWaiting = b.status === 'waiting'
      const isPending = b.status === 'pending_payment'
      const isRefunded = b.status === 'refunded'

      if (isConfirmed) {
        return {
          replyText: `🎉 *Congratulations! Aapki MarutiCab booking successfully confirm ho gayi hai!*\n\n*Your Journey Details*\n- *Booking ID:* #${b.booking_ref}\n- *Route:* ${route}\n- *Date:* ${b.travel_date}\n- *Pickup:* ${String(b.pickup_time).slice(0, 5)}\n- *Vehicle:* Dedicated Private Sedan\n- *Car Number:* ${b.vehicle_number || 'MP09 CAB'}\n- *Driver Name:* ${b.driver_name || 'Assigned Driver'}\n- *Driver Contact:* ${b.driver_phone || '+91 72823 16090'}\n\n*Payment Details*\n- *Total Fare:* ₹${b.total_fare}\n- *Advance Paid:* ₹${b.advance_paid || 500}\n- *Remaining in Cab:* ₹${b.balance_amount || 0}\n\nDriver ki details pickup time se 2–3 ghante pehle dobara WhatsApp par share kar di jayengi.\n\nThank you for travelling with MarutiCab! 🚕`,
          buttons: [
            { id: 'BTN_SUPPORT', title: '📞 Helpline Support' },
            { id: 'BTN_BOOK_CAB', title: '🚕 Nayi Cab Book' },
          ],
        }
      }

      if (isWaiting) {
        return {
          replyText: `MarutiCab 🚕\n\n*Thank you! Aapki booking request receive ho gayi hai.*\n\n*Booking ID:* #${b.booking_ref}\n- *Route:* ${route}\n- *Travel Date:* ${b.travel_date}\n- *Pickup Time:* ${String(b.pickup_time).slice(0, 5)}\n- *Total Fare:* ₹${b.total_fare}\n- *Advance Paid:* ₹${b.advance_paid || 500}\n- *Balance:* ₹${b.balance_amount || 0}\n\n🔍 *Hum aapki opposite return ride match kar rahe hain.*\n\nJaise hi cab, driver aur return ride confirm hoti hai, hum aapko WhatsApp par confirmation bhej denge.\n\n🛡️ *100% Refund Guarantee:* Agar deadline tak match nahi milta hai, toh aapka ₹${b.advance_paid || 500} advance automatically 100% refund kar diya jayega.\n\nThank you for choosing MarutiCab! ❤️`,
          buttons: [
            { id: 'BTN_SUPPORT', title: '📞 Helpline Support' },
            { id: 'BTN_BOOK_CAB', title: '🚕 Nayi Cab Book' },
          ],
        }
      }

      if (isPending) {
        return {
          replyText: `⌛ *Advance Payment Pending*\n\nBooking ID: *#${b.booking_ref}*\nRoute: ${route}\nDate: ${b.travel_date} at ${String(b.pickup_time).slice(0, 5)}\n\nNeeche diye link se ₹${b.advance_amount || 500} advance pay karein taaki ride reservation lock ho sake:\n👉 https://www.maruticab.in/pay?ref=${b.booking_ref}`,
          buttons: [
            { id: 'BTN_SUPPORT', title: '📞 Helpline Support' },
            { id: 'BTN_BOOK_CAB', title: '🚕 Change Booking' },
          ],
        }
      }

      if (isRefunded) {
        return {
          replyText: `💰 *Advance Refunded*\n\nBooking ID: *#${b.booking_ref}*\nAapka ₹${b.advance_paid || 500} advance 100% refund kar diya gaya hai. Refund 3–5 working days me aapke payment source me reflect hoga.`,
          buttons: [{ id: 'BTN_BOOK_CAB', title: '🚕 Nayi Cab Book' }],
        }
      }
    }
  }

  // Button: Route Khargone to Indore
  if (upper === 'BTN_ROUTE_KI' || upper === '1' || upper === 'KHARGONE TO INDORE') {
    conv.data.direction = 'KI'
    conv.data.total_fare = FARES.KI.fare
    conv.data.advance_amount = conv.data.advance_amount || FARES.KI.advance
    conv.data.balance_amount = conv.data.total_fare - (conv.data.advance_amount || 500)
    conv.state = 'SELECT_DATE'
    conv.step = 2
    await saveConversation(conv)

    return {
      replyText: `Aapne chuna: *Khargone ➔ Indore* 🚕\nFixed Fare: *₹2,200* (Tolls & AC Included · Dedicated Sedan)\n\n📅 Kripya apni *Travel Date* chuniye:`,
      buttons: [
        { id: 'BTN_DATE_TODAY', title: '📅 Aaj (Today)' },
        { id: 'BTN_DATE_TOMORROW', title: '📅 Kal (Tomorrow)' },
        { id: 'BTN_DATE_OTHER', title: '📆 Other Date' },
      ],
    }
  }

  // Button: Route Indore to Khargone
  if (upper === 'BTN_ROUTE_IK' || upper === '2' || upper === 'INDORE TO KHARGONE') {
    conv.data.direction = 'IK'
    conv.data.total_fare = FARES.IK.fare
    conv.data.advance_amount = conv.data.advance_amount || FARES.IK.advance
    conv.data.balance_amount = conv.data.total_fare - (conv.data.advance_amount || 500)
    conv.state = 'SELECT_DATE'
    conv.step = 2
    await saveConversation(conv)

    return {
      replyText: `Aapne chuna: *Indore ➔ Khargone* 🚖\nFixed Fare: *₹1,800* (Tolls & AC Included · Dedicated Sedan)\n\n📅 Kripya apni *Travel Date* chuniye:`,
      buttons: [
        { id: 'BTN_DATE_TODAY', title: '📅 Aaj (Today)' },
        { id: 'BTN_DATE_TOMORROW', title: '📅 Kal (Tomorrow)' },
        { id: 'BTN_DATE_OTHER', title: '📆 Other Date' },
      ],
    }
  }

  // Button: Today Date
  if (upper === 'BTN_DATE_TODAY' || upper === 'TODAY' || upper === 'AAJ') {
    conv.data.travel_date = dateIST
    conv.state = 'SELECT_TIME'
    conv.step = 3
    await saveConversation(conv)

    return {
      replyText: `📅 Travel Date: *Aaj (${dateIST})* note kar liya! ✅\n\n⏰ Pickup kis samay chahiye? Neeche diye options me se chuniye ya apna time likhein:`,
      buttons: [
        { id: 'BTN_TIME_0800', title: '🌅 8:00 AM' },
        { id: 'BTN_TIME_1200', title: '☀️ 12:00 PM' },
        { id: 'BTN_TIME_1700', title: '🌆 5:00 PM' },
      ],
    }
  }

  // Button: Tomorrow Date
  if (upper === 'BTN_DATE_TOMORROW' || upper === 'TOMORROW' || upper === 'KAL') {
    const tmrw = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const tmrwDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(tmrw)
    conv.data.travel_date = tmrwDate
    conv.state = 'SELECT_TIME'
    conv.step = 3
    await saveConversation(conv)

    return {
      replyText: `📅 Travel Date: *Kal (${tmrwDate})* note kar liya! ✅\n\n⏰ Pickup kis samay chahiye? Neeche diye options me se chuniye ya apna time likhein:`,
      buttons: [
        { id: 'BTN_TIME_0800', title: '🌅 8:00 AM' },
        { id: 'BTN_TIME_1200', title: '☀️ 12:00 PM' },
        { id: 'BTN_TIME_1700', title: '🌆 5:00 PM' },
      ],
    }
  }

  // Button: Time selection
  if (upper.startsWith('BTN_TIME_')) {
    const timeCode = upper.replace('BTN_TIME_', '')
    const hours = timeCode.slice(0, 2)
    const mins = timeCode.slice(2, 4) || '00'
    const formattedTime = `${hours}:${mins}`
    conv.data.pickup_time = formattedTime
    conv.state = 'SELECT_LOCATIONS'
    conv.step = 4
    await saveConversation(conv)

    const isKI = conv.data.direction === 'KI'
    return {
      replyText: `⏰ Pickup Time: *${formattedTime}* lock kar liya! 🔒\n\n📍 Kripya apna *Pickup Address* batayein (${isKI ? 'Khargone me kahan se gaadi me baithna hai' : 'Indore me kahan se pickup karein'}):`,
      buttons: isKI
        ? [
            { id: 'BTN_LOC_BUS_STAND', title: '🏠 Bus Stand Khargone' },
            { id: 'BTN_LOC_COLLECTORATE', title: '🏢 Collectorate' },
            { id: 'BTN_LOC_HOME', title: '📍 Home Pickup' },
          ]
        : [
            { id: 'BTN_LOC_RAJENDRA', title: '📍 Rajendra Nagar' },
            { id: 'BTN_LOC_BHAWARKUA', title: '📍 Bhawarkua' },
            { id: 'BTN_LOC_STATION', title: '🚆 Railway Station' },
          ],
    }
  }

  // Quick Location buttons
  if (upper === 'BTN_LOC_BUS_STAND') conv.data.pickup_address = 'Bus Stand, Khargone'
  if (upper === 'BTN_LOC_COLLECTORATE') conv.data.pickup_address = 'Collectorate, Khargone'
  if (upper === 'BTN_LOC_RAJENDRA') conv.data.pickup_address = 'Rajendra Nagar, Indore'
  if (upper === 'BTN_LOC_BHAWARKUA') conv.data.pickup_address = 'Bhawarkua, Indore'
  if (upper === 'BTN_LOC_STATION') conv.data.pickup_address = 'Railway Station, Indore'

  // Button: Confirm and Pay
  if (upper === 'BTN_CONFIRM_PAY' || upper === 'CONFIRM & PAY' || upper === 'HAAN PAY KAREIN') {
    return await executeBookingReservationAndPayment(conv)
  }

  // Button: Edit Details
  if (upper === 'BTN_EDIT' || upper === 'EDIT DETAILS') {
    conv.state = 'IDLE'
    conv.step = 1
    conv.data = {}
    await saveConversation(conv)
    return {
      replyText: `Koi baat nahi! Humne details reset kar di hain. Nayi booking ke liye route select karein:`,
      buttons: [
        { id: 'BTN_ROUTE_KI', title: '🚕 Khargone ➔ Indore' },
        { id: 'BTN_ROUTE_IK', title: '🚖 Indore ➔ Khargone' },
        { id: 'BTN_FARES', title: '💰 View Fares' },
      ],
    }
  }

  // Button: My Booking / Track Booking
  if (
    upper === 'BTN_MY_BOOKING' ||
    upper === 'MY BOOKING' ||
    upper === 'BTN_TRACK' ||
    upper === 'TRACK' ||
    upper === 'STATUS' ||
    upper === 'TRACK MY BOOKING' ||
    upper === 'BOOKING STATUS'
  ) {
    const { data: bookings } = await db
      .from('bookings')
      .select('*')
      .eq('phone', cleanPhone)
      .order('created_at', { ascending: false })
      .limit(2)

    if (!bookings || bookings.length === 0) {
      return {
        replyText: `Aapke WhatsApp number (*+91 ${cleanPhone}*) par abhi koi active booking nahi mili hai.\n\nAgar aapke paas Booking ID (jaise *#KC12345*) hai, toh kripya yahan likhkar bhejein, ya nayi cab book karein:`,
        buttons: [
          { id: 'BTN_BOOK_CAB', title: '🚕 Book a Cab' },
          { id: 'BTN_SUPPORT', title: '📞 Talk to Support' },
        ],
      }
    }

    const latest = bookings[0]
    const route = latest.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'
    const isConfirmed = latest.status === 'confirmed' || latest.status === 'matched'
    const isWaiting = latest.status === 'waiting'
    const isPending = latest.status === 'pending_payment'
    const isRefunded = latest.status === 'refunded'

    if (isConfirmed) {
      return {
        replyText: `🎉 *Congratulations!*\n\nAapki MarutiCab booking successfully confirm ho gayi hai!\n\n*Your Journey Details*\n- *Booking ID:* #${latest.booking_ref}\n- *Route:* ${route}\n- *Date:* ${latest.travel_date}\n- *Pickup:* ${String(latest.pickup_time).slice(0, 5)}\n- *Vehicle:* Dedicated Private Sedan\n- *Car Number:* ${latest.vehicle_number || 'MP09 CAB'}\n- *Driver Name:* ${latest.driver_name || 'Assigned Driver'}\n- *Driver Contact:* ${latest.driver_phone || '+91 72823 16090'}\n\n*Payment Details*\n- *Total:* ₹${latest.total_fare}\n- *Advance:* ₹${latest.advance_paid || 500}\n- *Remaining:* ₹${latest.balance_amount || 0}\n\nDriver ki details pickup time se 2–3 ghante pehle dobara WhatsApp par share kar di jayengi.\n\nThank you for travelling with MarutiCab! 🚕`,
        buttons: [
          { id: 'BTN_SUPPORT', title: '📞 Helpline Support' },
          { id: 'BTN_BOOK_CAB', title: '🚕 Nayi Cab Book' },
        ],
      }
    }

    if (isWaiting) {
      return {
        replyText: `MarutiCab 🚕\n\n*Thank you! Aapki booking request receive ho gayi hai.*\n\n*Booking ID:* #${latest.booking_ref}\n- *Route:* ${route}\n- *Travel Date:* ${latest.travel_date}\n- *Pickup Time:* ${String(latest.pickup_time).slice(0, 5)}\n- *Total Fare:* ₹${latest.total_fare}\n- *Advance Paid:* ₹${latest.advance_paid || 500}\n- *Balance:* ₹${latest.balance_amount || 0}\n\n🔍 *Hum aapki opposite return ride match kar rahe hain.*\n\nJaise hi cab, driver aur return ride confirm hoti hai, hum aapko WhatsApp par confirmation bhej denge.\n\n🛡️ *100% Refund Guarantee:* Agar deadline tak match nahi milta hai, toh aapka ₹${latest.advance_paid || 500} advance automatically 100% refund kar diya jayega.\n\nThank you for choosing MarutiCab! ❤️`,
        buttons: [
          { id: 'BTN_SUPPORT', title: '📞 Helpline Support' },
          { id: 'BTN_BOOK_CAB', title: '🚕 Nayi Cab Book' },
        ],
      }
    }

    if (isPending) {
      return {
        replyText: `⌛ *Advance Payment Pending*\n\nBooking ID: *#${latest.booking_ref}*\nRoute: ${route}\nDate: ${latest.travel_date} at ${String(latest.pickup_time).slice(0, 5)}\n\nNeeche diye link se ₹${latest.advance_amount || 500} advance pay karein taaki booking lock ho sake:\n👉 https://www.maruticab.in/pay?ref=${latest.booking_ref}`,
        buttons: [
          { id: 'BTN_SUPPORT', title: '📞 Helpline Support' },
          { id: 'BTN_BOOK_CAB', title: '🚕 Change Route' },
        ],
      }
    }

    if (isRefunded) {
      return {
        replyText: `💰 *Advance Refunded*\n\nBooking ID: *#${latest.booking_ref}*\nAapka ₹${latest.advance_paid || 500} advance 100% refund kar diya gaya hai. Refund 3–5 working days me account me reflect hoga.`,
        buttons: [{ id: 'BTN_BOOK_CAB', title: '🚕 Nayi Cab Book' }],
      }
    }

    return {
      replyText: `🚗 *Booking ID: #${latest.booking_ref}*\n📍 *Route:* ${route}\n📅 *Date:* ${latest.travel_date} at ${String(latest.pickup_time).slice(0, 5)}\n📊 *Status:* ${latest.status.toUpperCase()}\n🔗 *Live Link:* https://maruticab.in/booking/${latest.public_token}`,
      buttons: [
        { id: 'BTN_BOOK_CAB', title: '🚕 Nayi Cab Book' },
        { id: 'BTN_SUPPORT', title: '📞 Helpline Support' },
      ],
    }
  }

  // Button: View Fares
  if (upper === 'BTN_FARES' || upper === 'FARES' || upper === 'VIEW FARES' || upper === 'KIRAYA') {
    return {
      replyText: `💰 *MarutiCab Private Sedan Fixed Fares:*

1️⃣ *Khargone ➔ Indore*: ₹2,200 (Total Fixed Fare)
   • Advance: ₹500
   • Balance in Cab: ₹1,700

2️⃣ *Indore ➔ Khargone*: ₹1,800 (Total Fixed Fare)
   • Advance: ₹500
   • Balance in Cab: ₹1,300

✨ *Included in Every Ride:*
• 100% Dedicated AC Sedan (Swift Dzire / Aura)
• No strangers / No sharing (Max 4 passengers)
• All Toll Taxes & Fuel Included
• Doorstep Pickup & City Point Drop
• 100% Auto-Refund Guarantee if ride not matched

Booking shuru karne ke liye route select karein:`,
      buttons: [
        { id: 'BTN_ROUTE_KI', title: '🚕 Khargone ➔ Indore' },
        { id: 'BTN_ROUTE_IK', title: '🚖 Indore ➔ Khargone' },
        { id: 'BTN_SUPPORT', title: '📞 Talk to Support' },
      ],
    }
  }

  // Button: Talk to Support
  if (upper === 'BTN_SUPPORT' || upper === 'SUPPORT' || upper === 'HELP') {
    return {
      replyText: `📞 *MarutiCab 24x7 Customer Support Desk:*

Hum hamesha aapki seva ke liye uplabdh hain:
• Call / WhatsApp: *+91 72823 16090*
• Website: https://maruticab.in
• Office: Bus Stand, Khargone (M.P.)

Agar aapko booking karni hai, toh neeche button dabayein:`,
      buttons: [
        { id: 'BTN_ROUTE_KI', title: '🚕 Khargone ➔ Indore' },
        { id: 'BTN_ROUTE_IK', title: '🚖 Indore ➔ Khargone' },
      ],
    }
  }

  // Coupon Code
  const couponMatch = upper.match(/^(?:COUPON\s+)?(MARUTI2|CAB2|TEST2|MARUTI99|CAB99|TEST99)$/)
  if (couponMatch) {
    const code = couponMatch[1]
    const is2Rs = ['MARUTI2', 'CAB2', 'TEST2'].includes(code)
    const newAdvance = is2Rs ? 2 : 5
    conv.data.coupon_code = code
    conv.data.advance_amount = newAdvance
    if (conv.data.total_fare) {
      conv.data.balance_amount = Math.max(0, conv.data.total_fare - newAdvance)
    }
    await saveConversation(conv)

    return {
      replyText: `🎉 *Coupon ${code} Applied Successfully!* ⚡\n\nAapka advance payment reduce hokar sirf *₹${newAdvance}* ho gaya hai (Testing Mode).\n\nNeeche button se booking continue karein:`,
      buttons: [
        { id: 'BTN_CONFIRM_PAY', title: `💳 Pay ₹${newAdvance} Advance` },
        { id: 'BTN_ROUTE_KI', title: '🚕 Change Route' },
        { id: 'BTN_CANCEL', title: '❌ Cancel' },
      ],
    }
  }

  // ── QUICK TEMPLATE DISPATCH INTENTS ──

  // 1. Driver & Car Details Request
  if (
    upper.includes('DRIVER DETAILS') ||
    upper.includes('DRIVER INFO') ||
    upper.includes('DRIVER KA NAAM') ||
    upper.includes('DRIVER NUMBER') ||
    upper.includes('GAADI DETAILS')
  ) {
    const { data: bList } = await db
      .from('bookings')
      .select('*')
      .eq('phone', cleanPhone)
      .in('status', ['confirmed', 'matched', 'waiting'])
      .order('created_at', { ascending: false })
      .limit(1)

    const b = bList?.[0]
    if (b && (b.driver_name || b.driver_id)) {
      const tpl = await dispatchRequestedTemplate('driver_car_details', cleanPhone, b)
      return {
        replyText: `🚘 *Aapki Dedicated Cab aur Driver Details:*

👤 Driver: *${b.driver_name || 'Assigned Driver'}*
📞 Mobile: *${b.driver_phone || '+91 72823 16090'}*
🚗 Car: *${b.vehicle_model || 'Dedicated AC Sedan'} (${b.vehicle_number || 'MP09'})*
📍 Pickup: ${b.address || 'Doorstep Pickup'} at ${String(b.pickup_time).slice(0, 5)}
💵 Balance in Cab: *₹${b.balance_amount || 0}*

Driver bhaiya pickup se 30 minute pehle aapse call par connect kar lenge. Shubh Yatra! ❤️`,
        templateCode: 'driver_car_details',
        templateVariables: tpl.variables,
        buttons: [{ id: 'BTN_SUPPORT', title: '📞 Support Desk' }],
      }
    } else if (b) {
      return {
        replyText: `Namaste ji! Aapki booking (#${b.booking_ref}) safe aur recorded hai. ✅\n\nMarutiCab policy ke mutabik dedicated cab aur driver details aapke pickup time se *2 se 3 ghante pehle* WhatsApp par dispatch ki jaati hain.\n\nKisi bhi emergency me hamare 24x7 desk par call karein: +91 72823 16090.`,
        buttons: [{ id: 'BTN_SUPPORT', title: '📞 Talk to Support' }],
      }
    }
  }

  // 2. Advance Payment Receipt / Proof Request
  if (
    upper.includes('PAYMENT RECEIPT') ||
    upper.includes('PAYMENT PROOF') ||
    upper.includes('ADVANCE RECEIPT') ||
    upper.includes('PAYMENT CONFIRMATION')
  ) {
    const { data: bList } = await db
      .from('bookings')
      .select('*')
      .eq('phone', cleanPhone)
      .gt('advance_paid', 0)
      .order('created_at', { ascending: false })
      .limit(1)

    const b = bList?.[0]
    if (b) {
      const tpl = await dispatchRequestedTemplate('payment_received', cleanPhone, b)
      return {
        replyText: `✅ *Aapka Advance Payment Confirmed Hai!*

🧾 Booking ID: *#${b.booking_ref}*
💰 Advance Paid: *₹${b.advance_paid}*
📍 Route: ${b.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'}
📅 Date: ${b.travel_date}
💵 Balance to Driver: *₹${b.balance_amount || 0}*

Aapko official payment confirmation template bhej diya gaya hai. ❤️`,
        templateCode: 'payment_received',
        templateVariables: tpl.variables,
        buttons: [{ id: 'BTN_TRACK', title: '📊 Track Booking' }],
      }
    }
  }

  // 3. Urgent Complaint / Driver Issue / Emergency -> Alert Operations Desk Immediately
  if (
    upper.includes('COMPLAINT') ||
    upper.includes('EMERGENCY') ||
    upper.includes('DRIVER NAHI AAYA') ||
    upper.includes('CAB LATE HAI') ||
    upper.includes('DUTY MANAGER') ||
    upper.includes('HELP DESK')
  ) {
    const { data: bList } = await db
      .from('bookings')
      .select('*')
      .eq('phone', cleanPhone)
      .order('created_at', { ascending: false })
      .limit(1)
    const b = bList?.[0]

    await dispatchRequestedTemplate('admin_client_issue', cleanPhone, b, text)

    return {
      replyText: `🚨 *Emergency Alert Sent to MarutiCab Duty Manager!*

Aapka message hamare operations manager ko priority alert ke saath forward kar diya gaya hai.
Hamari team turant aapse is number (+91 ${cleanPhone}) par direct call kar rahi hai.

Helpline par foran baat karne ke liye:
📞 *+91 72823 16090*`,
      templateCode: 'admin_client_issue',
      buttons: [{ id: 'BTN_SUPPORT', title: '📞 Call Desk Now' }],
    }
  }

  // ── 2. OPENAI GPT-4O-MINI INTELLIGENCE ENGINE ──
  // Build conversation context and message history for multi-turn understanding
  const history = (conv.data.history as Array<{ role: 'user' | 'assistant'; text: string }>) || []
  const messages: OpenAIMessage[] = [
    { role: 'system', content: getSystemPrompt(dateIST, timeIST) },
  ]

  // Add previous 4 turns for context
  for (const h of history.slice(-4)) {
    messages.push({
      role: h.role,
      content: h.text,
    })
  }

  // Add current user message with state context
  const stateContext = JSON.stringify({
    collected_so_far: {
      direction: conv.data.direction,
      travel_date: conv.data.travel_date,
      pickup_time: conv.data.pickup_time,
      pickup_address: conv.data.pickup_address,
      drop_address: conv.data.drop_address,
      passenger_count: conv.data.passenger_count,
      customer_name: conv.data.customer_name || senderName,
    },
    user_phone: cleanPhone,
    user_input: text,
  })

  messages.push({
    role: 'user',
    content: `Customer Phone: ${cleanPhone}\nCustomer Current Input: "${text}"\nCurrent Session State: ${stateContext}`,
  })

  try {
    const aiResponseRaw = await createChatCompletion(messages, {
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 700,
      response_format: { type: 'json_object' },
    })

    const parsedAI = JSON.parse(aiResponseRaw)
    const replyText = parsedAI.response_text || 'Namaste ji! MarutiCab me aapka swagat hai. Kripya apna route chuniye:'
    const extracted = parsedAI.extracted_data || {}

    // Update conversation state with any extracted details
    if (extracted.direction && ['KI', 'IK'].includes(extracted.direction)) {
      conv.data.direction = extracted.direction
      const fareInfo = FARES[extracted.direction as 'KI' | 'IK']
      conv.data.total_fare = fareInfo.fare
      conv.data.advance_amount = conv.data.advance_amount || fareInfo.advance
      conv.data.balance_amount = conv.data.total_fare - (conv.data.advance_amount || 500)
    }
    if (extracted.travel_date) conv.data.travel_date = extracted.travel_date
    if (extracted.pickup_time) conv.data.pickup_time = extracted.pickup_time
    if (extracted.pickup_address) conv.data.pickup_address = extracted.pickup_address
    if (extracted.drop_address) conv.data.drop_address = extracted.drop_address
    if (extracted.passenger_count) conv.data.passenger_count = Math.min(4, Math.max(1, extracted.passenger_count))
    if (extracted.customer_name) conv.data.customer_name = extracted.customer_name
    if (extracted.coupon_code) conv.data.coupon_code = extracted.coupon_code

    // Check if all details are ready to display summary
    const hasDirection = Boolean(conv.data.direction)
    const hasDate = Boolean(conv.data.travel_date)
    const hasTime = Boolean(conv.data.pickup_time)
    const hasPickup = Boolean(conv.data.pickup_address)
    const hasDrop = Boolean(conv.data.drop_address)

    // Save updated history
    const updatedHistory = [
      ...history.slice(-5),
      { role: 'user' as const, text },
      { role: 'assistant' as const, text: replyText },
    ]
    conv.data.history = updatedHistory
    await saveConversation(conv)

    // Dynamic buttons generation based on missing details
    let buttons: WhatsAppButton[] = []

    if (!hasDirection) {
      buttons = [
        { id: 'BTN_ROUTE_KI', title: '🚕 Khargone ➔ Indore' },
        { id: 'BTN_ROUTE_IK', title: '🚖 Indore ➔ Khargone' },
        { id: 'BTN_FARES', title: '💰 View Fares' },
      ]
    } else if (!hasDate) {
      buttons = [
        { id: 'BTN_DATE_TODAY', title: '📅 Aaj (Today)' },
        { id: 'BTN_DATE_TOMORROW', title: '📅 Kal (Tomorrow)' },
        { id: 'BTN_DATE_OTHER', title: '📆 Other Date' },
      ]
    } else if (!hasTime) {
      buttons = [
        { id: 'BTN_TIME_0800', title: '🌅 8:00 AM' },
        { id: 'BTN_TIME_1200', title: '☀️ 12:00 PM' },
        { id: 'BTN_TIME_1700', title: '🌆 5:00 PM' },
      ]
    } else if (hasDirection && hasDate && hasTime && hasPickup && hasDrop) {
      // All details collected! Present final summary
      return await renderFinalSummaryWithButtons(conv)
    } else {
      // Use AI recommended buttons if available
      if (Array.isArray(parsedAI.recommended_buttons) && parsedAI.recommended_buttons.length > 0) {
        buttons = parsedAI.recommended_buttons.slice(0, 3).map((b: any) => ({
          id: String(b.id || `BTN_${Date.now()}`),
          title: String(b.title || 'Select').slice(0, 20),
        }))
      } else {
        buttons = [
          { id: 'BTN_CONFIRM_PAY', title: '💳 Confirm & Pay' },
          { id: 'BTN_FARES', title: '💰 View Fares' },
          { id: 'BTN_SUPPORT', title: '📞 Support Desk' },
        ]
      }
    }

    // ── Check if AI requested an official template dispatch ──
    let triggeredTemplateCode: string | undefined = undefined
    let triggeredTemplateVars: string[] | undefined = undefined

    if (parsedAI.trigger_template) {
      const tplResult = await dispatchRequestedTemplate(
        parsedAI.trigger_template,
        cleanPhone,
        null,
        text
      )
      if (tplResult.success) {
        triggeredTemplateCode = parsedAI.trigger_template
        triggeredTemplateVars = tplResult.variables
      }
    }

    return {
      replyText,
      buttons,
      templateCode: triggeredTemplateCode,
      templateVariables: triggeredTemplateVars,
    }
  } catch (aiErr: any) {
    console.error('OpenAI Chatbot processing notice:', aiErr?.message || aiErr)

    // Friendly Fallback in Hinglish
    return {
      replyText: `Namaste ${senderName || ''}! 👋 Welcome to MarutiCab.\n\nKhargone aur Indore ke beech dedicated private AC cab book karne ke liye neeche button dabayein:`,
      buttons: [
        { id: 'BTN_ROUTE_KI', title: '🚕 Khargone ➔ Indore' },
        { id: 'BTN_ROUTE_IK', title: '🚖 Indore ➔ Khargone' },
        { id: 'BTN_SUPPORT', title: '📞 Talk to Support' },
      ],
    }
  }
}

/**
 * Builds final booking summary card with Confirm & Pay interactive button
 */
async function renderFinalSummaryWithButtons(conv: ConversationState): Promise<AIChatbotOutput> {
  const isKI = conv.data.direction === 'KI'
  const routeName = isKI ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'
  const fare = conv.data.total_fare || (isKI ? 2200 : 1800)
  const is2Rs = ['MARUTI2', 'CAB2', 'TEST2'].includes(String(conv.data.coupon_code || '')) || conv.data.advance_amount === 2
  const advance = is2Rs ? 2 : (conv.data.advance_amount || 500)
  const balance = Math.max(0, fare - advance)

  const summary = `🚕 *MarutiCab Booking Summary*

📍 *Route:* ${routeName}
📅 *Date:* ${conv.data.travel_date}
⏰ *Pickup Time:* ${conv.data.pickup_time}
🏠 *Pickup:* ${conv.data.pickup_address}
🎯 *Drop:* ${conv.data.drop_address}
👥 *Passengers:* ${conv.data.passenger_count || 1} Person(s)
👤 *Passenger:* ${conv.data.customer_name || 'Passenger'}
📱 *Mobile:* +91 ${conv.phone}

💰 *Fare Breakdown:*
• Total Fixed Fare: *₹${fare.toLocaleString('en-IN')}* (All Tolls & AC Included)
• Advance to Reserve: *₹${advance}* ${advance < 500 ? `(Coupon Applied 🎉)` : ''}
• Remaining in Cab: *₹${balance.toLocaleString('en-IN')}* (To driver by Cash/UPI)

🛡️ *100% Refund Guarantee:*
Agar schedule ke mutabiq return match nahi mila, toh aapka poora ₹${advance} advance turant refund ho jayega!

Kya sabhi details sahi hain? Neeche *"Confirm & Pay"* dabayein:`

  return {
    replyText: summary,
    buttons: [
      { id: 'BTN_CONFIRM_PAY', title: `💳 Confirm & Pay ₹${advance}` },
      { id: 'BTN_EDIT', title: '✏️ Edit Details' },
      { id: 'BTN_CANCEL', title: '❌ Cancel' },
    ],
  }
}

/**
 * Executes booking reservation in Supabase and issues payment links / in-chat orders
 */
async function executeBookingReservationAndPayment(conv: ConversationState): Promise<AIChatbotOutput> {
  const db = createServiceClient()
  const isKI = conv.data.direction === 'KI'
  const fare = conv.data.total_fare || (isKI ? 2200 : 1800)
  const is2Rs = ['MARUTI2', 'CAB2', 'TEST2'].includes(String(conv.data.coupon_code || '')) || conv.data.advance_amount === 2
  const advance = is2Rs ? 2 : (conv.data.advance_amount || 500)
  const balance = Math.max(0, fare - advance)
  const bookingRef = `KC${Math.floor(10000 + Math.random() * 90000)}`
  const publicToken = randomBytes(32).toString('base64url')
  const idempotencyKey = randomBytes(16).toString('hex')

  const travelDate = String(conv.data.travel_date || new Date().toISOString().slice(0, 10))
  const pickupTime = String(conv.data.pickup_time || '09:00:00')
  const routeLabel = isKI ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'
  const custName = String(conv.data.customer_name || 'Passenger').trim()

  // Format pickup time for Postgres
  let dbPickupTime = '09:00:00'
  const timeMatch = pickupTime.match(/^(\d{1,2}):(\d{2})/)
  if (timeMatch) {
    dbPickupTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}:00`
  }

  // 1. Insert booking record in Supabase in 'pending_payment' status
  const { data: newBooking, error: bookingErr } = await db.from('bookings').insert({
    booking_ref: bookingRef,
    status: 'pending_payment',
    direction: isKI ? 'KI' : 'IK',
    mode: 'match',
    vehicle: 'economy_sedan',
    vehicle_type: 'sedan',
    drop_point: 'rajendra',
    drop_name: String(conv.data.drop_address || 'City Point Drop'),
    travel_date: travelDate,
    pickup_time: dbPickupTime,
    passenger_name: custName,
    phone: conv.phone,
    passenger_count: conv.data.passenger_count || 1,
    address: conv.data.pickup_address || null,
    consent_whatsapp: true,
    consent_at: new Date().toISOString(),
    base_fare: fare,
    total_fare: fare,
    advance_amount: advance,
    advance_paid: 0,
    balance_amount: balance,
    public_token: publicToken,
    idempotency_key: idempotencyKey,
    extras: {
      booked_via: 'whatsapp_ai_chatbot',
      coupon_code: conv.data.coupon_code || null,
    },
  }).select().single()

  if (bookingErr) {
    console.error('Failed to create booking from WhatsApp AI Chatbot:', bookingErr)
  }

  conv.data.booking_id = newBooking?.id
  conv.data.booking_ref = bookingRef
  conv.data.payment_link = `https://www.maruticab.in/pay?ref=${bookingRef}`
  conv.state = 'AWAITING_PAYMENT'
  await saveConversation(conv)

  // 2. Dispatch official Meta template: booking_received
  try {
    await sendWhatsAppTemplateMessage({
      toPhone: conv.phone,
      templateCode: 'booking_received',
      variables: [
        custName,
        bookingRef,
        routeLabel,
        travelDate,
        pickupTime.slice(0, 5),
      ],
      bookingId: newBooking?.id,
    })
  } catch (tplErr) {
    console.warn('booking_received template dispatch notice:', tplErr)
  }

  // 3. Alert Admin Desk: admin_new_booking
  try {
    const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER || '918878933778'
    await sendWhatsAppTemplateMessage({
      toPhone: adminPhone,
      templateCode: 'admin_new_booking',
      variables: [
        bookingRef,
        custName,
        conv.phone,
        routeLabel,
        travelDate,
        pickupTime.slice(0, 5),
        String(advance),
        String(balance),
      ],
      bookingId: newBooking?.id,
    })
  } catch (admErr) {
    console.warn('admin_new_booking dispatch notice:', admErr)
  }

  const paymentText = `MarutiCab 🚕\n\n*Aapki booking request record ho gayi hai!* 📝\n\n- *Booking ID:* #${bookingRef}\n- *Route:* ${routeLabel}\n- *Travel Date:* ${travelDate}\n- *Pickup Time:* ${pickupTime}\n- *Total Fare:* ₹${fare.toLocaleString('en-IN')}\n- *Advance to Pay:* ₹${advance}\n- *Balance in Cab:* ₹${balance.toLocaleString('en-IN')}\n\nNeeche diye link par click karke ₹${advance} advance payment karein:\n👉 https://www.maruticab.in/pay?ref=${bookingRef}\n\n🔍 *Payment hone ke baad hum aapki opposite return ride match karenge.*\nJaise hi cab, driver aur return ride confirm hoti hai, hum aapko WhatsApp par confirmation bhej denge.\n\n🛡️ *100% Refund Guarantee:* Agar deadline tak match nahi milta, toh aapka ₹${advance} advance automatically 100% refund kar diya jayega.\n\nThank you for choosing MarutiCab! ❤️`

  return {
    replyText: paymentText,
    templateCode: 'booking_received',
    templateVariables: [custName, bookingRef, routeLabel, travelDate, pickupTime.slice(0, 5)],
    buttons: [
      { id: 'BTN_CHECK_STATUS', title: '🔄 Check Status' },
      { id: 'BTN_SUPPORT', title: '📞 Call Support' },
    ],
    paymentOrder: {
      amountInRs: advance,
      bookingRef,
      bookingId: newBooking?.id || '',
      customerName: custName,
      routeName: routeLabel,
      travelDate,
      pickupTime,
    },
  }
}
