// src/lib/whatsapp-conversation.ts
// Complete WhatsApp Conversational Booking Journey for MarutiCab (Khargone ↔ Indore)
// Integrates Step-by-Step State Machine + Gemini AI Intent Parsing + Dynamic Booking Rules Engine

import { createServiceClient } from '@/lib/supabase-server'
import { evaluateBookingLeadTime, formatInKolkata } from '@/lib/booking-rules'
import { createRazorpayPaymentLink } from '@/lib/razorpay'
import { sendText, sendInChatPaymentOrder } from '@/lib/whatsapp'
import { sendWhatsAppTemplateMessage } from '@/lib/whatsapp-templates'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_gemini_key')

export interface ConversationState {
  phone: string
  state: string
  step: number
  data: {
    direction?: 'KI' | 'IK'
    travel_date?: string
    pickup_time?: string
    pickup_address?: string
    drop_address?: string
    passenger_count?: number
    customer_name?: string
    luggage_info?: string
    total_fare?: number
    advance_amount?: number
    balance_amount?: number
    booking_id?: string
    booking_ref?: string
    rule_code?: string
    matching_deadline?: string
    payment_link?: string
    [key: string]: unknown
  }
  last_message_at: string
}

const FARES = {
  KI: { name: 'Khargone ➔ Indore', fare: 2200, advance: 500, balance: 1700 },
  IK: { name: 'Indore ➔ Khargone', fare: 1800, advance: 500, balance: 1300 },
}

/**
 * Loads conversation state from Supabase whatsapp_conversations
 */
export async function getConversation(phone: string): Promise<ConversationState> {
  const db = createServiceClient()
  const cleanPhone = phone.replace(/\D/g, '').slice(-10)

  const { data } = await db
    .from('whatsapp_conversations')
    .select('*')
    .eq('phone', cleanPhone)
    .single()

  if (data) {
    return {
      phone: data.phone,
      state: data.state,
      step: data.step,
      data: data.data || {},
      last_message_at: data.last_message_at,
    }
  }

  return {
    phone: cleanPhone,
    state: 'IDLE',
    step: 1,
    data: {},
    last_message_at: new Date().toISOString(),
  }
}

/**
 * Saves conversation state to Supabase
 */
export async function saveConversation(conv: ConversationState): Promise<void> {
  const db = createServiceClient()
  const { error: upsertErr } = await db
    .from('whatsapp_conversations')
    .upsert({
      phone: conv.phone,
      state: conv.state,
      step: conv.step,
      data: conv.data,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'phone' })
  if (upsertErr) console.error('Failed to save whatsapp conversation:', upsertErr)
}

/**
 * Parse date string from text
 */
function parseDateInput(input: string): string | null {
  const trimmed = input.trim().toLowerCase()
  const now = new Date()

  if (trimmed === 'today' || trimmed === 'aaj' || trimmed === 'आज') {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now)
  }
  if (trimmed === 'tomorrow' || trimmed === 'kal' || trimmed === 'कल') {
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(tomorrow)
  }

  // Check YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    const [, y, m, d] = isoMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // Check DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  return null
}

/**
 * Parse 24-hr time HH:MM from user text
 */
function parseTimeInput(input: string): string | null {
  const clean = input.trim().toLowerCase().replace(/\s+/g, '')
  // Match 12-hour AM/PM: e.g. 6am, 7:30pm, 10:00am
  const ampmMatch = clean.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/)
  if (ampmMatch) {
    let hour = Number(ampmMatch[1])
    const minute = ampmMatch[2] ? Number(ampmMatch[2]) : 0
    const period = ampmMatch[3]
    if (period === 'pm' && hour < 12) hour += 12
    if (period === 'am' && hour === 12) hour = 0
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }

  // Match 24-hr: e.g. 14:30 or 06:00
  const hourMatch = clean.match(/^(\d{1,2}):(\d{2})$/)
  if (hourMatch) {
    const hour = Number(hourMatch[1])
    const minute = Number(hourMatch[2])
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    }
  }

  // Single number like "6" or "8"
  const singleMatch = clean.match(/^(\d{1,2})$/)
  if (singleMatch) {
    const h = Number(singleMatch[1])
    if (h >= 5 && h <= 23) {
      return `${String(h).padStart(2, '0')}:00`
    }
  }

  return null
}

