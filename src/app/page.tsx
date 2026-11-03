'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { Nav } from '@/components/Nav'
import { BookingStepper } from '@/components/BookingStepper'
import { SectionRoute } from '@/components/booking/SectionRoute'
import { SectionDropPoint } from '@/components/booking/SectionDropPoint'
import { SectionDate, type DateTileItem } from '@/components/booking/SectionDate'
import { SectionTimeSlot, type ExactTimeOption } from '@/components/booking/SectionTimeSlot'
import { SectionPassenger, type PassengerFormData } from '@/components/booking/SectionPassenger'
import { BookingModeSelector } from '@/components/booking/BookingModeSelector'
import { BookingPaymentPanel } from '@/components/booking/BookingPaymentPanel'
import { ConfirmedRidePicker, type ConfirmedRideSelection } from '@/components/booking/ConfirmedRidePicker'
import { BookingSuccessModal } from '@/components/booking/BookingSuccessModal'
import { FooterMarquee } from '@/components/FooterMarquee'
import { FooterTrust } from '@/components/FooterTrust'
import { PRICING_CONFIG, formatRs } from '@/config/pricing'
import { isNightTime } from '@/config/pricing'
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

export default function Home() {
  const router = useRouter()
  const [direction, setDirection] = useState<'K2I' | 'I2K'>('K2I')
  const [pointId, setPointId] = useState('rajendra')
  const [date, setDate] = useState(todayInIndia)
  const [bookingTab, setBookingTab] = useState<'match' | 'confirmed'>('match')
  const [confirmedRidesAvailable, setConfirmedRidesAvailable] = useState(false)
  const [confirmedRide, setConfirmedRide] = useState<ConfirmedRideSelection | null>(null)
  const mode: BookingMode = 'match'
  const [time, setTime] = useState<ExactTimeOption | null>(null)
  const [passenger, setPassenger] = useState<PassengerFormData>({ name: '', phone: '', passengers: 1, consent: false, address: '' })
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
  const daysAhead = useMemo(() => daysFromTodayInIndia(date), [date])
  const valid = Boolean(time && (bookingTab === 'match' || confirmedRide) && passenger.name.trim().length >= 2 && /^[6-9]\d{9}$/.test(passenger.phone) && passenger.consent)
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
  const submit = async () => {
    if (!valid || !time) { setNotice('Complete the pickup time, passenger details, and consent before continuing.'); return }
    setIsSubmitting(true); setNotice('')
    try {
      if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID()
      const response = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction, mode, point: pointId, date, time: time.timeStr, ...(bookingTab === 'confirmed' && confirmedRide ? { confirmedRideId: confirmedRide.id } : {}), name: passenger.name.trim(), phone: passenger.phone, passengers: passenger.passengers, address: passenger.address, consent: passenger.consent, idempotencyKey: idempotencyKey.current }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not create your booking.')
      const publicToken = String(result.publicToken)
      window.sessionStorage.setItem('maruticab_booking_token', publicToken)
      setIsSubmitting(false)
      setSuccessData({
        bookingRef: result.bookingRef,
        publicToken: result.publicToken,
        whatsappUrl: result.whatsappUrl || `https://wa.me/917282316090?text=${encodeURIComponent(`Hi MarutiCab, booking ${result.bookingRef} request submitted.`)}`,
      })
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not start checkout.')
      setIsSubmitting(false)
    }
  }

  const completed = [1, 2, ...(date ? [3] : []), ...(mode ? [4] : []), ...(time ? [5] : []), ...(valid ? [6] : [])]
  const scrollToSection = (step: number) => document.getElementById(['', 'section-route', 'section-point', 'section-date', 'section-mode', 'section-time', 'section-passenger', 'section-payment'][step])?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return <div className="min-h-screen bg-[#F4F4F5] text-slate-900 antialiased">
    <Nav />
    <BookingStepper currentStep={valid ? 7 : time ? 6 : mode ? 5 : 3} completedSteps={completed} onStepClick={scrollToSection} />
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <header className="mb-6 flex flex-col justify-between gap-3 sm:mb-8 sm:flex-row sm:items-center">
        <div><h1 className="flex flex-wrap items-center gap-2 text-xl font-black tracking-tight sm:text-2xl">Book a MarutiCab <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-900">Khargone ↔ Indore</span></h1><p className="mt-1 text-sm text-slate-600">Private Economy Sedan · Fixed pickup time · No shared passengers</p></div>
        <div className="flex items-center gap-2 self-start rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"><ShieldCheck className="h-4 w-4" /> Book now · Pay in the cab</div>
      </header>
      {notice && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{notice}</div>}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <div className="space-y-5 sm:space-y-6">
          <div id="section-route" className="scroll-mt-24"><SectionRoute direction={direction} selectedPointName={point.name} onSelectDirection={selectDirection} /></div>
          <section className={`grid ${confirmedRidesAvailable ? 'grid-cols-2' : 'grid-cols-1'} gap-2 rounded-2xl border border-slate-200 bg-white p-2`} aria-label="Booking type">
            <button type="button" aria-pressed={bookingTab === 'match'} onClick={() => { idempotencyKey.current = ''; setBookingTab('match'); setConfirmedRide(null); setTime(null) }} className={`min-h-12 rounded-xl px-3 py-2 text-sm font-extrabold ${bookingTab === 'match' ? 'bg-amber-400 text-slate-950' : 'text-slate-600 hover:bg-slate-50'}`}>Match Deal</button>
            {confirmedRidesAvailable && <button type="button" aria-pressed={bookingTab === 'confirmed'} onClick={() => { idempotencyKey.current = ''; setBookingTab('confirmed'); setTime(null); setConfirmedRide(null) }} className={`min-h-12 rounded-xl px-3 py-2 text-sm font-extrabold ${bookingTab === 'confirmed' ? 'bg-amber-400 text-slate-950' : 'text-slate-600 hover:bg-slate-50'}`}>Confirmed Booking</button>}
          </section>
          {bookingTab === 'confirmed' ? <div id="section-point" className="scroll-mt-24"><ConfirmedRidePicker direction={direction} selected={confirmedRide} onSelect={selectConfirmedRide} /></div> : <>
            <div id="section-point" className="scroll-mt-24"><SectionDropPoint direction={direction} vehicle="sedan" daysAhead={0} travelDate={date} selectedPointId={pointId} onSelectPoint={(value) => { setPointId(value); setTime(null) }} /></div>
            <div id="section-date" className="scroll-mt-24"><SectionDate pointId={pointId} vehicle="sedan" direction={direction} selectedDateStr={date} onSelectDate={selectDate} /></div>
            <div id="section-mode" className="scroll-mt-24"><BookingModeSelector direction={direction} point={pointId as keyof typeof BOOKING_CONFIG.guaranteedFares} daysAhead={daysAhead} /></div>
            <div id="section-time" className="scroll-mt-24"><SectionTimeSlot isToday={today} direction={direction} selectedTimeStr={time?.timeStr || null} onSelectTime={setTime} matchAvailability={matchAvailability} /></div>
          </>}
          <div id="section-passenger" className="scroll-mt-24"><SectionPassenger maxPassengers={4} data={passenger} onChange={(patch) => setPassenger((current) => ({ ...current, ...patch }))} errors={{}} /></div>
          <div id="section-payment" className="scroll-mt-24 lg:hidden"><BookingPaymentPanel mode={mode} breakdown={fare} dateLabel={dateLabel} timeLabel={time?.label12 || null} isValid={valid} isSubmitting={isSubmitting} onPay={() => void submit()} bookingLabel={bookingTab === 'confirmed' ? 'Confirmed Booking · Return leg' : undefined} />{bookingTab === 'confirmed' && confirmedRide && <p className="mt-2 text-center text-xs font-semibold text-emerald-800">Your selected ride will be paired with the {confirmedRide.existingDirection === 'K2I' ? 'Khargone → Indore' : 'Indore → Khargone'} ride on {dateLabel}.</p>}</div>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7"><h2 className="text-lg font-extrabold">Frequently asked questions</h2><div className="mt-4 space-y-4 text-sm"><details><summary className="cursor-pointer font-bold">When will I know about the match?</summary><p className="mt-2 text-slate-600">We notify you as soon as a compatible opposite-direction booking is found. Booking at least two days ahead gives us more time to find a match.</p></details><details><summary className="cursor-pointer font-bold">When do I pay?</summary><p className="mt-2 text-slate-600">There is no online payment or advance. Pay the full displayed fare in the cab after the booking is confirmed.</p></details><details><summary className="cursor-pointer font-bold">Can I choose any pickup time?</summary><p className="mt-2 text-slate-600">Yes. Pick any future time. Night pickups from 9:00 PM to 4:00 AM include a ₹400 charge.</p></details><details><summary className="cursor-pointer font-bold">Can I cancel?</summary><p className="mt-2 text-slate-600">You can cancel while your Match Deal is waiting for confirmation. Online cancellation is unavailable once the ride is confirmed.</p></details><details><summary className="cursor-pointer font-bold">Is the cab shared with strangers?</summary><p className="mt-2 text-slate-600">No. You get a private cab. The return trip is matched with a separate customer going the other way.</p></details></div></section>
        </div>
        <aside className="hidden lg:sticky lg:top-20 lg:block" id="section-payment"><BookingPaymentPanel mode={mode} breakdown={fare} dateLabel={dateLabel} timeLabel={time?.label12 || null} isValid={valid} isSubmitting={isSubmitting} onPay={() => void submit()} bookingLabel={bookingTab === 'confirmed' ? 'Confirmed Booking · Return leg' : undefined} />{bookingTab === 'confirmed' && confirmedRide && <p className="mt-2 text-center text-xs font-semibold text-emerald-800">Your selected ride will be paired with the {confirmedRide.existingDirection === 'K2I' ? 'Khargone → Indore' : 'Indore → Khargone'} ride on {dateLabel}.</p>}</aside>
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900"><ShieldCheck className="h-4 w-4" />Tolls included · No driver allowance · No parking charges · Extra distance ₹{BOOKING_CONFIG.extraKmRate}/km</div>
    </main>
    {/* Mobile Native App Sticky Action Bar */}
    <div className="sticky bottom-0 z-30 flex items-center justify-between gap-3 border-t border-slate-200/80 bg-white/95 px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] backdrop-blur-md shadow-lg lg:hidden">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Fare</div>
        <div className="flex items-baseline gap-1">
          <strong className="text-xl font-black text-slate-900">{formatRs(fare.totalFare)}</strong>
          <span className="text-[10px] font-semibold text-emerald-700">· Pay in cab</span>
        </div>
      </div>

      {!time ? (
        <button
          type="button"
          onClick={() => scrollToSection(5)}
          className="flex min-h-[46px] items-center gap-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 active:scale-98 text-amber-950 px-4 py-2 text-xs font-black transition-all cursor-pointer"
        >
          <span>Select Time</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      ) : !valid ? (
        <button
          type="button"
          onClick={() => scrollToSection(6)}
          className="flex min-h-[46px] items-center gap-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 active:scale-98 text-amber-950 px-4 py-2 text-xs font-black transition-all cursor-pointer"
        >
          <span>Add Details</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      ) : (
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void submit()}
          className="flex min-h-[46px] items-center gap-2 rounded-xl bg-[#FBBF24] hover:bg-[#F59E0B] text-slate-950 px-5 py-2.5 text-sm font-black shadow-sm transition-all active:scale-98 cursor-pointer disabled:opacity-50"
        >
          <span>{isSubmitting ? 'Booking…' : 'Book MarutiCab'}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
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
    <FooterMarquee /><FooterTrust />
  </div>
}
