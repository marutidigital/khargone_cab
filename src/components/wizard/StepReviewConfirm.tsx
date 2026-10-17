'use client'
// src/components/wizard/StepReviewConfirm.tsx

import { useState } from 'react'
import Image from 'next/image'
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  CreditCard,
  MessageCircle,
  MapPin,
  Tag,
  ArrowRight,
  Loader2,
  Sparkles,
  AlertCircle
} from 'lucide-react'
import type { Direction, VehicleType } from '@/types'
import type { SelectedDate, SelectedTime } from './StepDateTime'
import type { PassengerInfo } from './StepPassenger'
import {
  PRICING_CONFIG,
  formatRs,
  LivePriceBreakdown,
} from '@/config/pricing'
import { insertLead, isDuplicateSubmission } from '@/lib/leads'

interface Props {
  direction: Direction
  vehicle: VehicleType
  pointId: string
  date: SelectedDate
  time: SelectedTime
  passenger: PassengerInfo
  priceBreakdown: LivePriceBreakdown
  onWhatsAppClick: (whatsappUrl: string) => void
}

function computeArrivalTime(startHour: number, startMinute: number, durationHours: number): string {
  const totalMinutes = startHour * 60 + startMinute + durationHours * 60
  const endHour = Math.floor(totalMinutes / 60) % 24
  const endMinute = totalMinutes % 60
  const h12 = endHour % 12 === 0 ? 12 : endHour % 12
  const ampm = endHour < 12 ? 'AM' : 'PM'
  return `${h12}:${String(endMinute).padStart(2, '0')} ${ampm}`
}

