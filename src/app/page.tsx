'use client'
// src/app/page.tsx
// Hanscab - Single Continuous Scrolling Page (Khargone <-> Indore Private Cabs)

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Nav } from '@/components/Nav'
import { BookingStepper } from '@/components/BookingStepper'
import { SectionRoute } from '@/components/booking/SectionRoute'
import { SectionVehicle } from '@/components/booking/SectionVehicle'
import { SectionDropPoint } from '@/components/booking/SectionDropPoint'
import { SectionDate, DateTileItem } from '@/components/booking/SectionDate'
import { SectionTimeSlot, ExactTimeOption } from '@/components/booking/SectionTimeSlot'
import { SectionPassenger, PassengerFormData } from '@/components/booking/SectionPassenger'
import { TripSummaryCard } from '@/components/booking/TripSummaryCard'
import { PaymentConfirmationSheet } from '@/components/booking/PaymentConfirmationSheet'
import { FooterMarquee } from '@/components/FooterMarquee'
import { FooterTrust } from '@/components/FooterTrust'
import { PRICING_CONFIG, computeFare, formatRs, DetailedFareBreakdown } from '@/config/pricing'
import { initUTMTracking, getStoredSource, logEvent } from '@/lib/tracking'
import { ShieldCheck, ArrowRight, CheckCircle2, ChevronUp } from 'lucide-react'

// Helper to get today's date formatted as YYYY-MM-DD in Asia/Kolkata
function getTodayKolkata(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date())
}

