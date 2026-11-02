import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { authorizeAdminRequest } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request)
  if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const db = createServiceClient()
  const bookingId = request.nextUrl.searchParams.get('booking_id')
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const [messagesResult, failuresResult, successResult, webhookResult, notificationResult] = await Promise.all([
    db.from('inbound_messages').select('id,wa_message_id,wa_id,text,message_type,received_at,booking_id').order('received_at', { ascending: false }).limit(50),
    db.from('notifications').select('id').eq('status', 'failed').gte('created_at', since),
    db.from('notifications').select('sent_at').in('status', ['sent', 'delivered', 'read']).order('sent_at', { ascending: false }).limit(1),
    db.from('whatsapp_webhook_events').select('received_at').order('received_at', { ascending: false }).limit(1),
    bookingId
      ? db.from('notifications').select('id,template,status,created_at,sent_at,error,recipient_type').eq('booking_id', bookingId).order('created_at', { ascending: false }).limit(50)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (messagesResult.error || failuresResult.error || successResult.error || webhookResult.error || notificationResult.error) {
    return NextResponse.json({ error: 'WhatsApp activity is unavailable. Apply the WhatsApp migration first.' }, { status: 503 })
  }
  const messages = (messagesResult.data || []).map((message: any) => ({
    ...message,
    text: String(message.text || '').replace(/(?:\+?91[\s-]?)?[6-9](?:[\s-]?\d){9}/g, (match) => `••••••${match.replace(/\D/g, '').slice(-2)}`),
    maskedPhone: `${String(message.wa_id).slice(0, 4)}••••${String(message.wa_id).slice(-2)}`,
    replyUrl: `https://wa.me/${message.wa_id}`,
  }))
  return NextResponse.json({
    messages,
    notifications: notificationResult.data || [],
    health: {
      lastSuccessfulSend: successResult.data?.[0]?.sent_at || null,
      failedLast24Hours: failuresResult.data?.length || 0,
      lastWebhookReceived: webhookResult.data?.[0]?.received_at || null,
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
