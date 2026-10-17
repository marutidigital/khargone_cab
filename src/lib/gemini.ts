// src/lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { WhatsAppMessage } from '@/types'
import { PRICING_CONFIG, formatRs } from '@/config/pricing'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_gemini_key')

const SYSTEM_PROMPT = `You are the booking assistant for Hanscab (hanscab.in). You help customers book private cab rides between Khargone and Indore.

ABOUT THE SERVICE:
- Brand: Hanscab (hanscab.in)
- Route: Khargone ↔ Indore (private cab, dedicated AC car)
- Sedan (Dzire/Amaze, 4 passengers): Base fare Rs 1,800
- SUV (Ertiga/Innova, 6 passengers): Base fare Rs 2,400
- Indore locations: Rajendra Nagar (+Rs 0), Bhawarkua (+Rs 0), Rajwada (+Rs 100), Railway Station (+Rs 200), Airport (+Rs 300)
- Khargone hub: Khargone Bus Stand
- Indore ➔ Khargone discount: Rs 200 auto-applied discount
- Night surcharge: +Rs 300 for pickups 10 PM – 4:59 AM
- Advance deposit: Rs 500 to reserve car, balance paid directly to driver in car
- Driver calls 30 minutes before pickup

YOUR ROLE:
- Answer questions about routes, fares, timings, policies
- Help collect booking info: direction, pickup/drop point, date, time, name, phone
- When you have all booking details, respond with a JSON block: {"action":"book","data":{...}}
- Be friendly, brief, and helpful. Write in simple English or Hindi if the customer prefers.
- Format fares in Indian format (Rs 1,800 or ₹1,800)
- Don't invent information. If unsure, say so.

The JSON must use this exact shape and machine-readable values:
{"action":"book","data":{"direction":"KI","drop_point":"airport","travel_date":"2026-10-20","pickup_time":"09:30","passenger_name":"Customer Name","vehicle":"sedan"}}
- direction: KI for Khargone→Indore, IK for Indore→Khargone
- drop_point: rajendra, bhawarkua, rajwada, railway, or airport
- travel_date: YYYY-MM-DD
- pickup_time: 24-hour HH:MM
- vehicle: sedan or suv

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
