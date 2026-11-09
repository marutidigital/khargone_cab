import { NextRequest, NextResponse } from 'next/server'
import crypto, { randomBytes } from 'node:crypto'
import Razorpay from 'razorpay'
import { getRazorpayCredentials } from '@/lib/razorpay'
import { createServiceClient } from '@/lib/supabase-server'
import {
  calculateBookingFare,
  getMatchCutoffAt,
  isMatchDealWithinWindow,
  parsePickupDateTime,
  type DropPointId,
} from '@/lib/config'
import { PRICING_CONFIG } from '@/config/pricing'

export async function POST(req: NextRequest) {
  try {
    const { keyId, keySecret } = getRazorpayCredentials()

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: 'Razorpay API credentials are not configured.' },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { amount, currency = 'INR', receipt, notes, bookingData } = body

    // Calculate paise amount (at least 100 paise = ₹1.00)
    let numAmount = Number(amount)
    if (Number.isFinite(numAmount) && numAmount >= 1 && numAmount < 100) {
      numAmount = Math.round(numAmount * 100)
    }

    if (!Number.isFinite(numAmount) || numAmount < 100) {
      return NextResponse.json(
        { error: 'Amount is required and must be at least 100 paise (Rs 1.00).' },
        { status: 400 }
      )
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })

    const db = createServiceClient()

    // ── FIX A: PRE-INSERT BOOKING IN 'pending_payment' STATUS BEFORE RAZORPAY ORDER CREATION ──
    let createdBooking: any = null

    if (bookingData) {
      const directionCode = bookingData.direction === 'K2I' ? 'KI' : 'IK'
      const pointId = (bookingData.point || 'rajendra') as DropPointId
      const pickupTime = bookingData.time || '10:00'
      const travelDate = bookingData.date

      const fare = calculateBookingFare({
        mode: 'match',
        direction: bookingData.direction,
        point: pointId,
        pickupTime,
      })

      const advanceRupees = Math.round(numAmount / 100)
      const idempotencyKey = bookingData.idempotencyKey || `idem_${Date.now()}_${randomBytes(8).toString('hex')}`

      // Check if booking already exists for this idempotency key
      const { data: existingBookings } = await db
        .from('bookings')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .limit(1)

      if (existingBookings && existingBookings.length > 0) {
        const prior = existingBookings[0]
        if (['waiting', 'matched', 'confirmed'].includes(prior.status)) {
          return NextResponse.json({
            order_id: prior.extras?.razorpay_order_id,
            id: prior.extras?.razorpay_order_id,
            booking_id: prior.id,
            booking_ref: prior.booking_ref,
            public_token: prior.public_token,
            amount: numAmount,
            currency: currency.toUpperCase(),
            status: 'already_confirmed',
          })
        }
        // If existing is still pending_payment, reuse it
        createdBooking = prior
      }

      if (!createdBooking) {
        const token = randomBytes(32).toString('base64url')
        const now = new Date()
        const cutoffAt = getMatchCutoffAt(travelDate, pickupTime, now)
        const dropName =
          PRICING_CONFIG.points.find((entry) => entry.id === pointId)?.name || pointId

        const { data: newBooking, error: insertError } = await db
          .from('bookings')
          .insert({
            direction: directionCode,
            mode: 'match',
            vehicle: 'economy_sedan',
            vehicle_type: 'sedan',
            drop_point: pointId,
            drop_name: dropName,
            travel_date: travelDate,
            pickup_time: pickupTime,
            passenger_name: (bookingData.name || 'Passenger').trim(),
            phone: (bookingData.phone || '').trim(),
            email: bookingData.email?.trim() || null,
            passenger_count: Number(bookingData.passengers) || 1,
            address: bookingData.address?.trim() || null,
            consent_whatsapp: true,
            consent_at: new Date().toISOString(),
            consent_text:
              'I agree to receive WhatsApp updates about this booking and accept the Terms and Refund Policy.',
            base_fare: fare.baseFare,
            discount: bookingData.couponCode ? (advanceRupees === 2 ? 498 : 495) : 0,
            night_extra: fare.nightSurcharge,
            total_fare: fare.totalFare,
            advance_amount: advanceRupees,
            advance_paid: 0, // initially 0 until payment webhook/verification confirms
            balance_amount: fare.totalFare,
            is_night: fare.nightSurcharge > 0,
            status: 'pending_payment',
            refund_status: 'pending',
            cutoff_at: cutoffAt,
            public_token: token,
            idempotency_key: idempotencyKey,
            extras: {
              drop_point_extra: fare.dropPointExtra,
              night_surcharge: fare.nightSurcharge,
              coupon_code: bookingData.couponCode || null,
              ...(bookingData.confirmedRideId ? { confirmed_ride_id: bookingData.confirmedRideId } : {}),
              ...(bookingData.matchedWithBookingId ? { matched_with_booking_id: bookingData.matchedWithBookingId } : {}),
            },
          })
          .select('*')
          .single()

        if (insertError) {
          if (insertError.code === '23505') {
            return NextResponse.json(
              { error: 'There is already an active confirmed booking for this phone number on that date.' },
              { status: 409 }
            )
          }
          console.error('Failed to pre-insert pending_payment booking:', insertError)
          return NextResponse.json(
            { error: 'Could not initialize booking reservation. Please try again.' },
            { status: 500 }
          )
        }
        createdBooking = newBooking
      }
    }

    const orderReceipt = receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    // Build notes embedding booking_id and booking_ref so webhook NEVER misses attribution!
    const orderNotes: Record<string, string> = {
      ...(notes || {}),
      ...(createdBooking
        ? {
            booking_id: String(createdBooking.id),
            booking_ref: String(createdBooking.booking_ref),
            passenger_name: String(createdBooking.passenger_name),
            passenger_phone: String(createdBooking.phone),
            route: createdBooking.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone',
            travel_date: String(createdBooking.travel_date),
            ...(createdBooking.extras?.matched_with_booking_id
              ? { matched_with_booking_id: String(createdBooking.extras.matched_with_booking_id) }
              : {}),
          }
        : {}),
    }

    const order = await razorpay.orders.create({
      amount: Math.round(numAmount),
      currency: currency.toUpperCase(),
      receipt: orderReceipt,
      notes: orderNotes,
    })

    // Update booking extras with razorpay_order_id
    if (createdBooking) {
      await db
        .from('bookings')
        .update({
          extras: {
            ...(createdBooking.extras || {}),
            razorpay_order_id: order.id,
          },
        })
        .eq('id', createdBooking.id)
    }

    return NextResponse.json({
      order_id: order.id,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
      booking_id: createdBooking?.id || null,
      booking_ref: createdBooking?.booking_ref || null,
      public_token: createdBooking?.public_token || null,
      key_id: keyId,
    })
  } catch (error: any) {
    console.error('Razorpay create-order error:', error)
    return NextResponse.json(
      {
        error: error?.message || error?.description || 'Failed to create Razorpay order.',
      },
      { status: 500 }
    )
  }
}
