// src/lib/whatsapp-conversation.ts
// Intelligent WhatsApp Conversational AI Assistant Controller for MarutiCab
// Integrates Multi-turn Memory + OpenAI Assistant + Dynamic Booking Engine

import { createServiceClient } from '@/lib/supabase-server'
import { sendWhatsAppTemplateMessage } from '@/lib/whatsapp-templates'
import { handleWhatsAppAIConversation, type AIChatbotOutput } from '@/lib/whatsapp-ai-assistant'

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
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
    [key: string]: unknown
  }
  last_message_at: string
}

/**
 * Loads conversation state from Supabase whatsapp_conversations
 */
export async function getConversation(phone: string): Promise<ConversationState> {
  const db = createServiceClient()
  const cleanPhone = phone.replace(/\D/g, '').slice(-10)

  try {
    const { data } = await db
      .from('whatsapp_conversations')
      .select('*')
      .eq('phone', cleanPhone)
      .single()

    if (data) {
      return {
        phone: data.phone,
        state: data.state || 'IDLE',
        step: Number(data.step) || 1,
        data: (data.data as Record<string, unknown>) || {},
        last_message_at: data.last_message_at || new Date().toISOString(),
      }
    }
  } catch (err) {
    console.warn('[whatsapp-conversation] getConversation warning:', err)
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
  try {
    const { error: upsertErr } = await db
      .from('whatsapp_conversations')
      .upsert(
        {
          phone: conv.phone,
          state: conv.state,
          step: conv.step,
          data: conv.data,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'phone' }
      )
    if (upsertErr) console.warn('[whatsapp-conversation] saveConversation warning:', upsertErr)
  } catch (err) {
    console.warn('[whatsapp-conversation] saveConversation exception:', err)
  }
}

/**
 * Main WhatsApp Conversational Inbound Controller
 */
export async function processWhatsAppInbound(
  fromPhone: string,
  messageText: string,
  senderName?: string
): Promise<AIChatbotOutput | string> {
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
      await db
        .from('bookings')
        .update({
          status: 'cancelled',
          refund_status: willRefund ? 'pending' : 'not_applicable',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          extras: {
            ...(target.extras || {}),
            cancelled_via: 'whatsapp_conversation',
          },
        })
        .eq('id', target.id)

      if (willRefund) {
        try {
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
        } catch (tplErr) {
          console.warn('[whatsapp-conversation] refund_initiated template notice:', tplErr)
        }
      }

      conv.state = 'IDLE'
      conv.step = 1
      conv.data = {}
      await saveConversation(conv)

      return {
        replyText: `✅ *Aapki Booking (#${target.booking_ref}) Cancel Kar Di Gayi Hai.*\n\n${
          willRefund
            ? '💰 Paid Advance ₹500 ka refund initiate kar diya gaya hai (5-7 working days me aapke original account me credit ho jayega).'
            : 'Is booking ke liye koi advance payment charge nahi hui thi.'
        }\n\nAgar aap dobara cab book karna chahte hain, to neeche button dabayein:`,
        buttons: [
          { id: 'BTN_ROUTE_KI', title: '🚕 Khargone ➔ Indore' },
          { id: 'BTN_ROUTE_IK', title: '🚖 Indore ➔ Khargone' },
          { id: 'BTN_SUPPORT', title: '📞 Support Desk' },
        ],
      }
    } else {
      return {
        replyText: `Aapke number (${cleanPhone}) par koi active booking nahi mili. Nayi booking ke liye route select karein:`,
        buttons: [
          { id: 'BTN_ROUTE_KI', title: '🚕 Khargone ➔ Indore' },
          { id: 'BTN_ROUTE_IK', title: '🚖 Indore ➔ Khargone' },
        ],
      }
    }
  }

  // Delegate all conversational queries, button replies, FAQs, and booking flows to OpenAI AI Assistant
  return await handleWhatsAppAIConversation(fromPhone, messageText, senderName)
}
