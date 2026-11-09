// src/app/api/cron/check-deadlines/route.ts
// Automatic Deadline Checker & Razorpay Refund System for MarutiCab
// Runs periodically (cron/n8n/webhook): cancels unmatched rides whose deadline passed & initiates automatic ₹500 Razorpay refund.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { refundRazorpayPayment } from '@/lib/razorpay'
import { sendWhatsAppTemplateMessage } from '@/lib/whatsapp-templates'
import { notifyAdmin } from '@/lib/booking-notifications'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return handleDeadlineCheck(request)
}

export async function POST(request: NextRequest) {
  return handleDeadlineCheck(request)
}

async function handleDeadlineCheck(request: NextRequest) {
  // Automated booking cancellation and auto-refunds disabled per user policy.
  // All cancellations and refunds are handled manually by Admin.
  return NextResponse.json({
    status: 'disabled',
    message: 'Automated booking cancellation is disabled. All cancellations and refunds are performed manually by Admin in the Admin Panel.',
    expired_count: 0,
  })
}

