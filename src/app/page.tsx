'use client'
// src/app/page.tsx

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Nav } from '@/components/Nav'
import { OffersStrip } from '@/components/OffersStrip'
import { WizardProgress, WIZARD_STEPS } from '@/components/WizardProgress'
import { StepRoute } from '@/components/wizard/StepRoute'
import { StepVehicle } from '@/components/wizard/StepVehicle'
import { StepPoint } from '@/components/wizard/StepPoint'
import { StepDateTime, SelectedDate, SelectedTime } from '@/components/wizard/StepDateTime'
import { StepPassenger, PassengerInfo } from '@/components/wizard/StepPassenger'
import { StepReviewConfirm } from '@/components/wizard/StepReviewConfirm'
import { StickyBottomBar } from '@/components/StickyBottomBar'
import { FooterTrust } from '@/components/FooterTrust'
import { Toast } from '@/components/Toast'
import type { Direction, DropPoint, VehicleType, Booking } from '@/types'
import { PRICING_CONFIG, computeBookingPrice, LivePriceBreakdown, formatRs } from '@/config/pricing'
import { logBookingEvent } from '@/lib/tracking'
import { CheckCircle2, MessageCircle, Clock, ShieldCheck, ArrowRight, RotateCcw } from 'lucide-react'
import Image from 'next/image'

