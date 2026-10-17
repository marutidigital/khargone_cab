// src/app/api/leads/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  PRICING_CONFIG,
  DEFAULT_PRICING_CONFIG,
  computeFare,
  formatRs,
  PricingFormulaConfig,
} from '@/config/pricing'

// Initialize Supabase with Anon key (Never service_role)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// In-memory rate limiting stores (IP & Phone)
const ipRateMap = new Map<string, number[]>()
const phoneRateMap = new Map<string, number[]>()

function checkRateLimit(ip: string, phone: string): { allowed: boolean; reason?: string } {
  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000
  const oneDayAgo = now - 24 * 60 * 60 * 1000

  // 1. IP Rate limit: max 20 per IP per hour
  const ipTimestamps = (ipRateMap.get(ip) || []).filter((t) => t > oneHourAgo)
  if (ipTimestamps.length >= 20) {
    return { allowed: false, reason: 'Too many requests from this network. Please try again later.' }
  }
  ipTimestamps.push(now)
  ipRateMap.set(ip, ipTimestamps)

  // 2. Phone Rate limit: max 5 leads per phone per day
  const phoneTimestamps = (phoneRateMap.get(phone) || []).filter((t) => t > oneDayAgo)
  if (phoneTimestamps.length >= 5) {
    return { allowed: false, reason: 'Maximum booking requests reached for this mobile number today.' }
  }
  phoneTimestamps.push(now)
  phoneRateMap.set(phone, phoneTimestamps)

  return { allowed: true }
}

