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

OUTPUT FORMAT:
You MUST respond with a valid JSON object strictly matching this schema:
{
  "response_text": "Your helpful, friendly reply in Hinglish to the user",
  "intent": "book_cab" | "check_fares" | "track_booking" | "cancel_booking" | "apply_coupon" | "ask_faq" | "greeting" | "general",
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

  // Button: Track Booking
  if (upper === 'BTN_TRACK' || upper === 'TRACK' || upper === 'STATUS' || upper === 'TRACK MY BOOKING') {
    const { data: bookings } = await db
      .from('bookings')
      .select('*')
      .eq('phone', cleanPhone)
      .order('created_at', { ascending: false })
      .limit(2)

    if (!bookings || bookings.length === 0) {
      return {
        replyText: `Aapke number (*${cleanPhone}*) par abhi koi active booking nahi mili hai. Nayi booking ke liye neeche button dabayein:`,
        buttons: [
          { id: 'BTN_ROUTE_KI', title: '🚕 Khargone ➔ Indore' },
          { id: 'BTN_ROUTE_IK', title: '🚖 Indore ➔ Khargone' },
          { id: 'BTN_SUPPORT', title: '📞 Talk to Support' },
        ],
      }
    }

    const cards = bookings.map((b: any) => {
      const route = b.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'
      const statusTitle =
        b.status === 'confirmed'
          ? '✅ Confirmed & Scheduled'
          : b.status === 'waiting'
          ? '⏳ Advance Received · Finding Return Ride'
          : b.status === 'pending_payment'
          ? '⌛ Advance Payment Pending'
          : b.status.toUpperCase()

      const driverInfo = b.driver_name ? `\n🚗 *Driver:* ${b.driver_name}` : ''
      return `🧾 *Booking ID: #${b.booking_ref}*\n📍 *Route:* ${route}\n📅 *Date:* ${b.travel_date} at ${String(b.pickup_time).slice(0, 5)}\n📊 *Status:* ${statusTitle}${driverInfo}\n🔗 *Live Link:* https://maruticab.in/booking/${b.public_token}`
    })

    return {
      replyText: `🚗 *Aapki MarutiCab Bookings:*\n\n${cards.join('\n\n---\n\n')}`,
      buttons: [
        { id: 'BTN_ROUTE_KI', title: '🚕 Nayi Cab Book Karein' },
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

    return {
      replyText,
      buttons,
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

  const paymentText = `🎉 *Aapki Booking Record Ho Gayi Hai!* 🚕

🧾 *Booking ID:* #${bookingRef}
📍 *Route:* ${routeLabel}
📅 *Date & Time:* ${travelDate} at ${pickupTime}
💰 *Total Fare:* ₹${fare.toLocaleString('en-IN')}
💳 *Advance Amount:* ₹${advance} (Baki ₹${balance.toLocaleString('en-IN')} driver ko dena hai)

Neeche diye link par click karke 1 minute me advance payment karein taaki aapki cab confirm ho jaye:
👉 https://www.maruticab.in/pay?ref=${bookingRef}

🛡️ *100% Refund Guarantee:* Agar match confirm nahi hota, toh poora ₹${advance} bina kisi charge ke refund ho jayega.`

  return {
    replyText: paymentText,
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