export default function Home() {
  // Wizard Step (1 to 6)
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [completedMaxStep, setCompletedMaxStep] = useState<number>(1)

  // Booking Form State
  const [direction, setDirection] = useState<Direction>('KI')
  const [vehicle, setVehicle] = useState<VehicleType>('sedan')
  const [pointId, setPointId] = useState<DropPoint>('rajendra')
  const [selectedDate, setSelectedDate] = useState<SelectedDate | null>(null)
  const [selectedTime, setSelectedTime] = useState<SelectedTime | null>(null)
  const [passenger, setPassenger] = useState<PassengerInfo>({
    name: '',
    phone: '',
    email: '',
    passengers: 1,
    consent: true,
  })

  // Submission & UI States
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null)
  const [toast, setToast] = useState<{ msg: string; type?: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // 1. Initial Page View Tracking
  useEffect(() => {
    logBookingEvent({ event: 'page_view' })
  }, [])

  // 2. Live Pricing Calculation (Always reactive to user selections)
  const livePrice: LivePriceBreakdown = useMemo(() => {
    const daysAhead = selectedDate ? selectedDate.daysAhead : 0
    const hour = selectedTime ? selectedTime.hour : 10

    return computeBookingPrice({
      vehicle,
      pointId,
      direction,
      daysAhead,
      hour,
    })
  }, [vehicle, pointId, direction, selectedDate, selectedTime])

  // Track max completed step for non-linear step back navigation
  const advanceToStep = useCallback((step: number) => {
    setCurrentStep(step)
    setCompletedMaxStep((prev) => Math.max(prev, step))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Validation rules for each step
  const canContinue = useMemo(() => {
    switch (currentStep) {
      case 1:
        return !!direction
      case 2:
        return !!vehicle
      case 3:
        return !!pointId
      case 4:
        return !!selectedDate && !!selectedTime
      case 5:
        return (
          passenger.name.trim().length >= 2 &&
          /^[6-9]\d{9}$/.test(passenger.phone) &&
          passenger.consent
        )
      case 6:
        return true
      default:
        return false
    }
  }, [currentStep, direction, vehicle, pointId, selectedDate, selectedTime, passenger])

  // Step transitions & Event tracking
  const handleNext = () => {
    if (!canContinue) return

    if (currentStep === 1) {
      logBookingEvent({
        event: 'route_selected',
        direction,
        price: livePrice.totalFare,
      })
      advanceToStep(2)
    } else if (currentStep === 2) {
      logBookingEvent({
        event: 'vehicle_selected',
        direction,
        vehicle,
        price: livePrice.totalFare,
      })
      advanceToStep(3)
    } else if (currentStep === 3) {
      advanceToStep(4)
    } else if (currentStep === 4) {
      if (selectedDate && selectedTime) {
        logBookingEvent({
          event: 'date_selected',
          direction,
          vehicle,
          point: pointId,
          travel_date: selectedDate.dateStr,
          time_slot: selectedTime.timeStr,
          price: livePrice.totalFare,
        })
      }
      advanceToStep(5)
    } else if (currentStep === 5) {
      logBookingEvent({
        event: 'details_filled',
        direction,
        vehicle,
        point: pointId,
        travel_date: selectedDate?.dateStr,
        time_slot: selectedTime?.timeStr,
        price: livePrice.totalFare,
        name: passenger.name,
        phone: passenger.consent ? passenger.phone : null,
        consent: passenger.consent,
      })
      advanceToStep(6)
      // Reaching step 6 is payment_screen_reached
      logBookingEvent({
        event: 'payment_screen_reached',
        direction,
        vehicle,
        point: pointId,
        travel_date: selectedDate?.dateStr,
        time_slot: selectedTime?.timeStr,
        price: livePrice.totalFare,
        name: passenger.name,
        phone: passenger.consent ? passenger.phone : null,
        consent: passenger.consent,
      })
    } else if (currentStep === 6) {
      handleFinalBookingSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      advanceToStep(currentStep - 1)
    }
  }

  // Final booking submission
  const handleFinalBookingSubmit = async () => {
    if (!selectedDate || !selectedTime) return
    setIsSubmitting(true)

    try {
      const selectedPoint = PRICING_CONFIG.points.find((p) => p.id === pointId)
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction,
          drop_point: pointId,
          drop_name: selectedPoint?.name || pointId,
          travel_date: selectedDate.dateStr,
          pickup_time: selectedTime.timeStr,
          passenger_name: passenger.name,
          phone: passenger.phone,
          email: passenger.email || undefined,
          extra: selectedPoint?.extra || 0,
          days_ahead: selectedDate.daysAhead,
          vehicle,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error?.message || json.error || 'Failed to save booking')
      }

      setConfirmedBooking(json.booking)
      showToast('Booking request received! We will WhatsApp you within 10 minutes.', 'success')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      showToast(err.message || 'Something went wrong. Please retry or contact WhatsApp.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleWhatsAppClick = (url: string) => {
    logBookingEvent({
      event: 'whatsapp_clicked',
      direction,
      vehicle,
      point: pointId,
      travel_date: selectedDate?.dateStr,
      time_slot: selectedTime?.timeStr,
      price: livePrice.totalFare,
      name: passenger.name,
      phone: passenger.consent ? passenger.phone : null,
      consent: passenger.consent,
    })
  }

  // ── SUCCESS CONFIRMATION SCREEN ──
  if (confirmedBooking) {
    const isKI = confirmedBooking.direction === 'KI'
    const vehicleCfg = PRICING_CONFIG.vehicles[confirmedBooking.vehicle_type === 'suv' ? 'suv' : 'sedan']
    const pickupLoc = isKI ? PRICING_CONFIG.khargoneHub : confirmedBooking.drop_name
    const dropLoc = isKI ? confirmedBooking.drop_name : PRICING_CONFIG.khargoneHub
    const prefilledText = `Hi Hanscab, I placed booking reference *${confirmedBooking.booking_ref}* for ${confirmedBooking.travel_date}. Please share the Rs 500 UPI payment link.`
    const waUrl = `https://wa.me/${PRICING_CONFIG.contactWhatsApp}?text=${encodeURIComponent(prefilledText)}`

    return (
      <div className="min-h-screen bg-[#0B1220] flex flex-col justify-between">
        <Nav />

        <main className="max-w-xl mx-auto px-4 py-8 sm:py-12 w-full animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 text-center">
            {/* Top Icon */}
            <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 stroke-[2.5]" />
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-3 py-1 rounded-full">
              Booking Request Received
            </span>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2 mb-2">
              We&apos;ve Saved Your Booking!
            </h1>

            {/* Honest temporary payment message */}
            <div className="bg-amber-50 border-2 border-[#F5B841] rounded-2xl p-4 my-5 text-left">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-[#B45309] flex-shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                  <strong>Online payment is opening soon.</strong> We&apos;ve saved your booking request and will WhatsApp you within 10 minutes with a <strong>Rs 500 UPI link</strong> to confirm your car.
                </div>
              </div>
            </div>

            {/* Receipt Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 text-left text-xs sm:text-sm space-y-2.5 mb-6">
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Booking Reference</span>
                <span className="font-mono font-bold text-slate-900 bg-slate-200 px-2 py-0.5 rounded">
                  {confirmedBooking.booking_ref}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Route</span>
                <span className="font-semibold text-slate-900">
                  {confirmedBooking.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Vehicle</span>
                <span className="font-semibold text-slate-900">{vehicleCfg.name}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Pickup Location</span>
                <span className="font-semibold text-slate-900">{pickupLoc}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Drop Location</span>
                <span className="font-semibold text-slate-900">{dropLoc}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Date & Pickup Time</span>
                <span className="font-semibold text-slate-900">
                  {confirmedBooking.travel_date} at {confirmedBooking.pickup_time}
                </span>
              </div>

              <div className="flex justify-between pt-2.5 border-t border-slate-200 text-base font-extrabold text-slate-950">
                <span>Total Fare</span>
                <span className="text-lg font-black text-[#B45309]">
                  {formatRs(confirmedBooking.total_fare)}
                </span>
              </div>
            </div>

            {/* Instant WhatsApp Confirmation Button */}
            <div className="space-y-3">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleWhatsAppClick(waUrl)}
                className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2.5 transition-all text-base min-h-[50px]"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                <span>Send request on WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setConfirmedBooking(null)
                  setCurrentStep(1)
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 min-h-[44px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Book Another Ride</span>
              </button>
            </div>
          </div>
        </main>

        <FooterTrust />
      </div>
    )
  }

  // ── MAIN WIZARD VIEW (ONE STEP PER SCREEN) ──
  return (
    <div className="min-h-screen bg-[#0B1220] flex flex-col justify-between text-slate-100 selection:bg-[#F5B841]/30 pb-28">
      {/* 1. Header Navigation */}
      <Nav />

      {/* 2. Top Horizontal Offers Strip */}
      <OffersStrip />

      {/* 3. Main Wizard Stage */}
      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 w-full flex-1">
        {/* Progress Bar & Back Control */}
        <WizardProgress
          currentStep={currentStep}
          onBack={handleBack}
          onStepClick={advanceToStep}
          completedMaxStep={completedMaxStep}
        />

        {/* Wizard Card Stage (White Card on Dark Navy) */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-800/40 text-slate-900 transition-all duration-200">
          {currentStep === 1 && (
            <StepRoute
              direction={direction}
              onChange={setDirection}
              onNext={handleNext}
            />
          )}

          {currentStep === 2 && (
            <StepVehicle
              selected={vehicle}
              onSelect={setVehicle}
              onNext={handleNext}
            />
          )}

          {currentStep === 3 && (
            <StepPoint
              direction={direction}
              selectedPointId={pointId}
              onSelect={setPointId}
              onNext={handleNext}
            />
          )}

          {currentStep === 4 && (
            <StepDateTime
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onSelectDate={setSelectedDate}
              onSelectTime={setSelectedTime}
              onNext={handleNext}
            />
          )}

          {currentStep === 5 && (
            <StepPassenger
              vehicle={vehicle}
              initialData={passenger}
              onSave={setPassenger}
              onNext={handleNext}
            />
          )}

          {currentStep === 6 && (
            <StepReviewConfirm
              direction={direction}
              vehicle={vehicle}
              pointId={pointId}
              date={selectedDate!}
              time={selectedTime!}
              passenger={passenger}
              priceBreakdown={livePrice}
              onWhatsAppClick={handleWhatsAppClick}
            />
          )}
        </div>
      </main>

      {/* 4. Sticky Bottom Bar with Live Total & 48px Tap Targets */}
      <StickyBottomBar
        currentStep={currentStep}
        totalSteps={WIZARD_STEPS.length}
        totalFare={livePrice.totalFare}
        advanceDeposit={livePrice.advanceDeposit}
        canContinue={canContinue}
        isLoading={isSubmitting}
        onContinue={handleNext}
      />

      {/* 5. Trust & Policies Footer */}
      <FooterTrust />

      {/* Toast notifications */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  )
}
