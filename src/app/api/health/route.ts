import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

const PLACEHOLDER_PATTERN = /(dummy|placeholder|replace[_-]?me|your[_-]|x{4,}|example)/i

function configured(name: string, minimumLength = 12) {
  const value = process.env[name]?.trim() ?? ''
  return value.length >= minimumLength && !PLACEHOLDER_PATTERN.test(value)
}

export async function GET() {
  let database = false
  try {
    const check = await Promise.race([
      createServiceClient().from('bookings').select('id').limit(1),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 5000)),
    ])
    database = !check.error
  } catch {
    database = false
  }

  const checks = {
    database,
    whatsapp: configured('WHATSAPP_PHONE_NUMBER_ID', 6) && configured('WHATSAPP_ACCESS_TOKEN', 30),
    whatsappWebhook: configured('WHATSAPP_VERIFY_TOKEN') && configured('WHATSAPP_APP_SECRET', 24),
    email: configured('RESEND_API_KEY', 20),
    ai: configured('GEMINI_API_KEY', 30),
  }
  const ready = checks.database && checks.whatsapp && checks.whatsappWebhook

  return NextResponse.json({
    status: ready ? 'ready' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  }, { status: ready ? 200 : 503 })
}
