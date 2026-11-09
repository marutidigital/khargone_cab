import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { refundRazorpayPayment } from '@/lib/razorpay'
import { notify, notifyAdmin } from '@/lib/booking-notifications'
import { sendBookingAutomation } from '@/lib/whatsapp-automation'
import { isAutoRefundDue, isCutoffExpired } from '@/lib/config'

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`)
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Automated booking cancellation and refunds disabled per policy.
  // All cancellations, pairings, and refunds are handled manually by Admin.
  return NextResponse.json({
    message: 'Automated booking cancellation is disabled. All actions are handled manually by Admin in the Admin Panel.',
    cutoffCount: 0,
    refunded: 0,
  })
}