/**
 * Gemini AI fallback parser for complex natural queries
 */
async function parseWithGemini(userMessage: string, senderName?: string) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const prompt = `You are the AI Booking Assistant for MarutiCab operating private sedans between Khargone and Indore.
Extract booking details from this passenger message: "${userMessage}".
Today in India is ${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())}.
Return ONLY a valid JSON object with these keys (use null if not mentioned):
{
  "direction": "KI" (if Khargone to Indore) or "IK" (if Indore to Khargone) or null,
  "travel_date": "YYYY-MM-DD" or null,
  "pickup_time": "HH:MM" (24-hr) or null,
  "pickup_address": string or null,
  "drop_address": string or null,
  "passenger_count": integer (1 to 4) or null,
  "customer_name": string or null,
  "is_faq": boolean (true if user asks general question about pricing, safety, vehicle, etc.),
  "faq_answer": string or null (helpful, short answer in Hindi/English if is_faq is true)
}
Do not include markdown or backticks. Return raw JSON.`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim()
    return JSON.parse(cleanJson)
  } catch (err) {
    console.warn('Gemini intent extraction skipped:', err)
    return null
  }
}

/**
 * Main WhatsApp Conversational Controller
 */
export async function processWhatsAppInbound(
  fromPhone: string,
  messageText: string,
  senderName?: string
): Promise<string> {
  const cleanPhone = fromPhone.replace(/\D/g, '').slice(-10)
  const text = messageText.trim()
  const upper = text.toUpperCase()
  const conv = await getConversation(cleanPhone)
  const db = createServiceClient()

  // ── GLOBAL COMMAND: CANCELLATION ──
  if (upper === 'CANCEL' || upper === 'CANCEL RIDE' || upper.startsWith('CANCEL ') || upper === 'रद्द') {
    const { data: activeBookings } = await db
      .from('bookings')
      .select('*')
      .eq('phone', cleanPhone)
      .in('status', ['waiting', 'matched', 'confirmed', 'pending_payment'])
      .order('created_at', { ascending: false })
      .limit(1)

    const target = activeBookings?.[0]
    if (target) {
      const willRefund = (target.advance_paid || 0) > 0
      await db.from('bookings').update({
        status: 'cancelled',
        refund_status: willRefund ? 'pending' : 'not_applicable',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        extras: {
          ...(target.extras || {}),
          cancelled_via: 'whatsapp_conversation',
        },
      }).eq('id', target.id)

      // Send Template 4 (refund_initiated) if advance was paid, otherwise plain cancellation
      if (willRefund) {
        await sendWhatsAppTemplateMessage({
          toPhone: cleanPhone,
          templateCode: 'refund_initiated',
          variables: [
            target.passenger_name || 'Passenger',
            target.booking_ref,
            `REF_${Date.now()}`,
          ],
          bookingId: target.id,
        })
      }

      conv.state = 'IDLE'
      conv.step = 1
      conv.data = {}
      await saveConversation(conv)

      return `✅ *Aapki Booking (#${target.booking_ref}) Cancel Kar Di Gayi Hai.*\n\n${willRefund ? '💰 Paid Advance ₹500 ka refund initiate kar diya gaya hai (5-7 working days).' : 'No advance payment was taken.'}\n\nAgar aap dobara cab book karna chahte hain, to *1* ya *2* likhein.`
    } else {
      return `Aapke number (${cleanPhone}) par koi active booking nahi mili. Nayi booking ke liye *MENU* ya *HI* likhein.`
    }
  }

  // ── GLOBAL COMMAND: TRACK MY BOOKING ──
  if (upper === 'TRACK' || upper === 'STATUS' || upper === '3' || upper === 'TRACK MY BOOKING' || upper === 'स्थिति') {
    const { data: bookings } = await db
      .from('bookings')
      .select('*')
      .eq('phone', cleanPhone)
      .order('created_at', { ascending: false })
      .limit(3)

    if (!bookings || bookings.length === 0) {
      return `Aapke number par abhi tak koi booking nahi mili hai. Nayi booking ke liye *HI* bhejein.`
    }

    const lines = bookings.map((b: any) => {
      const route = b.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'
      const statusTitle =
        b.status === 'confirmed'
          ? '✅ Confirmed'
          : b.status === 'waiting'
          ? '⏳ Finding Return Match'
          : b.status === 'cancelled'
          ? '❌ Cancelled'
          : b.status.toUpperCase()

      const deadlineNote = b.matching_deadline
        ? `\n⏱️ Match Deadline: ${formatInKolkata(new Date(b.matching_deadline))}`
        : ''

      const driverNote = b.driver_name ? `\n👨✈️ Driver: ${b.driver_name} (${b.driver_id || 'Assigned'})` : ''
      const refundNote = b.refund_status === 'processed' ? '\n💸 Refund: Processed' : b.refund_status === 'pending' ? '\n💸 Refund: In Progress' : ''

      return `🧾 *Booking ID: ${b.booking_ref}*\n📍 Route: ${route}\n📅 Date: ${b.travel_date} at ${String(b.pickup_time).slice(0, 5)}\n📊 Status: ${statusTitle}${driverNote}${deadlineNote}${refundNote}\n🔗 Live Link: https://maruticab.in/booking/${b.public_token}`
    })

    return `🚗 *Aapki MarutiCab Bookings:*\n\n${lines.join('\n\n---\n\n')}\n\nKisi booking ko cancel karne ke liye *CANCEL* likhein.`
  }

  // ── GLOBAL COMMAND: VIEW FARES ──
  if (upper === '4' || upper === 'FARES' || upper === 'VIEW FARES' || upper === 'KIRAYA' || upper === 'रेट') {
    return `💰 *MarutiCab Private Sedan Fares:*

1️⃣ *Khargone ➔ Indore*: ₹2,200 (Total Fixed Fare)
   • Advance: ₹500
   • Balance in Cab: ₹1,700

2️⃣ *Indore ➔ Khargone*: ₹1,800 (Total Fixed Fare)
   • Advance: ₹500
   • Balance in Cab: ₹1,300

✨ *Subhi Fares Mein Included:*
• Toll Tax Included (Toll alag se nahi dena)
• Private Sedan (Dedicated AC Car, koi anjan sawari nahi)
• Doorstep Pickup & City Point Drop
• Upto 4 Passengers

Book karne ke liye *1* (Khargone to Indore) ya *2* (Indore to Khargone) reply karein.`
  }

  // ── GLOBAL COMMAND: TALK TO SUPPORT ──
  if (upper === '5' || upper === 'SUPPORT' || upper === 'TALK TO SUPPORT' || upper === 'HELP' || upper === 'मदद') {
    return `📞 *MarutiCab Customer Support:*

Hamari dispatch team 24/7 uplabdh hai:
• Call / WhatsApp: +91 72823 16090
• Website: https://maruticab.in
• Office: Bus Stand, Khargone (M.P.)

Nayi booking shuru karne ke liye *HI* ya *1* bhejein.`
  }

  // ── GLOBAL COMMAND: RESET CONVERSATION ──
  if (upper === 'RESET' || upper === 'NEW' || upper === 'MENU' || upper === 'START') {
    conv.state = 'IDLE'
    conv.step = 1
    conv.data = {}
    await saveConversation(conv)
  }

  // ── AI INTENT DISCOVERY: Check if user sent a complete booking intent in one message ──
  if (conv.state === 'IDLE' && text.length > 8 && !['1', '2', 'HI', 'HELLO', 'NAMASTE'].includes(upper)) {
    const aiParsed = await parseWithGemini(text, senderName)
    if (aiParsed?.is_faq && aiParsed?.faq_answer) {
      return `${aiParsed.faq_answer}\n\nCab book karne ke liye *1* (Khargone to Indore) ya *2* (Indore to Khargone) reply karein.`
    }

    if (aiParsed?.direction) {
      const validDir = (aiParsed.direction === 'IK' ? 'IK' : 'KI') as 'KI' | 'IK'
      conv.data.direction = validDir
      const fareInfo = FARES[validDir]
      conv.data.total_fare = fareInfo.fare
      conv.data.advance_amount = fareInfo.advance
      conv.data.balance_amount = fareInfo.balance

      if (aiParsed.travel_date) conv.data.travel_date = aiParsed.travel_date
      if (aiParsed.pickup_time) conv.data.pickup_time = aiParsed.pickup_time
      if (aiParsed.pickup_address) conv.data.pickup_address = aiParsed.pickup_address
      if (aiParsed.drop_address) conv.data.drop_address = aiParsed.drop_address
      if (aiParsed.passenger_count) conv.data.passenger_count = Math.min(4, Math.max(1, aiParsed.passenger_count))
      if (aiParsed.customer_name) conv.data.customer_name = aiParsed.customer_name

      // Check what is missing
      if (!conv.data.travel_date) {
        conv.state = 'SELECT_DATE'
        conv.step = 2
        await saveConversation(conv)
        return `Aapne chuna: *${fareInfo.name}* (Fare: ₹${fareInfo.fare})\n\n📅 Kripya apni *Travel Date* batayein? (Jaise: *Today*, *Tomorrow*, ya *05-11-2026*)`
      }

      if (!conv.data.pickup_time) {
        conv.state = 'SELECT_TIME'
        conv.step = 3
        await saveConversation(conv)
        return `📅 Travel Date: *${conv.data.travel_date}*\n\n⏰ Aapko kis samay cab chahiye? (Jaise: *6:00 AM*, *9:30 AM*, *2:00 PM*)`
      }

      if (!conv.data.pickup_address || !conv.data.drop_address) {
        conv.state = 'SELECT_LOCATIONS'
        conv.step = 4
        await saveConversation(conv)
        return `📍 Kripya apna *Pickup Address* aur *Drop Location* batayein (Jaise: *Bus Stand Khargone to Rajendra Nagar Indore*)`
      }

      if (!conv.data.customer_name) {
        conv.data.customer_name = senderName || 'Passenger'
      }

      conv.state = 'CONFIRM_SUMMARY'
      conv.step = 7
      await saveConversation(conv)
      return await buildSummaryMessage(conv)
    }
  }

  // ── STEP-BY-STEP CONVERSATIONAL STATE MACHINE ──
  switch (conv.state) {
    case 'IDLE': {
      if (upper === '1' || upper.includes('KHARGONE TO INDORE') || upper.includes('KHARGONE->INDORE')) {
        conv.data.direction = 'KI'
        conv.data.total_fare = FARES.KI.fare
        conv.data.advance_amount = FARES.KI.advance
        conv.data.balance_amount = FARES.KI.balance
        conv.state = 'SELECT_DATE'
        conv.step = 2
        await saveConversation(conv)
        return `Aapne chuna: *Khargone ➔ Indore* (₹2,200)\n\n📅 Kripya apni *Travel Date* batayein:\n• *Today* (Aaj)\n• *Tomorrow* (Kal)\n• Ya koi date (Jaise: *05-11-2026*)`
      }

      if (upper === '2' || upper.includes('INDORE TO KHARGONE') || upper.includes('INDORE->KHARGONE')) {
        conv.data.direction = 'IK'
        conv.data.total_fare = FARES.IK.fare
        conv.data.advance_amount = FARES.IK.advance
        conv.data.balance_amount = FARES.IK.balance
        conv.state = 'SELECT_DATE'
        conv.step = 2
        await saveConversation(conv)
        return `Aapne chuna: *Indore ➔ Khargone* (₹1,800)\n\n📅 Kripya apni *Travel Date* batayein:\n• *Today* (Aaj)\n• *Tomorrow* (Kal)\n• Ya koi date (Jaise: *05-11-2026*)`
      }

      // Default Welcome Message
      return `Namaste ${senderName || ''}! 👋 Welcome to *Maruti Cab Booking*.

Khargone aur Indore ke beech dedicated private sedan cab service.

Kripya apna option chuniye:
1️⃣ *Khargone ➔ Indore* (₹2,200)
2️⃣ *Indore ➔ Khargone* (₹1,800)
3️⃣ *Track My Booking*
4️⃣ *View Fares & Rules*
5️⃣ *Talk to Support*

Reply with *1*, *2*, *3*, *4* or *5*.`
    }

    case 'SELECT_DATE': {
      const parsedDate = parseDateInput(text)
      if (!parsedDate) {
        return `⚠️ Kripya sahi date batayein (Jaise: *Today*, *Tomorrow*, ya *05-11-2026*):`
      }

      conv.data.travel_date = parsedDate
      conv.state = 'SELECT_TIME'
      conv.step = 3
      await saveConversation(conv)
      return `📅 Travel Date: *${parsedDate}*\n\n⏰ Aapko pickup kis time par chahiye?\n(Jaise: *6:00 AM*, *8:00 AM*, *12:00 PM*, *5:00 PM*)`
    }

    case 'SELECT_TIME': {
      const parsedTime = parseTimeInput(text)
      if (!parsedTime) {
        return `⚠️ Kripya sahi time batayein (Jaise: *6:00 AM*, *8:30 AM*, ya *17:00*):`
      }

      conv.data.pickup_time = parsedTime

      // Evaluate dynamic lead time and cutoff rules
      const ruleResult = await evaluateBookingLeadTime(
        conv.data.travel_date!,
        parsedTime,
        new Date()
      )

      if (!ruleResult.canAcceptPending) {
        return `⚠️ *Booking Not Allowed at this Time:*\n${ruleResult.rejectionReason}\n\nKripya koi doosra time select karein ya call karein: +91 72823 16090.`
      }

      conv.data.rule_code = ruleResult.ruleCode
      conv.data.matching_deadline = ruleResult.matchingDeadline.toISOString()
      conv.data.matching_deadline_kolkata = ruleResult.matchingDeadlineKolkata

      conv.state = 'SELECT_LOCATIONS'
      conv.step = 4
      await saveConversation(conv)

      const isKI = conv.data.direction === 'KI'
      return `⏰ Pickup Time: *${parsedTime}* (Rule: ${ruleResult.ruleName})\n\n📍 Kripya apna *Pickup Address* batayein (${isKI ? 'Khargone mein kahan se' : 'Indore mein kahan se'}):`
    }

    case 'SELECT_LOCATIONS': {
      if (!conv.data.pickup_address) {
        conv.data.pickup_address = text
        await saveConversation(conv)
        const isKI = conv.data.direction === 'KI'
        return `Pickup: *${text}*\n\n📍 Ab kripya apna *Drop Location* batayein (${isKI ? 'Indore mein kahan tak' : 'Khargone mein kahan tak'}):`
      }

      conv.data.drop_address = text
      conv.state = 'SELECT_PASSENGERS'
      conv.step = 5
      await saveConversation(conv)
      return `Drop: *${text}*\n\n👥 Kitne passengers travel karenge? (Private Sedan: Max *4* passengers allowed):`
    }

    case 'SELECT_PASSENGERS': {
      const count = parseInt(text.replace(/\D/g, ''), 10)
      if (isNaN(count) || count < 1 || count > 4) {
        return `⚠️ MarutiCab private sedan cab mein 1 se 4 passengers allowed hain. Kripya 1 se 4 ke beech number batayein:`
      }

      conv.data.passenger_count = count
      conv.state = 'SELECT_NAME'
      conv.step = 6
      await saveConversation(conv)

      const defaultName = senderName || ''
      if (defaultName && defaultName !== 'WhatsApp User') {
        conv.data.customer_name = defaultName
        conv.state = 'CONFIRM_SUMMARY'
        conv.step = 7
        await saveConversation(conv)
        return await buildSummaryMessage(conv)
      }

      return `👤 Kripya passenger ka *Pura Naam* batayein:`
    }

    case 'SELECT_NAME': {
      conv.data.customer_name = text.trim()
      conv.state = 'CONFIRM_SUMMARY'
      conv.step = 7
      await saveConversation(conv)
      return await buildSummaryMessage(conv)
    }

    case 'CONFIRM_SUMMARY': {
      if (upper === '1' || upper === 'CONFIRM' || upper === 'HAAN' || upper === 'YES') {
        // Create verified booking and Razorpay payment link
        return await handleCreatePaymentLinkAndBooking(conv)
      }

      if (upper === '2' || upper === 'EDIT') {
        conv.state = 'IDLE'
        conv.step = 1
        conv.data = {}
        await saveConversation(conv)
        return `Details reset kar di gayi hain. Nayi booking ke liye *1* (Khargone ➔ Indore) ya *2* (Indore ➔ Khargone) reply karein.`
      }

      if (upper === '3' || upper === 'CANCEL') {
        conv.state = 'IDLE'
        conv.step = 1
        conv.data = {}
        await saveConversation(conv)
        return `Booking request cancel kar di gayi hai. Kabhi bhi nayi booking ke liye *HI* bhejein.`
      }

      return `Kripya reply karein:\n*1* - Confirm & Pay ₹500 Advance\n*2* - Edit Details\n*3* - Cancel`
    }

    case 'AWAITING_PAYMENT': {
      if (upper === 'PAID' || upper === 'PAYMENT DONE') {
        return `Aapke payment ka server verification ho raha hai. Jaise hi Razorpay se webhook confirm hoga, aapko instant confirmation mil jayegi!`
      }
      if (upper === 'CANCEL') {
        conv.state = 'IDLE'
        conv.step = 1
        conv.data = {}
        await saveConversation(conv)
        return `Aapki pending payment booking cancel kar di gayi hai.`
      }

      return `Aapki booking create ho chuki hai. Advance pay karne ke liye iss link par click karein:\n${conv.data.payment_link}\n\nPayment complete hone par aapko automatic WhatsApp confirmation message prapt hoga.`
    }

    default: {
      conv.state = 'IDLE'
      conv.step = 1
      await saveConversation(conv)
      return `Welcome to MarutiCab! Nayi cab book karne ke liye *1* (Khargone ➔ Indore) ya *2* (Indore ➔ Khargone) reply karein.`
    }
  }
}