export function StepReviewConfirm({
  direction,
  vehicle,
  pointId,
  date,
  time,
  passenger,
  priceBreakdown,
  onWhatsAppClick,
}: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [hasPayClicked, setHasPayClicked] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isKI = direction === 'KI'
  const vehicleConfig = PRICING_CONFIG.vehicles[vehicle]
  const pointConfig = PRICING_CONFIG.points.find((p) => p.id === pointId) || PRICING_CONFIG.points[0]

  const pickupLocation = isKI ? PRICING_CONFIG.khargoneHub : pointConfig.name
  const dropLocation = isKI ? pointConfig.name : PRICING_CONFIG.khargoneHub
  const destinationCity = isKI ? 'Indore' : 'Khargone'

  const arrivalTime = computeArrivalTime(time.hour, time.minute, PRICING_CONFIG.estimatedTravelHours)
  const pickupAtIso = `${date.dateStr}T${time.timeStr}:00+05:30`

  // Plain sentence requirement:
  // "Pickup: Tue 20 Oct, 9:30 AM from Khargone Bus Stand. Estimated arrival in Indore: about 12:30 PM."
  const plainSentence = `Pickup: ${date.fullLabel}, ${time.label12} from ${pickupLocation}. Estimated arrival in ${destinationCity}: about ${arrivalTime}.`

  // Prefilled WhatsApp message
  const routeLabel = isKI ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'
  const prefilledText = [
    `*Hanscab Cab Request* 🚖`,
    `• *Name:* ${passenger.name}`,
    `• *Phone:* +91 ${passenger.phone}`,
    `• *Route:* ${routeLabel}`,
    `• *${isKI ? 'Drop in Indore' : 'Pickup in Indore'}:* ${pointConfig.name}`,
    `• *Vehicle:* ${vehicleConfig.name} (${passenger.passengers} passengers)`,
    `• *Pickup:* ${date.fullLabel} at ${time.label12}`,
    `• *Estimated Arrival:* about ${arrivalTime}`,
    `• *Total Price:* ${formatRs(priceBreakdown.totalFare)} (Advance: ${formatRs(priceBreakdown.advanceDeposit)}, Pay in car: ${formatRs(priceBreakdown.balanceFare)})`,
    ``,
    `Hi Hanscab, please share the payment link and confirm my cab.`,
  ].join('\n')

  const whatsappUrl = `https://wa.me/${PRICING_CONFIG.contactWhatsApp}?text=${encodeURIComponent(prefilledText)}`

  // Handle "Pay Rs 500 advance" button click
  const handlePayAdvanceClick = async () => {
    setSubmitting(true)
    setSubmitError(null)

    // Check duplicate submits (same phone + same pickup_at within 10 minutes)
    if (isDuplicateSubmission(passenger.phone, pickupAtIso)) {
      setDuplicateWarning(true)
      setHasPayClicked(true)
      setSubmitting(false)
      return
    }

    // Insert lead into Supabase table leads using anon key from client
    const res = await insertLead({
      name: passenger.name,
      phone: passenger.phone,
      direction: isKI ? 'K2I' : 'I2K',
      vehicle: vehicleConfig.name,
      point: pointConfig.name,
      pickup_at: pickupAtIso,
      passengers: passenger.passengers,
      price: priceBreakdown.totalFare,
    })

    if (res.isDuplicate) {
      setDuplicateWarning(true)
    }

    if (!res.success && !res.isDuplicate) {
      setSubmitError(res.error || 'Connection issue, but you can still reach us directly on WhatsApp below.')
    }

    setHasPayClicked(true)
    setSubmitting(false)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-[#F5B841]" />
          Review & Confirm Booking
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Review your trip schedule and transparent pricing before requesting your car.
        </p>
      </div>

      {/* ── 1. ROUTE & PICKUP SUMMARY SENTENCE ── */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800">
        <div className="flex items-center gap-2 text-[#F5B841] text-xs font-bold uppercase tracking-wider mb-2">
          <Clock className="w-4 h-4" />
          <span>Trip Schedule</span>
        </div>

        {/* Required Plain Sentence */}
        <p className="text-base sm:text-lg font-bold text-white leading-relaxed">
          {plainSentence}
        </p>

        {/* Driver call note */}
        <p className="text-xs text-[#F5B841] font-semibold mt-2.5 pt-2.5 border-t border-slate-800 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          Your driver will call you 30 minutes before pickup.
        </p>

        {/* Route tags */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span><strong>Pickup:</strong> {pickupLocation}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span><strong>Drop:</strong> {dropLocation}</span>
          </div>
        </div>
      </div>

      {/* ── 2. VEHICLE & PASSENGER CARD ── */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="w-20 h-16 relative bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
            <Image
              src={vehicleConfig.image}
              alt={vehicleConfig.name}
              fill
              className="object-contain p-1.5"
              sizes="80px"
            />
          </div>
          <div>
            <div className="text-base font-extrabold text-slate-900">{vehicleConfig.name}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Private Car · {passenger.passengers} Passenger{passenger.passengers > 1 ? 's' : ''}
            </div>
            <div className="text-xs text-slate-700 font-semibold mt-1">
              Passenger: {passenger.name} ({passenger.phone})
            </div>
          </div>
        </div>

        <div className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-right">
          <span className="text-[11px] text-slate-500 block">Total Highway Distance</span>
          <span className="text-sm font-bold text-slate-900">~150 km Direct</span>
        </div>
      </div>

      {/* ── 3. OFFERS SECTION ON REVIEW SCREEN ── */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-amber-900 text-xs font-bold uppercase tracking-wider mb-2">
          <Tag className="w-4 h-4 text-[#F5B841]" />
          <span>Active Offers & Savings</span>
        </div>

        <div className="space-y-2">
          {direction === 'IK' && (
            <div className="flex items-center justify-between text-xs text-amber-900 font-semibold bg-white p-2.5 rounded-xl border border-amber-200/80">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Indore → Khargone Discount (Auto-applied)
              </span>
              <span className="text-emerald-700 font-bold">−{formatRs(PRICING_CONFIG.indoreToKhargoneDiscount)}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
              Reserve with {formatRs(PRICING_CONFIG.advanceDeposit)}, pay the rest in the car
            </span>
            <span className="font-bold text-slate-900">Guaranteed</span>
          </div>
        </div>
      </div>

      {/* ── 4. COMPLETE TRANSPARENT PRICE BREAKDOWN ── */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
          Transparent Price Breakdown (No Hidden Fees)
        </div>

        <div className="flex justify-between text-sm text-slate-700">
          <span>Base Highway Fare ({vehicleConfig.name})</span>
          <span className="font-semibold text-slate-900">{formatRs(priceBreakdown.baseFare)}</span>
        </div>

        {priceBreakdown.pointExtra > 0 && (
          <div className="flex justify-between text-sm text-slate-700">
            <span>{isKI ? 'Drop' : 'Pickup'} Point Charge ({pointConfig.name})</span>
            <span className="font-semibold text-slate-900">+{formatRs(priceBreakdown.pointExtra)}</span>
          </div>
        )}

        {priceBreakdown.sameDaySurcharge > 0 && (
          <div className="flex justify-between text-sm text-amber-800">
            <span>Same-Day Dispatch Rush Charge (Today)</span>
            <span className="font-semibold">+{formatRs(priceBreakdown.sameDaySurcharge)}</span>
          </div>
        )}

        {priceBreakdown.nextDaySurcharge > 0 && (
          <div className="flex justify-between text-sm text-indigo-800">
            <span>Next-Day Booking Surcharge (Tomorrow)</span>
            <span className="font-semibold">+{formatRs(priceBreakdown.nextDaySurcharge)}</span>
          </div>
        )}

        {priceBreakdown.nightSurcharge > 0 && (
          <div className="flex justify-between text-sm text-purple-800">
            <span>Night Charge (10:00 PM – 04:59 AM)</span>
            <span className="font-semibold">+{formatRs(priceBreakdown.nightSurcharge)}</span>
          </div>
        )}

        {priceBreakdown.directionDiscount > 0 && (
          <div className="flex justify-between text-sm text-emerald-700 font-semibold">
            <span>Indore → Khargone Offer Discount</span>
            <span>−{formatRs(priceBreakdown.directionDiscount)}</span>
          </div>
        )}

        <div className="border-t-2 border-dashed border-slate-200 pt-3 flex justify-between items-baseline">
          <div>
            <span className="text-base font-bold text-slate-900">Total Fixed Fare</span>
            <span className="text-[11px] text-slate-500 block">Tolls, driver allowance & AC included</span>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            {formatRs(priceBreakdown.totalFare)}
          </span>
        </div>

        {/* Deposit & Balance Split */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-2 gap-3 text-center mt-2">
          <div>
            <span className="text-[11px] text-slate-500 block">Advance Token (To Confirm)</span>
            <span className="text-base font-extrabold text-[#B45309]">
              {formatRs(priceBreakdown.advanceDeposit)}
            </span>
          </div>
          <div className="border-l border-slate-200">
            <span className="text-[11px] text-slate-500 block">Pay in Car to Driver</span>
            <span className="text-base font-extrabold text-slate-800">
              {formatRs(priceBreakdown.balanceFare)}
            </span>
          </div>
        </div>
      </div>

      {/* ── 5. ADVANCE PAYMENT / CONFIRMATION STEP ── */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-[#F5B841] rounded-2xl p-5 shadow-sm space-y-4">
        {!hasPayClicked ? (
          <div>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#F5B841] text-slate-950 flex items-center justify-center flex-shrink-0 font-black shadow-sm">
                UPI
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  Confirm Car with Advance Deposit
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Click below to register your booking request. You can pay the {formatRs(priceBreakdown.balanceFare)} balance directly to your driver during the ride.
                </p>
              </div>
            </div>

            {/* Pay Rs 500 advance Button */}
            <button
              type="button"
              disabled={submitting}
              onClick={handlePayAdvanceClick}
              className="w-full bg-[#F5B841] hover:bg-[#E5A630] text-slate-950 font-black py-4 px-6 rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2.5 transition-all text-base min-h-[52px] active:scale-98 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span>Pay {formatRs(PRICING_CONFIG.advanceDeposit)} advance</span>
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Required Notice */}
            <div className="p-4 bg-white/90 border border-amber-300 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="text-sm font-semibold text-slate-900 leading-snug">
                  Online payment is opening soon. We&apos;ve saved your request and will connect you on WhatsApp.
                </div>
              </div>
              {duplicateWarning && (
                <p className="text-xs text-amber-800 mt-2 pl-8">
                  Note: A request for this phone and pickup time was already recorded recently. Our dispatch team is on it!
                </p>
              )}
            </div>

            {/* Chat on WhatsApp Button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onWhatsAppClick(whatsappUrl)}
              className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2.5 transition-all text-base min-h-[52px] cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              <span>Chat on WhatsApp</span>
            </a>

            <p className="text-[11px] text-slate-500 text-center">
              Clicking opens WhatsApp with your route and pickup details prefilled.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
