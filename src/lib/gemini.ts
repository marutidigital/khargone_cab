// src/lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { WhatsAppMessage } from '@/types'
import { POINTS, BASE_FARE, NIGHT_EXTRA, getDiscount } from './constants'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_gemini_key')

const SYSTEM_PROMPT = `You are the booking assistant for KC / Khargone Cabs. You help customers book shared cab rides between Khargone and Indore.

ABOUT THE SERVICE:
- Route: Khargone ↔ Indore (shared cab, full Dzire AC)
- 1–4 passengers per cab
- Base fare: ₹2,000 (Khargone to/from Rajendra Nagar, Indore)
- Drop points in Indore: Rajendra Nagar (base), Railway Station (+₹200 = ₹2,200), Airport (+₹300 = ₹2,300)
- Night surcharge: +₹300 for pickups 10 PM – 5 AM
- Early booking discounts: 2 days ahead = −₹100, 3 days = −₹200, 4+ days = −₹300
- Match system: bookings in opposite directions get instantly confirmed when matched
- Driver details shared 2 hours before pickup

YOUR ROLE:
- Answer questions about routes, fares, timings, policies
- Help collect booking info: direction, drop point, date, time, name, phone
- When you have all booking details, respond with a JSON block: {"action":"book","data":{...}}
- Be friendly, brief, and helpful. Write in simple English (customers may speak Hindi too, respond in kind if they do)
- Format fares in Indian format (₹2,000 not 2000)
- Don't invent information. If unsure, say so.

BOOKING FLOW:
1. Ask direction (Khargone→Indore or Indore→Khargone)
2. Ask drop/pickup point in Indore (Rajendra Nagar, Railway Station, Airport)
3. Ask travel date (day/month or full date)
4. Ask pickup time (morning/afternoon/evening/night or specific time)
5. Ask name
6. Ask 10-digit mobile number
7. Confirm all details and output the JSON action

Keep messages SHORT — this is WhatsApp, not email.`

export async function chatWithGemini(
  phone: string,
  userMessage: string,
  history: WhatsAppMessage[]
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  // Build Gemini chat history format
  const geminiHistory = history.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const chat = model.startChat({
    history: geminiHistory,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      maxOutputTokens: 500,
      temperature: 0.7,
    },
  })

  const result = await chat.sendMessage(userMessage)
  return result.response.text()
}

export function extractBookingAction(text: string): object | null {
  try {
    const match = text.match(/\{[\s\S]*"action"\s*:\s*"book"[\s\S]*\}/)
    if (!match) return null
    return JSON.parse(match[0])
  } catch {
    return null
  }
}
