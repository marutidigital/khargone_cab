'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft, ShieldCheck, CheckCircle2, MapPin, Calendar, Clock, User, Phone, Car, Sparkles } from 'lucide-react'
import { Nav } from '@/components/Nav'
import { BookingStepper } from '@/components/BookingStepper'
import { SectionRoute } from '@/components/booking/SectionRoute'
import { SectionDropPoint } from '@/components/booking/SectionDropPoint'
import { SectionDate, type DateTileItem } from '@/components/booking/SectionDate'
import { SectionTimeSlot, type ExactTimeOption } from '@/components/booking/SectionTimeSlot'
import { SectionPassenger, type PassengerFormData } from '@/components/booking/SectionPassenger'
import { BookingPaymentPanel } from '@/components/booking/BookingPaymentPanel'
import { ConfirmedRidePicker, type ConfirmedRideSelection } from '@/components/booking/ConfirmedRidePicker'
import { BookingSuccessModal } from '@/components/booking/BookingSuccessModal'
import { PublicRideMatchingBoard } from '@/components/booking/PublicRideMatchingBoard'
import { FooterMarquee } from '@/components/FooterMarquee'
import { FooterTrust } from '@/components/FooterTrust'
import { PRICING_CONFIG, formatRs, isNightTime } from '@/config/pricing'
import { BOOKING_CONFIG, calculateBookingFare, type BookingMode, type RouteDirection } from '@/lib/config'
import { initUTMTracking, logEvent } from '@/lib/tracking'

function todayInIndia() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function daysFromTodayInIndia(date: string) {
  const dayStart = (value: string) => {
    const [year, month, day] = value.split('-').map(Number)
    return Date.UTC(year, month - 1, day)
  }
  return Math.max(0, Math.round((dayStart(date) - dayStart(todayInIndia())) / 86_400_000))
}

const APP_STEPS = [
  { id: 1, label: 'Route & Drop' },
  { id: 2, label: 'Date & Time' },
  { id: 3, label: 'Passenger' },
  { id: 4, label: 'Review & Book' },
]