/**
 * Builds Step 7 Booking Summary Message with Dynamic Matching Deadline
 */
async function buildSummaryMessage(conv: ConversationState): Promise<string> {
  const isKI = conv.data.direction === 'KI'
  const routeName = isKI ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'
  const fare = conv.data.total_fare || (isKI ? 2200 : 1800)
  const advance = 500
  const balance = fare - advance

  return `🚕 *MarutiCab Booking Summary*

📍 *Route:* ${routeName}
📅 *Date:* ${conv.data.travel_date}
⏰ *Pickup Time:* ${conv.data.pickup_time}
🏠 *Pickup:* ${conv.data.pickup_address}
🎯 *Drop:* ${conv.data.drop_address}
👥 *Passengers:* ${conv.data.passenger_count || 1} Person(s)
👤 *Passenger Name:* ${conv.data.customer_name}
📱 *WhatsApp Number:* +91 ${conv.phone}

💰 *Fare Breakdown:*
• Total Fixed Fare: *₹${fare.toLocaleString('en-IN')}* (Tolls Included)
• Advance to Reserve: *₹${advance}*
• Remaining in Cab: *₹${balance.toLocaleString('en-IN')}* (To driver)

⏱️ *Matching Deadline:*
*${conv.data.matching_deadline_kolkata || 'Applicable Cutoff'}*

💡 *Refund Policy:*
Booking submit karne ke liye ₹500 advance zaroori hai. Agar deadline tak suitable return-ride match nahi milta hai, to booking cancel ho jayegi aur aapka poora ₹500 refund bina kisi deduction ke initiate ho jayega.

*Kya sabhi details sahi hain?*
1️⃣ *Confirm & Pay ₹500 Advance*
2️⃣ *Edit Details*
3️⃣ *Cancel*

Reply with *1* to proceed.`
}