export default function Home() {
  // 1. Core Booking State
  const [direction, setDirection] = useState<'K2I' | 'I2K'>('K2I')
  const [vehicle, setVehicle] = useState<'sedan' | 'suv'>('sedan')
  const [pointId, setPointId] = useState<string>('rajendra')

  // Date state (Asia/Kolkata runtime)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(getTodayKolkata)
  const [selectedDateItem, setSelectedDateItem] = useState<DateTileItem | null>(null)

  // Time slot state
  const [selectedTimeStr, setSelectedTimeStr] = useState<string | null>(null)
  const [selectedTimeOpt, setSelectedTimeOpt] = useState<ExactTimeOption | null>(null)

  // Passenger Form
  const [passenger, setPassenger] = useState<PassengerFormData>({
    name: '',
    phone: '',
    passengers: 1,
    consent: true,
    address: '',
  })
  const [errors, setErrors] = useState<{ name?: string; phone?: string; consent?: string; time?: string }>({})

  // UI & Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Confirmed booking state (for PaymentConfirmationSheet)
  const [confirmedBooking, setConfirmedBooking] = useState<{
    bookingCode: string
    name: string
    phone: string
    direction: 'K2I' | 'I2K'
    pointName: string
    vehicleName: string
    pickupDateStr: string
    pickupTimeLabel: string
    passengers: number
    breakdown: DetailedFareBreakdown
    whatsappUrl: string
    isDuplicate?: boolean
  } | null>(null)

  // 2. Track initial page view & UTM parameters
  useEffect(() => {
    initUTMTracking()
    logEvent({ event: 'page_view' })
  }, [])

  // 3. Resolve configs & values
  const selectedPoint = useMemo(() => {
    return PRICING_CONFIG.points.find((p) => p.id === pointId) || PRICING_CONFIG.points[0]
  }, [pointId])

  const selectedVehicleConfig = useMemo(() => {
    return PRICING_CONFIG.vehicles[vehicle]
  }, [vehicle])

  const isToday = useMemo(() => {
    return selectedDateStr === getTodayKolkata()
  }, [selectedDateStr])

  const daysAhead = useMemo(() => {
    if (selectedDateItem) return selectedDateItem.daysAhead
    const today = new Date(getTodayKolkata())
    const sel = new Date(selectedDateStr)
    const diff = Math.ceil((sel.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }, [selectedDateItem, selectedDateStr])

  // Live price breakdown calculation
  const fareBreakdown: DetailedFareBreakdown = useMemo(() => {
    return computeFare({
      direction,
      vehicle,
      pointIdOrName: selectedPoint.name,
      daysAhead,
      hour: selectedTimeOpt ? selectedTimeOpt.hour : 10,
      isNight: selectedTimeOpt ? selectedTimeOpt.isNight : false,
    })
  }, [direction, vehicle, selectedPoint.name, daysAhead, selectedTimeOpt])

  // Adjust passenger count if user switches from SUV (max 6) to Sedan (max 4)
  const maxPax = vehicle === 'suv' ? 6 : 4
  useEffect(() => {
    if (passenger.passengers > maxPax) {
      setPassenger((prev) => ({ ...prev, passengers: maxPax }))
    }
  }, [maxPax, passenger.passengers])

  // 4. Stepper calculation & Smooth Scrolling
  const completedSteps = useMemo(() => {
    const steps: number[] = [1, 2, 3] // Route, Vehicle, Point are always selected by default
    if (selectedDateStr) steps.push(4)
    if (selectedTimeOpt) steps.push(5)
    if (
      passenger.name.trim().length >= 2 &&
      /^[6-9]\d{9}$/.test(passenger.phone) &&
      passenger.consent
    ) {
      steps.push(6)
    }
    return steps
  }, [selectedDateStr, selectedTimeOpt, passenger])

  const currentStep = useMemo(() => {
    if (!selectedTimeOpt) return 5
    if (!passenger.name.trim() || !/^[6-9]\d{9}$/.test(passenger.phone)) return 6
    return 6
  }, [selectedTimeOpt, passenger])

  const scrollToSection = (stepNum: number) => {
    const ids: Record<number, string> = {
      1: 'section-route',
      2: 'section-vehicle',
      3: 'section-point',
      4: 'section-date',
      5: 'section-time',
      6: 'section-passenger',
    }
    const targetId = ids[stepNum]
    if (targetId) {
      const el = document.getElementById(targetId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  // 5. Actions & Handlers
  const handleSwapDirection = () => {
    const nextDir = direction === 'K2I' ? 'I2K' : 'K2I'
    setDirection(nextDir)
    logEvent({
      event: 'direction_selected',
      meta: { direction: nextDir },
    })
  }

  const handleSelectVehicle = (v: 'sedan' | 'suv') => {
    setVehicle(v)
    logEvent({
      event: 'vehicle_selected',
      meta: { vehicle: v },
    })
  }

  const handleSelectPoint = (ptId: string) => {
    setPointId(ptId)
    const pt = PRICING_CONFIG.points.find((p) => p.id === ptId)
    logEvent({
      event: 'point_selected',
      meta: { point: pt?.name || ptId },
    })
  }

  const handleSelectDate = (item: DateTileItem) => {
    setSelectedDateStr(item.dateStr)
    setSelectedDateItem(item)
    // If today changed, reset time if needed
    logEvent({
      event: 'date_selected',
      meta: { date: item.dateStr, daysAhead: item.daysAhead },
    })
  }

  const handleSelectTime = (opt: ExactTimeOption) => {
    setSelectedTimeStr(opt.timeStr)
    setSelectedTimeOpt(opt)
    setErrors((prev) => ({ ...prev, time: undefined }))
    logEvent({
      event: 'time_selected',
      meta: { time: opt.timeStr, hour: opt.hour },
    })
  }

  const handlePassengerChange = (updated: Partial<PassengerFormData>) => {
    setPassenger((prev) => ({ ...prev, ...updated }))
    if (updated.name && updated.name.trim().length >= 2) {
      setErrors((prev) => ({ ...prev, name: undefined }))
    }
    if (updated.phone && /^[6-9]\d{9}$/.test(updated.phone)) {
      setErrors((prev) => ({ ...prev, phone: undefined }))
    }
    if (updated.consent !== undefined && updated.consent) {
      setErrors((prev) => ({ ...prev, consent: undefined }))
    }
  }

  // 6. Advance Payment Submission (HONEST TEST-PHASE FLOW)
  const isFormValid = useMemo(() => {
    return (
      !!selectedDateStr &&
      !!selectedTimeOpt &&
      passenger.name.trim().length >= 2 &&
      /^[6-9]\d{9}$/.test(passenger.phone) &&
      passenger.consent
    )
  }, [selectedDateStr, selectedTimeOpt, passenger])

  const handlePayAdvance = async () => {
    const newErrors: { name?: string; phone?: string; consent?: string; time?: string } = {}

    if (!selectedTimeOpt) {
      newErrors.time = 'Please choose a pickup time slot.'
      scrollToSection(5)
    }

    if (!passenger.name.trim() || passenger.name.trim().length < 2) {
      newErrors.name = 'Please enter your full name.'
    }

    if (!passenger.phone || !/^[6-9]\d{9}$/.test(passenger.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit Indian WhatsApp number.'
    }

    if (!passenger.consent) {
      newErrors.consent = 'Please agree to be contacted on WhatsApp.'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      if (newErrors.name || newErrors.phone || newErrors.consent) {
        scrollToSection(6)
      }
      return
    }

    setIsSubmitting(true)
    setToastMessage(null)

    try {
      // Build pickup ISO string with Asia/Kolkata offset (+05:30)
      const pickupTime = selectedTimeOpt ? selectedTimeOpt.timeStr : '10:00'
      const pickupAtIso = `${selectedDateStr}T${pickupTime}:00+05:30`

      // 1. Log event & fire Meta Pixel lead event
      await logEvent({
        event: 'pay_clicked',
        meta: {
          direction,
          vehicle,
          point: selectedPoint.name,
          pickup_at: pickupAtIso,
          price: fareBreakdown.totalFare,
          phone: passenger.phone,
        },
      })

      // 2. Call server route handler /api/leads
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: passenger.name.trim(),
          phone: passenger.phone,
          direction,
          vehicle,
          point: selectedPoint.name,
          pickup_at: pickupAtIso,
          passengers: passenger.passengers,
          consent: passenger.consent,
          source: getStoredSource(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit booking request.')
      }

      // Close mobile sheet if open
      setIsMobileModalOpen(false)

      // Set confirmed booking to display honest Confirmation Sheet
      setConfirmedBooking({
        bookingCode: data.booking_code || 'HC-PENDING',
        name: passenger.name.trim(),
        phone: passenger.phone,
        direction,
        pointName: selectedPoint.name,
        vehicleName: selectedVehicleConfig.title,
        pickupDateStr: selectedDateStr,
        pickupTimeLabel: selectedTimeOpt ? selectedTimeOpt.label12 : '10:00 AM',
        passengers: passenger.passengers,
        breakdown: fareBreakdown,
        whatsappUrl: data.whatsapp_url,
        isDuplicate: data.isDuplicate,
      })
    } catch (err: any) {
      console.error('Submission failed:', err)
      setToastMessage(err.message || 'Something went wrong. Please try again.')
      setTimeout(() => setToastMessage(null), 5000)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Formatting date string for display in summary
  const dateLabel = useMemo(() => {
    if (selectedDateItem) {
      return `${selectedDateItem.weekday}, ${selectedDateItem.dayNum} ${selectedDateItem.month}`
    }
    const d = new Date(selectedDateStr)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }, [selectedDateItem, selectedDateStr])

  const timeLabel = selectedTimeOpt ? selectedTimeOpt.label12 : null

  return (
    <div className="min-h-screen bg-[#F4F4F5] flex flex-col font-sans text-slate-900 antialiased selection:bg-[#FBBF24] selection:text-slate-950">
      {/* 1. Header Navigation */}
      <Nav />

      {/* 2. Top Progress Stepper */}
      <BookingStepper
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={scrollToSection}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-rose-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <span className="text-sm font-bold">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white text-xs underline font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. Main Continuous Booking Experience */}
      <main id="booking-section" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Intro Subtitle */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Book Private Cab</span>
              <span className="text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Khargone ↔ Indore
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
              Guaranteed private car for your family • No shared passengers • Doorstep pickup & drop
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>₹500 Advance • Rest in Car</span>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* LEFT COLUMN: All 6 Sections in One Continuous Scrolling View */}
          <div className="w-full lg:w-[65%] xl:w-[68%] space-y-6 sm:space-y-7">
            {/* SECTION 1: Route */}
            <div id="section-route" className="scroll-mt-24">
              <SectionRoute
                direction={direction}
                selectedPointName={selectedPoint.name}
                onSwapDirection={handleSwapDirection}
              />
            </div>

            {/* SECTION 2: Vehicle */}
            <div id="section-vehicle" className="scroll-mt-24">
              <SectionVehicle
                selectedVehicle={vehicle}
                direction={direction}
                onSelectVehicle={handleSelectVehicle}
              />
            </div>

            {/* SECTION 3: Drop Point & Interactive Map */}
            <div id="section-point" className="scroll-mt-24">
              <SectionDropPoint
                direction={direction}
                selectedPointId={pointId}
                onSelectPoint={handleSelectPoint}
              />
            </div>

            {/* SECTION 4: Travel Date (45-Day runtime generator) */}
            <div id="section-date" className="scroll-mt-24">
              <SectionDate
                direction={direction}
                selectedDateStr={selectedDateStr}
                onSelectDate={handleSelectDate}
              />
            </div>

            {/* SECTION 5: Pickup Time Slot */}
            <div id="section-time" className="scroll-mt-24">
              <SectionTimeSlot
                isToday={isToday}
                direction={direction}
                selectedTimeStr={selectedTimeStr}
                onSelectTime={handleSelectTime}
              />
              {errors.time && (
                <p className="text-xs font-bold text-rose-600 mt-2 px-1">
                  ⚠️ {errors.time}
                </p>
              )}
            </div>

            {/* SECTION 6: Passenger Details */}
            <div id="section-passenger" className="scroll-mt-24">
              <SectionPassenger
                maxPassengers={maxPax}
                data={passenger}
                onChange={handlePassengerChange}
                errors={errors}
              />
            </div>
          </div>

          {/* RIGHT COLUMN (DESKTOP): Sticky Trip Summary Card */}
          <div className="hidden lg:block lg:w-[35%] xl:w-[32%] sticky top-20">
            <TripSummaryCard
              direction={direction}
              vehicle={vehicle}
              pointName={selectedPoint.name}
              dateLabel={dateLabel}
              timeLabel={timeLabel}
              breakdown={fareBreakdown}
              isValid={isFormValid}
              isSubmitting={isSubmitting}
              onPayAdvance={handlePayAdvance}
            />
          </div>
        </div>
      </main>

      {/* 4. Mobile Sticky Bottom Bar */}
      <div className="lg:hidden sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E7EB] px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          {/* Price summary tap to expand */}
          <button
            type="button"
            onClick={() => setIsMobileModalOpen(true)}
            className="flex flex-col text-left focus:outline-none cursor-pointer"
          >
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
              Total Fare <ChevronUp className="w-3 h-3 text-slate-400" />
            </span>
            <span className="text-lg font-black text-slate-900 leading-tight">
              {formatRs(fareBreakdown.totalFare)}
            </span>
            <span className="text-[11px] font-bold text-emerald-700">
              Pay ₹500 advance now
            </span>
          </button>

          {/* Action button */}
          <button
            type="button"
            onClick={() => {
              if (isFormValid) {
                handlePayAdvance()
              } else {
                setIsMobileModalOpen(true)
              }
            }}
            disabled={isSubmitting}
            className="bg-[#FBBF24] hover:bg-[#F59E0B] text-slate-950 font-black text-sm px-5 py-3 rounded-xl shadow-xs transition-all active:scale-98 min-h-[46px] flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <span>{isFormValid ? 'Pay ₹500 Advance' : 'View Summary & Pay'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5. Mobile Summary Bottom Sheet Modal */}
      {isMobileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
            <TripSummaryCard
              direction={direction}
              vehicle={vehicle}
              pointName={selectedPoint.name}
              dateLabel={dateLabel}
              timeLabel={timeLabel}
              breakdown={fareBreakdown}
              isValid={isFormValid}
              isSubmitting={isSubmitting}
              onPayAdvance={handlePayAdvance}
              isMobileModal={true}
              onCloseMobileModal={() => setIsMobileModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* 6. Honest Payment Confirmation Modal (TEST PHASE FLOW) */}
      {confirmedBooking && (
        <PaymentConfirmationSheet
          bookingCode={confirmedBooking.bookingCode}
          name={confirmedBooking.name}
          phone={confirmedBooking.phone}
          direction={confirmedBooking.direction}
          pointName={confirmedBooking.pointName}
          vehicleName={confirmedBooking.vehicleName}
          pickupDateStr={confirmedBooking.pickupDateStr}
          pickupTimeLabel={confirmedBooking.pickupTimeLabel}
          passengers={confirmedBooking.passengers}
          breakdown={confirmedBooking.breakdown}
          whatsappUrl={confirmedBooking.whatsappUrl}
          isDuplicate={confirmedBooking.isDuplicate}
          onClose={() => setConfirmedBooking(null)}
        />
      )}

      {/* 7. Bottom Perks Marquee Bar */}
      <FooterMarquee />

      {/* 8. Trust & Legal Footer */}
      <FooterTrust />
    </div>
  )
}
