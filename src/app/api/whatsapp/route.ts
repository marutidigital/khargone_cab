// src/app/api/whatsapp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { sendTextMessage, formatIncomingMessage } from '@/lib/whatsapp'
import { chatWithGemini, extractBookingAction } from '@/lib/gemini'
import type { WhatsAppMessage } from '@/types'

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!

// GET — webhook verification by Meta
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified')
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// POST — incoming messages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const msg  = formatIncomingMessage(body)

    // Always respond 200 to Meta first
    if (!msg) return NextResponse.json({ status: 'ok' })

    const { phone, text } = msg
    const supabase = createServiceClient()

    // Load or create session
    const { data: session } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('phone', phone)
      .single()

    const history: WhatsAppMessage[] = session?.messages ?? []

    // Add user message to history
    const userMsg: WhatsAppMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    history.push(userMsg)

    // Get Gemini response
    const aiReply = await chatWithGemini(phone, text, history.slice(-20)) // last 20 messages

    // Check if Gemini wants to place a booking
    const action = extractBookingAction(aiReply)
    let finalReply = aiReply

    if (action && (action as any).action === 'book') {
      // Call our own bookings API
      try {
        const bookData = (action as any).data
        const baseUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
        const bookRes  = await fetch(`${baseUrl}/api/bookings`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ ...bookData, phone }),
        })
        const bookJson = await bookRes.json()
        if (bookJson.booking) {
          const b = bookJson.booking
          finalReply = bookJson.matched
            ? `✅ *Booking Confirmed!*\n\nRef: *${b.booking_ref}*\nA match was found — your cab is confirmed.\n\nDate: ${b.travel_date} · ${b.pickup_time}\nAmount: ₹${b.total_fare.toLocaleString('en-IN')}\n\nDriver details will be shared 2 hrs before pickup.`
            : `⏳ *Booking Placed!*\n\nRef: *${b.booking_ref}*\nWaiting for a passenger from the opposite direction. You'll be notified when matched.\n\nDate: ${b.travel_date} · ${b.pickup_time}\nAmount: ₹${b.total_fare.toLocaleString('en-IN')}`
        }
      } catch (e) {
        console.error('WhatsApp booking action error:', e)
        finalReply = "Sorry, I couldn't place the booking right now. Please try again or visit our website."
      }
    }

    // Add assistant response to history
    const assistantMsg: WhatsAppMessage = {
      role: 'assistant',
      content: finalReply,
      timestamp: new Date().toISOString(),
    }
    history.push(assistantMsg)

    // Upsert session
    await supabase.from('whatsapp_sessions').upsert({
      phone,
      messages: history.slice(-40), // keep last 40 messages
      last_active: new Date().toISOString(),
    }, { onConflict: 'phone' })

    // Send reply
    await sendTextMessage({ to: phone, text: finalReply })

    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('WhatsApp webhook error:', err)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