/**
 * Creates Razorpay payment link and stores pending booking record
 */
async function handleCreatePaymentLinkAndBooking(conv: ConversationState): Promise<string> {
  const db = createServiceClient()
  const isKI = conv.data.direction === 'KI'
  const fare = conv.data.total_fare || (isKI ? 2200 : 1800)
  const advance = 500
  const balance = fare - advance
  const bookingRef = `KC${Math.floor(10000 + Math.random() * 90000)}`
  const publicToken = crypto.randomUUID().replace(/-/g, '')

  // Re-evaluate rule snapshot
  const ruleResult = await evaluateBookingLeadTime(
    conv.data.travel_date!,
    conv.data.pickup_time!,
    new Date()
  )

  // 1. Create booking in Supabase
  const { data: newBooking, error: bookingErr } = await db
    .from('bookings')
    .insert({
      booking_ref: bookingRef,
      booking_number: bookingRef,
      direction: conv.data.direction,
      mode: 'match',
      vehicle: 'economy_sedan',
      vehicle_type: 'sedan',
      drop_point: 'rajendra',
      drop_name: conv.data.drop_address || 'City Point',
      address: `Pickup: ${conv.data.pickup_address} | Drop: ${conv.data.drop_address}`,
      travel_date: conv.data.travel_date,
      pickup_time: conv.data.pickup_time,
      passenger_name: conv.data.customer_name,
      phone: conv.phone,
      passenger_count: conv.data.passenger_count || 1,
      base_fare: fare,
      total_fare: fare,
      advance_amount: advance,
      advance_paid: 0,
      balance_amount: balance,
      status: 'pending_payment',
      matching_deadline: ruleResult.matchingDeadline.toISOString(),
      booking_category: ruleResult.ruleCode,
      rule_version_snapshot: ruleResult.ruleSnapshot,
      public_token: publicToken,
      extras: {
        pickup_address: conv.data.pickup_address,
        drop_address: conv.data.drop_address,
        created_via: 'whatsapp_bot',
      },
    })
    .select('id,booking_ref')
    .single()

  if (bookingErr || !newBooking) {
    console.error('Failed to insert booking:', bookingErr)
    return `Kripya dobara koshish karein. Booking record create nahi ho paya.`
  }

  // 2. Generate Razorpay Payment Link
  let paymentUrl = `https://maruticab.in/pay?booking=${bookingRef}&amount=500`
  try {
    const linkResult = await createRazorpayPaymentLink({
      amount: advance,
      description: `MarutiCab Advance Booking #${bookingRef}`,
      referenceId: `adv_${newBooking.id.slice(0, 30)}`,
      customer: {
        name: conv.data.customer_name || 'Passenger',
        contact: `+91${conv.phone}`,
      },
      callbackUrl: `https://maruticab.in/booking/${publicToken}`,
      notes: {
        booking_id: newBooking.id,
        booking_ref: bookingRef,
        phone: conv.phone,
      },
    })
    if (linkResult?.short_url) {
      paymentUrl = linkResult.short_url
    }
  } catch (payErr) {
    console.warn('Razorpay live link creation failed, using web portal link:', payErr)
  }

  conv.state = 'AWAITING_PAYMENT'
  conv.step = 8
  conv.data.booking_id = newBooking.id
  conv.data.booking_ref = bookingRef
  conv.data.payment_link = paymentUrl
  await saveConversation(conv)

  // 3. Dispatch Native In-Chat WhatsApp Payment (MarutiCabRazorpay UPI)
  try {
    await sendInChatPaymentOrder({
      to: conv.phone,
      amountInRs: advance,
      bookingRef,
      bookingId: newBooking.id,
      customerName: conv.data.customer_name || 'Passenger',
      routeName: isKI ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone',
      travelDate: conv.data.travel_date || '',
      pickupTime: conv.data.pickup_time || '',
    })
  } catch (inChatErr) {
    console.warn('In-chat payment order dispatch error:', inChatErr)
  }

  // 4. Send Template 1: booking_received
  await sendWhatsAppTemplateMessage({
    toPhone: conv.phone,
    templateCode: 'booking_received',
    variables: [
      conv.data.customer_name || 'Passenger',
      bookingRef,
      isKI ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone',
      conv.data.travel_date || '',
      conv.data.pickup_time || '',
    ],
    bookingId: newBooking.id,
  })

  return `💳 *Aapki Booking Request Saved (#${bookingRef})*

Ride reserve karne ke liye ₹500 advance pay karein:
• Upar diye gaye *"Review and Pay"* card par click karke WhatsApp me hi UPI (GPay / PhonePe / Paytm) se pay karein.
• Ya iss direct link se pay karein:
🔗 *Payment Link:* ${paymentUrl}

⚠️ *Zaroori:* Payment verify hone ke baad hi hamara matching engine return ride match karega. Agar deadline tak match nahi milta, to full ₹500 turant refund ho jayega.`
}