// Generate random booking code: HC-4F7K
function generateBookingCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `HC-${code}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      phone,
      direction,
      vehicle,
      point,
      pickup_at,
      passengers,
      consent,
      source,
    } = body

    // 1. Consent Validation
    if (!consent) {
      return NextResponse.json(
        { error: 'Consent to be contacted on WhatsApp is required.' },
        { status: 400 }
      )
    }

    // 2. Phone Validation: /^[6-9]\d{9}$/
    const cleanedPhone = (phone || '').replace(/\D/g, '').slice(-10)
    if (!/^[6-9]\d{9}$/.test(cleanedPhone)) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit Indian mobile number.' },
        { status: 400 }
      )
    }

    // 3. Direction & Vehicle Validation
    const dirNorm: 'K2I' | 'I2K' =
      direction === 'IK' || direction === 'I2K' ? 'I2K' : 'K2I'
    const vehNorm: 'sedan' | 'suv' = vehicle === 'suv' ? 'suv' : 'sedan'

    // 4. Rate Limiting Check
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'
    const rateCheck = checkRateLimit(ip, cleanedPhone)
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.reason }, { status: 429 })
    }

    // 5. Pickup Date & Lead Time Validation (minLeadHours ahead in Asia/Kolkata)
    if (!pickup_at) {
      return NextResponse.json({ error: 'Pickup date and time is required.' }, { status: 400 })
    }

    const pickupDate = new Date(pickup_at)
    if (isNaN(pickupDate.getTime())) {
      return NextResponse.json({ error: 'Invalid pickup date format.' }, { status: 400 })
    }

    const now = Date.now()
    const minLeadMs = PRICING_CONFIG.minLeadHours * 60 * 60 * 1000
    if (pickupDate.getTime() < now + minLeadMs - 5 * 60 * 1000) {
      return NextResponse.json(
        {
          error: `Pickup time must be at least ${PRICING_CONFIG.minLeadHours} hours from now.`,
        },
        { status: 400 }
      )
    }

    // 6. Duplicate Submission Block: same phone + same pickup_at within 10 minutes
    const tenMinAgo = new Date(now - 10 * 60 * 1000).toISOString()
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('id, booking_code, price')
      .eq('phone', cleanedPhone)
      .eq('pickup_at', pickup_at)
      .gte('created_at', tenMinAgo)
      .limit(1)

    if (existingLeads && existingLeads.length > 0) {
      const existing = existingLeads[0]
      const prefilledText = `Hi Hanscab, I have already submitted booking request *${existing.booking_code || 'HC-CONFIRM'}* for ${pickup_at}. Please connect.`
      const waUrl = `https://wa.me/${PRICING_CONFIG.contactWhatsApp}?text=${encodeURIComponent(prefilledText)}`

      return NextResponse.json({
        success: true,
        isDuplicate: true,
        booking_code: existing.booking_code,
        price: existing.price,
        whatsapp_url: waUrl,
        message: "Online payment is opening soon. We've saved your request and will connect you on WhatsApp.",
      })
    }

    // 7. Read pricing configuration from app_config table with fallback
    let pricingConfig: PricingFormulaConfig = DEFAULT_PRICING_CONFIG
    try {
      const { data: configData } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'pricing')
        .single()

      if (configData && configData.value) {
        pricingConfig = { ...DEFAULT_PRICING_CONFIG, ...configData.value }
      }
    } catch {
      // Use fallback DEFAULT_PRICING_CONFIG
    }

    // 8. Recompute price on SERVER (never trust client)
    const today = new Date()
    const daysAhead = Math.max(
      0,
      Math.ceil((pickupDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    )
    const pickupHour = pickupDate.getHours()

    const fareBreakdown = computeFare({
      direction: dirNorm,
      vehicle: vehNorm,
      pointIdOrName: point || 'Rajendra Nagar',
      daysAhead,
      hour: pickupHour,
      customConfig: pricingConfig,
    })

    // 9. Generate Booking Code
    const bookingCode = generateBookingCode()

    // 10. Check if user is already a known customer
    let isKnown = false
    try {
      const { data: prevLeads } = await supabase
        .from('leads')
        .select('id')
        .eq('phone', cleanedPhone)
        .neq('stage', 'pay_clicked')
        .limit(1)
      if (prevLeads && prevLeads.length > 0) isKnown = true
    } catch {
      // ignore
    }

    // 11. Insert row into Supabase table leads using anon key
    const sanitizedName = (name || '').trim().slice(0, 100) || null
    const sanitizedPoint = (point || 'Rajendra Nagar').trim().slice(0, 80)
    const sanitizedSource = (source || '').trim().slice(0, 50) || null

    const { data: insertedData, error: insertError } = await supabase
      .from('leads')
      .insert({
        booking_code: bookingCode,
        name: sanitizedName,
        phone: cleanedPhone,
        direction: dirNorm,
        vehicle: vehNorm,
        point: sanitizedPoint,
        pickup_at: pickup_at,
        passengers: Number(passengers) || 1,
        base_fare: fareBreakdown.dateFare,
        vehicle_extra: fareBreakdown.vehicleExtra,
        point_extra: fareBreakdown.pointExtra,
        night_extra: fareBreakdown.nightExtra,
        price: fareBreakdown.totalFare,
        stage: 'pay_clicked',
        source: sanitizedSource,
        is_known: isKnown,
        consent_whatsapp: true,
        notes: null,
      })
      .select()
      .single()

    if (insertError) {
      console.warn('Supabase lead insertion warning (proceeding with booking):', insertError.message || insertError)
    }

    // 12. Build WhatsApp Prefilled URL
    const routeLabel = dirNorm === 'K2I' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'
    const waText = [
      `*Hanscab Cab Request (${bookingCode})* 🚖`,
      `• *Name:* ${sanitizedName || 'Guest'}`,
      `• *Phone:* +91 ${cleanedPhone}`,
      `• *Route:* ${routeLabel}`,
      `• *Point:* ${sanitizedPoint}`,
      `• *Vehicle:* ${vehNorm === 'suv' ? 'Premium SUV (6 Pax)' : 'Economy Sedan (4 Pax)'}`,
      `• *Pickup:* ${new Date(pickup_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      `• *Total Price:* ${formatRs(fareBreakdown.totalFare)} (Advance: ${formatRs(fareBreakdown.advanceDeposit)}, Balance in car: ${formatRs(fareBreakdown.balanceFare)})`,
      ``,
      `Hi Hanscab, please share the payment link and confirm my cab request.`,
    ].join('\n')

    const whatsappUrl = `https://wa.me/${PRICING_CONFIG.contactWhatsApp}?text=${encodeURIComponent(waText)}`

    return NextResponse.json({
      success: true,
      booking_code: bookingCode,
      price: fareBreakdown.totalFare,
      advance_deposit: fareBreakdown.advanceDeposit,
      balance_fare: fareBreakdown.balanceFare,
      whatsapp_url: whatsappUrl,
      lead: insertedData || {
        booking_code: bookingCode,
        name: sanitizedName,
        phone: cleanedPhone,
        direction: dirNorm,
        vehicle: vehNorm,
        point: sanitizedPoint,
        pickup_at: pickup_at,
        price: fareBreakdown.totalFare,
        stage: 'pay_clicked',
      },
    })
  } catch (err: any) {
    console.error('API createLead exception:', err)
    return NextResponse.json(
      { error: err.message || 'Server error processing booking.' },
      { status: 500 }
    )
  }
}