export default function Home() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [direction, setDirection] = useState<'K2I' | 'I2K'>('K2I')
  const [pointId, setPointId] = useState('rajendra')
  const [date, setDate] = useState(todayInIndia)
  const [bookingTab, setBookingTab] = useState<'match' | 'confirmed'>('match')
  const [confirmedRidesAvailable, setConfirmedRidesAvailable] = useState(false)
  const [confirmedRide, setConfirmedRide] = useState<ConfirmedRideSelection | null>(null)
  const mode: BookingMode = 'match'
  const [time, setTime] = useState<ExactTimeOption | null>(null)
  const [passenger, setPassenger] = useState<PassengerFormData>({ name: '', phone: '', passengers: 1, consent: true, address: '' })
  const [matchAvailability, setMatchAvailability] = useState<{ ready: boolean; count: number } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notice, setNotice] = useState('')
  const [successData, setSuccessData] = useState<{
    bookingRef: string
    publicToken: string
    whatsappUrl: string
  } | null>(null)
  const idempotencyKey = useRef('')

  const point = PRICING_CONFIG.points.find((entry) => entry.id === pointId) || PRICING_CONFIG.points[0]
  const fare = useMemo(() => calculateBookingFare({ mode, direction, point: pointId as keyof typeof BOOKING_CONFIG.guaranteedFares, pickupTime: time?.timeStr || '12:00' }), [direction, mode, pointId, time])
  const dateLabel = useMemo(() => new Date(`${date}T00:00:00+05:30`).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' }), [date])
  const isPassengerValid = Boolean(passenger.name.trim().length >= 2 && /^[6-9]\d{9}$/.test(passenger.phone) && passenger.consent)
  const valid = Boolean(time && (bookingTab === 'match' || confirmedRide) && isPassengerValid)
  const today = date === todayInIndia()

  useEffect(() => { initUTMTracking(); void logEvent({ event: 'page_view' }) }, [])
  useEffect(() => {
    setMatchAvailability(null)
  }, [date, direction])

  useEffect(() => {
    let alive = true
    const refresh = async () => {
      try {
        const response = await fetch(`/api/bookings/confirmed-rides?direction=${direction}`, { cache: 'no-store' })
        const body = await response.json()
        if (!alive) return
        const available = response.ok && Array.isArray(body.rides) && body.rides.length > 0
        setConfirmedRidesAvailable(available)
        if (!available && bookingTab === 'confirmed') {
          setBookingTab('match')
          setConfirmedRide(null)
          setTime(null)
        }
      } catch {
        if (alive) setConfirmedRidesAvailable(false)
      }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 30_000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [bookingTab, direction])

  useEffect(() => {
    if (mode !== 'match' || bookingTab !== 'match' || !time) return
    const abort = new AbortController()
    fetch(`/api/bookings/availability?direction=${direction}&date=${date}&time=${time.timeStr}`, { signal: abort.signal })
      .then((response) => response.json())
      .then((value) => setMatchAvailability({ ready: value.ready === true, count: Number(value.count) || 0 }))
      .catch(() => setMatchAvailability({ ready: false, count: 0 }))
    return () => abort.abort()
  }, [bookingTab, date, direction, mode, time])

  const selectDate = useCallback((item: DateTileItem) => { setDate(item.dateStr); setTime(null) }, [])
  const selectDirection = (value: RouteDirection) => {
    setDirection(value)
    setTime(null)
    setConfirmedRide(null)
  }
  const selectConfirmedRide = (selection: ConfirmedRideSelection | null) => {
    idempotencyKey.current = ''
    setConfirmedRide(selection)
    if (!selection) { setTime(null); return }
    const [hourText, minuteText] = selection.returnTime.split(':')
    const hour = Number(hourText)
    const minute = Number(minuteText)
    setDate(selection.date)
    setPointId(selection.pointId)
    setTime({ timeStr: selection.returnTime, label12: `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`, hour, minute, isNight: isNightTime(hour, minute), disabled: false })
  }

  const goToStep = (stepNumber: number) => {
    setCurrentStep(stepNumber)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePaymentSuccessAndSubmit = async (paymentInfo: {
    orderId: string
    paymentId: string
    signature: string
    advancePaid: number
    couponCode?: string
  }) => {
    if (!valid || !time) {
      setNotice('Complete pickup time and passenger details before continuing.')
      return
    }
    setIsSubmitting(true)
    setNotice('')
    try {
      if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID()
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction,
          mode,
          point: pointId,
          date,
          time: time.timeStr,
          ...(bookingTab === 'confirmed' && confirmedRide ? { confirmedRideId: confirmedRide.id } : {}),
          name: passenger.name.trim(),
          phone: passenger.phone,
          passengers: passenger.passengers,
          address: passenger.address,
          consent: passenger.consent,
          idempotencyKey: idempotencyKey.current,
          paymentOrderId: paymentInfo.orderId,
          paymentId: paymentInfo.paymentId,
          paymentSignature: paymentInfo.signature,
          advancePaid: paymentInfo.advancePaid,
          couponCode: paymentInfo.couponCode,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not create your booking.')
      const publicToken = String(result.publicToken)
      window.sessionStorage.setItem('maruticab_booking_token', publicToken)
      setIsSubmitting(false)
      setSuccessData({
        bookingRef: result.bookingRef,
        publicToken: result.publicToken,
        whatsappUrl:
          result.whatsappUrl ||
          `https://wa.me/917282316090?text=${encodeURIComponent(
            `Hi MarutiCab, booking ${result.bookingRef} confirmed with advance payment.`
          )}`,
      })
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not start checkout.')
      setIsSubmitting(false)
    }
  }

  // Active step navigation helpers
  const completedSteps = [
    1,
    ...(date && time ? [2] : []),
    ...(isPassengerValid ? [3] : []),
    ...(valid ? [4] : []),
  ]

  return (
    <div className="min-h-screen bg-[#F4F4F5] text-slate-900 antialiased flex flex-col justify-between">
      <div>
        <Nav />
        <BookingStepper
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={goToStep}
          steps={APP_STEPS}
        />

        <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-8 sm:py-8">
          {/* Header */}
          <header className="mb-4 sm:mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h1 className="flex flex-wrap items-center gap-2 text-lg font-black tracking-tight sm:text-2xl">
                MarutiCab Private Cab
                <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-900">
                  {direction === 'K2I' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Private Economy Sedan · Doorstep/City Point drop · No stranger co-passengers
              </p>
            </div>
            <div className="flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Only ₹500 Advance · Balance after ride
            </div>
          </header>

          {notice && (
            <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
              {notice}
            </div>
          )}

          {/* Desktop Layout: 2-Column with Sticky Sidebar */}
          <div className="hidden lg:grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-6">
              <div id="section-route"><SectionRoute direction={direction} selectedPointName={point.name} onSelectDirection={selectDirection} /></div>
              
              {confirmedRidesAvailable && (
                <section className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2">
                  <button type="button" aria-pressed={bookingTab === 'match'} onClick={() => { idempotencyKey.current = ''; setBookingTab('match'); setConfirmedRide(null); setTime(null) }} className={`min-h-12 rounded-xl px-3 py-2 text-sm font-extrabold ${bookingTab === 'match' ? 'bg-amber-400 text-slate-950' : 'text-slate-600 hover:bg-slate-50'}`}>Match Deal</button>
                  <button type="button" aria-pressed={bookingTab === 'confirmed'} onClick={() => { idempotencyKey.current = ''; setBookingTab('confirmed'); setTime(null); setConfirmedRide(null) }} className={`min-h-12 rounded-xl px-3 py-2 text-sm font-extrabold ${bookingTab === 'confirmed' ? 'bg-amber-400 text-slate-950' : 'text-slate-600 hover:bg-slate-50'}`}>Confirmed Booking</button>
                </section>
              )}

              {bookingTab === 'confirmed' ? (
                <div id="section-point"><ConfirmedRidePicker direction={direction} selectedDate={date} selected={confirmedRide} onSelect={selectConfirmedRide} /></div>
              ) : (
                <>
                  <div id="section-point"><SectionDropPoint direction={direction} vehicle="sedan" daysAhead={0} travelDate={date} selectedPointId={pointId} onSelectPoint={(value) => { setPointId(value); setTime(null) }} /></div>
                  <div id="section-date"><SectionDate pointId={pointId} vehicle="sedan" direction={direction} selectedDateStr={date} onSelectDate={selectDate} /></div>
                  <div id="section-time"><SectionTimeSlot isToday={today} direction={direction} selectedTimeStr={time?.timeStr || null} onSelectTime={setTime} matchAvailability={matchAvailability} /></div>
                </>
              )}

              <div id="section-passenger"><SectionPassenger maxPassengers={4} data={passenger} onChange={(patch) => setPassenger((current) => ({ ...current, ...patch }))} errors={{}} /></div>
            </div>

            <aside className="sticky top-20" id="section-payment">
              <BookingPaymentPanel
                mode={mode}
                breakdown={fare}
                dateLabel={dateLabel}
                timeLabel={time?.label12 || null}
                isValid={valid}
                isSubmitting={isSubmitting}
                passengerName={passenger.name}
                passengerPhone={passenger.phone}
                onPaymentSuccess={handlePaymentSuccessAndSubmit}
                bookingLabel={bookingTab === 'confirmed' ? 'Confirmed Booking · Return leg' : undefined}
              />
              {bookingTab === 'confirmed' && confirmedRide && (
                <p className="mt-2 text-center text-xs font-semibold text-emerald-800">
                  Your ride is paired with {confirmedRide.existingDirection === 'K2I' ? 'Khargone → Indore' : 'Indore → Khargone'} on {dateLabel}.
                </p>
              )}
            </aside>
          </div>

          {/* Mobile Native App View (Step-by-Step Card Flow) */}
          <div className="lg:hidden space-y-4 max-w-lg mx-auto">
            {/* STEP 1: ROUTE & DROP POINT */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <SectionRoute direction={direction} selectedPointName={point.name} onSelectDirection={selectDirection} />

                {confirmedRidesAvailable && (
                  <section className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs">
                    <button type="button" aria-pressed={bookingTab === 'match'} onClick={() => { idempotencyKey.current = ''; setBookingTab('match'); setConfirmedRide(null); setTime(null) }} className={`py-2 px-3 rounded-xl text-xs font-extrabold ${bookingTab === 'match' ? 'bg-amber-400 text-slate-950' : 'text-slate-600'}`}>Match Deal</button>
                    <button type="button" aria-pressed={bookingTab === 'confirmed'} onClick={() => { idempotencyKey.current = ''; setBookingTab('confirmed'); setTime(null); setConfirmedRide(null) }} className={`py-2 px-3 rounded-xl text-xs font-extrabold ${bookingTab === 'confirmed' ? 'bg-amber-400 text-slate-950' : 'text-slate-600'}`}>Confirmed</button>
                  </section>
                )}

                {bookingTab === 'confirmed' ? (
                  <ConfirmedRidePicker direction={direction} selectedDate={date} selected={confirmedRide} onSelect={selectConfirmedRide} />
                ) : (
                  <SectionDropPoint direction={direction} vehicle="sedan" daysAhead={0} travelDate={date} selectedPointId={pointId} onSelectPoint={(value) => { setPointId(value); setTime(null) }} />
                )}
              </div>
            )}

            {/* STEP 2: DATE & TIME */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Compact Selected Route Pill */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {direction === 'K2I' ? `Khargone ➔ ${point.name}` : `${point.name} ➔ Khargone`}
                    </span>
                  </div>
                  <button type="button" onClick={() => goToStep(1)} className="text-xs font-bold text-amber-700 underline cursor-pointer">
                    Change
                  </button>
                </div>

                <SectionDate pointId={pointId} vehicle="sedan" direction={direction} selectedDateStr={date} onSelectDate={selectDate} />
                <SectionTimeSlot isToday={today} direction={direction} selectedTimeStr={time?.timeStr || null} onSelectTime={setTime} matchAvailability={matchAvailability} />
              </div>
            )}

            {/* STEP 3: PASSENGER DETAILS */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Trip Summary Chip */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-between text-xs font-semibold shadow-xs">
                  <div className="flex items-center gap-2 text-slate-800 truncate">
                    <Calendar className="h-4 w-4 text-amber-600" />
                    <span>{dateLabel}</span>
                    <span>·</span>
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span>{time?.label12 || 'Time not set'}</span>
                  </div>
                  <button type="button" onClick={() => goToStep(2)} className="text-amber-700 underline font-bold cursor-pointer">
                    Change
                  </button>
                </div>

                <SectionPassenger maxPassengers={4} data={passenger} onChange={(patch) => setPassenger((current) => ({ ...current, ...patch }))} errors={{}} />
              </div>
            )}

            {/* STEP 4: REVIEW & CONFIRM WITH ADVANCE PAYMENT */}
            {currentStep === 4 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <BookingPaymentPanel
                  mode={mode}
                  breakdown={fare}
                  dateLabel={dateLabel}
                  timeLabel={time?.label12 || null}
                  isValid={valid}
                  isSubmitting={isSubmitting}
                  passengerName={passenger.name}
                  passengerPhone={passenger.phone}
                  onPaymentSuccess={handlePaymentSuccessAndSubmit}
                  bookingLabel={bookingTab === 'confirmed' ? 'Confirmed Booking · Return leg' : undefined}
                />
              </div>
            )}
          </div>

          {/* Public Ride Matching Board (Available Rides – Complete Your Round 🚕) */}
          <div className="mt-8">
            <PublicRideMatchingBoard
              onBookingSuccess={(bookingRef: string, publicToken: string, whatsappUrl: string) => {
                setSuccessData({
                  bookingRef,
                  publicToken,
                  whatsappUrl,
                })
              }}
            />
          </div>
        </main>
      </div>

      {/* Mobile Native Sticky Action Bar */}
      <div className="sticky bottom-0 z-50 border-t border-slate-200/90 bg-white/95 px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] backdrop-blur-md shadow-2xl lg:hidden">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          {/* Total Price Display */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Fare</div>
            <div className="flex items-baseline gap-1">
              <strong className="text-xl font-black text-slate-900">{formatRs(fare.totalFare)}</strong>
              <span className="text-[10px] font-semibold text-emerald-700">· In cab</span>
            </div>
          </div>

          {/* Dynamic Action Buttons per Step */}
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => goToStep(currentStep - 1)}
                className="flex min-h-[46px] items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                aria-label="Previous step"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}

            {currentStep === 1 && (
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="flex min-h-[46px] items-center gap-1.5 rounded-xl bg-[#FBBF24] hover:bg-[#F59E0B] text-slate-950 px-5 py-2.5 text-xs font-black shadow-sm transition-all active:scale-98 cursor-pointer"
              >
                <span>Select Date & Time</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                disabled={!time}
                onClick={() => goToStep(3)}
                className="flex min-h-[46px] items-center gap-1.5 rounded-xl bg-[#FBBF24] hover:bg-[#F59E0B] disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 px-5 py-2.5 text-xs font-black shadow-sm transition-all active:scale-98 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>{time ? 'Passenger Details' : 'Select Time'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                disabled={!isPassengerValid}
                onClick={() => goToStep(4)}
                className="flex min-h-[46px] items-center gap-1.5 rounded-xl bg-[#FBBF24] hover:bg-[#F59E0B] disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 px-5 py-2.5 text-xs font-black shadow-sm transition-all active:scale-98 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Review Booking</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {currentStep === 4 && (
              <span className="text-xs font-black text-amber-800 bg-amber-100 px-3 py-2 rounded-xl">
                Complete Advance Above 👆
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Booking Success WhatsApp Modal */}
      {successData && (
        <BookingSuccessModal
          isOpen={Boolean(successData)}
          bookingRef={successData.bookingRef}
          publicToken={successData.publicToken}
          direction={direction}
          pointName={point.name}
          date={dateLabel}
          time={time?.label12 || ''}
          passengerName={passenger.name}
          phone={passenger.phone}
          totalFare={fare.totalFare}
          whatsappUrl={successData.whatsappUrl}
          onClose={() => {
            const token = successData.publicToken
            setSuccessData(null)
            router.push(`/booking/${token}`)
          }}
          onViewStatus={() => {
            const token = successData.publicToken
            setSuccessData(null)
            router.push(`/booking/${token}`)
          }}
        />
      )}

      <div className="hidden lg:block">
        <FooterMarquee />
        <FooterTrust />
      </div>
    </div>
  )
}
