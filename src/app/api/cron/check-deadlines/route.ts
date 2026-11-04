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
  const db = createServiceClient()
  const now = new Date()
  const nowIso = now.toISOString()

  try {
    // 1. Fetch all bookings that are waiting for match and whose matching_deadline has passed
    const { data: expiredBookings, error: fetchErr } = await db
      .from('bookings')
      .select('*')
      .eq('status', 'waiting')
      .is('match_id', null)
      .lte('matching_deadline', nowIso)
      .limit(25)

    if (fetchErr) {
      console.error('Error fetching expired bookings:', fetchErr)
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
    }

    if (!expiredBookings || expiredBookings.length === 0) {
      return NextResponse.json({
        checked_at: nowIso,
        expired_count: 0,
        message: 'No expired bookings awaiting cancellation.',
      })
    }

    const results: Array<{
      bookingRef: string
      action: string
      refundId?: string
      refundStatus: string
      error?: string
    }> = []

    // 2. Process each expired booking atomically
    for (const booking of expiredBookings) {
      const hasAdvance = Number(booking.advance_paid || 0) > 0

      // Concurrency lock: atomically set status = 'cancelled', refund_status = 'processing'
      const { data: updatedBooking, error: updateErr } = await db
        .from('bookings')
        .update({
          status: 'cancelled',
          refund_status: hasAdvance ? 'processing' : 'not_applicable',
          cancelled_at: nowIso,
          updated_at: nowIso,
          extras: {
            ...(booking.extras || {}),
            auto_cancelled_by_deadline_checker: true,
            cancelled_at: nowIso,
          },
        })
        .eq('id', booking.id)
        .eq('status', 'waiting') // Ensures atomic condition
        .select('id,booking_ref')
        .single()

      if (updateErr || !updatedBooking) {
        // Already processed by concurrent worker
        continue
      }

      if (!hasAdvance) {
        results.push({
          bookingRef: booking.booking_ref,
          action: 'cancelled_no_advance',
          refundStatus: 'not_applicable',
        })
        continue
      }

      // 3. Initiate ₹500 Razorpay Refund
      const idempotencyKey = `auto_refund_${booking.id}_${Date.now()}`
      let paymentId = booking.extras?.razorpay_payment_id

      if (!paymentId) {
        const { data: payRow } = await db
          .from('payments')
          .select('provider_payment_id')
          .eq('booking_id', booking.id)
          .eq('payment_status', 'captured')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        paymentId = payRow?.provider_payment_id
      }

      // Create refund record in public.refunds
      const { data: refundRecord } = await db
        .from('refunds')
        .insert({
          booking_id: booking.id,
          amount: Number(booking.advance_paid || 500),
          refund_status: 'requested',
          idempotency_key: idempotencyKey,
          initiated_at: nowIso,
        })
        .select('id')
        .single()

      if (!paymentId) {
        // Advance marked paid but no provider payment ID found
        await db.from('refunds').update({
          refund_status: 'failed',
          failure_reason: 'Missing Razorpay payment ID for refund',
        }).eq('id', refundRecord?.id)

        await db.from('bookings').update({ refund_status: 'failed' }).eq('id', booking.id)

        await notifyAdmin(
          `refund_fail_missing_id:${booking.id}`,
          booking.id,
          `CRITICAL: Automatic refund failed for booking ${booking.booking_ref}. Missing Razorpay payment ID. Process manually.`
        )

        results.push({
          bookingRef: booking.booking_ref,
          action: 'refund_failed',
          refundStatus: 'failed',
          error: 'Missing Razorpay payment ID',
        })
        continue
      }

      try {
        // Call Razorpay Refund API
        const refundResult = await refundRazorpayPayment(
          paymentId,
          Number(booking.advance_paid || 500),
          idempotencyKey
        )

        const isSuccess = refundResult.status === 'processed' || refundResult.status === 'submitted'

        // Update public.refunds
        await db.from('refunds').update({
          refund_status: isSuccess ? 'processed' : 'processing',
          provider_refund_id: refundResult.id,
          processed_at: isSuccess ? new Date().toISOString() : null,
        }).eq('id', refundRecord?.id)

        // Update bookings
        await db.from('bookings').update({
          refund_status: isSuccess ? 'processed' : 'processing',
        }).eq('id', booking.id)

        // Dispatch Template 4: refund_initiated via WhatsApp!
        await sendWhatsAppTemplateMessage({
          toPhone: booking.phone,
          templateCode: 'refund_initiated',
          variables: [
            booking.passenger_name || 'Passenger',
            booking.booking_ref,
            refundResult.id || idempotencyKey,
          ],
          bookingId: booking.id,
        })

        // Notify Admin
        await notifyAdmin(
          `auto_refund_success:${booking.id}`,
          booking.id,
          `✅ Auto-Refund Initiated for ${booking.booking_ref} (₹${booking.advance_paid}): Deadline passed with no match. Razorpay Refund ID: ${refundResult.id}`
        )

        results.push({
          bookingRef: booking.booking_ref,
          action: 'refund_initiated',
          refundId: refundResult.id,
          refundStatus: refundResult.status,
        })
      } catch (refundError: any) {
        console.error(`Refund failed for ${booking.booking_ref}:`, refundError)

        await db.from('refunds').update({
          refund_status: 'failed',
          failure_reason: refundError?.message || 'Razorpay API refund failure',
        }).eq('id', refundRecord?.id)

        await db.from('bookings').update({
          refund_status: 'failed',
        }).eq('id', booking.id)

        // Alert Admin
        await notifyAdmin(
          `auto_refund_failed:${booking.id}`,
          booking.id,
          `🚨 URGENT: Automatic ₹500 refund failed for booking ${booking.booking_ref}. Error: ${refundError?.message}. Retry from Admin panel.`
        )

        results.push({
          bookingRef: booking.booking_ref,
          action: 'refund_failed',
          refundStatus: 'failed',
          error: refundError?.message,
        })
      }
    }

    return NextResponse.json({
      checked_at: nowIso,
      expired_count: expiredBookings.length,
      processed: results,
    })
  } catch (globalErr: any) {
    console.error('Deadline checker global error:', globalErr)
    return NextResponse.json({ error: globalErr?.message || 'Server error' }, { status: 500 })
  }
}
