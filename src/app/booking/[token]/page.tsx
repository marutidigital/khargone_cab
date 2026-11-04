'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  MessageCircle,
  Phone,
  Car,
  MapPin,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  CreditCard,
  Banknote,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
} from 'lucide-react'
import { Nav } from '@/components/Nav'
import { formatRs } from '@/config/pricing'

type DriverInfo = {
  name: string
  phone: string
  vehicle_number: string
  vehicle_model?: string
}

type BookingView = {
  booking_ref: string
  mode: string
  status: string
  direction: string
  drop_name: string
  address?: string | null
  travel_date: string
  pickup_time: string
  passenger_count: number
  passenger_name: string
  phone: string
  total_fare: number
  advance_amount: number
  advance_paid: number
  balance_amount: number
  cutoff_at: string | null
  refund_status: string
  driver_name?: string | null
  driver: DriverInfo | null
}

const SUPPORT_PHONE = '8878933778'
const SUPPORT_WA = '918878933778'

export default function BookingStatusPage() {
  const { token } = useParams<{ token: string }>()
  const [booking, setBooking] = useState<BookingView | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [upgradePaymentUrl, setUpgradePaymentUrl] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/booking/${encodeURIComponent(token)}`, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) {
        setError(body.error || 'Could not load booking details.')
      } else {
        setError('')
        setBooking(body.booking)
      }
    } catch {
      setError('Unable to reach server. Please check your internet connection.')
    }
  }, [token])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 30_000)
    return () => window.clearInterval(timer)
  }, [load])

  const handleDecision = async (action: 'refund' | 'upgrade') => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/booking/${encodeURIComponent(token)}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const body = await response.json()
      if (!response.ok) {
        setError(body.error || 'Could not update booking.')
      } else if (action === 'upgrade' && body.paymentUrl) {
        setUpgradePaymentUrl(body.paymentUrl)
      } else {
        await load()
      }
    } catch {
      setError('Could not update booking. Please contact support on WhatsApp.')
    } finally {
      setBusy(false)
    }
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Nav />
        <main className="mx-auto max-w-xl px-4 py-12">
          <div className="rounded-3xl border border-rose-200 bg-white p-6 sm:p-8 text-center shadow-sm">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h1 className="text-xl font-black text-slate-900">Booking Not Found</h1>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/"
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm"
              >
                Back to Home
              </Link>
              <a
                href={`https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent('Hi MarutiCab, I need help with my booking link.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Contact Support</span>
              </a>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const isConfirmed = booking?.status === 'confirmed' || booking?.status === 'matched'
  const isWaiting = booking?.status === 'waiting'
  const isCancelled = booking?.status === 'cancelled'
  const isRefunded = booking?.status === 'refunded'
  const isNoMatch = booking?.status === 'no_match_decision'
  const isCompleted = booking?.status === 'completed'

  const routeLabel = booking?.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'
  const totalFare = booking?.total_fare || 0
  const advancePaid = booking?.advance_paid || booking?.advance_amount || 500
  const balanceToDriver = booking?.balance_amount || Math.max(0, totalFare - advancePaid)

  const supportMessage = booking
    ? `Namaste MarutiCab, meri booking ref #${booking.booking_ref} (${booking.passenger_name}) ke baare me baat karni hai.`
    : 'Namaste MarutiCab, mujhe cab booking support chahiye.'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <Nav />

      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        {!booking ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
            <p className="mt-4 text-sm font-bold text-slate-600">Loading booking details…</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {/* Top Status Header */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                  Dedicated Sedan Service
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">
                  Ref: <strong className="text-slate-900 text-sm font-black">{booking.booking_ref}</strong>
                </span>
              </div>

              {/* Status Alert Banner */}
              <div className="mt-4">
                {isConfirmed && (
                  <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/90 p-4">
                    <div className="flex items-center gap-2 text-emerald-900 font-black text-base sm:text-lg">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                      <span>Booking Confirmed · Dedicated Sedan Scheduled</span>
                    </div>
                    <p className="text-xs text-emerald-800 font-medium mt-1.5 leading-relaxed">
                      Your cab schedule is locked with an opposite passenger. <strong>Confirmed bookings cannot be cancelled or refunded</strong> as the return vehicle is secured.
                    </p>
                  </div>
                )}

                {isWaiting && (
                  <div className="rounded-2xl border-2 border-amber-400 bg-amber-50/90 p-4">
                    <div className="flex items-center gap-2 text-amber-950 font-black text-base sm:text-lg">
                      <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>Advance Received · Matching Opposite Return Cab</span>
                    </div>
                    <p className="text-xs text-amber-900 font-medium mt-1.5 leading-relaxed">
                      We are pairing your trip with an opposite passenger. Decision cutoff: {booking.cutoff_at ? new Date(booking.cutoff_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) : '6 hours prior to departure'}. If no match is found, your ₹{advancePaid} advance is 100% refunded immediately.
                    </p>
                  </div>
                )}

                {isCancelled && (
                  <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4">
                    <div className="flex items-center gap-2 text-rose-900 font-black text-base">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                      <span>Booking Cancelled</span>
                    </div>
                    <p className="text-xs text-rose-800 font-medium mt-1">
                      {booking.refund_status === 'processed'
                        ? 'Your full advance payment has been refunded to your original payment method.'
                        : 'Your booking has been cancelled. For any queries, contact operations.'}
                    </p>
                  </div>
                )}

                {isRefunded && (
                  <div className="rounded-2xl border border-violet-300 bg-violet-50 p-4">
                    <div className="flex items-center gap-2 text-violet-900 font-black text-base">
                      <CheckCircle2 className="w-5 h-5 text-violet-600 shrink-0" />
                      <span>Advance Refunded</span>
                    </div>
                    <p className="text-xs text-violet-800 font-medium mt-1">
                      Full refund of ₹{advancePaid} has been credited to your payment source.
                    </p>
                  </div>
                )}

                {isCompleted && (
                  <div className="rounded-2xl border border-indigo-300 bg-indigo-50 p-4">
                    <div className="flex items-center gap-2 text-indigo-900 font-black text-base">
                      <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                      <span>Trip Completed · Thank You!</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Ride & Passenger Details Grid */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Trip Itinerary
                  </div>
                  <div className="font-black text-slate-950 text-sm">{routeLabel}</div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span><strong>Date:</strong> {booking.travel_date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span><strong>Pickup Time:</strong> {booking.pickup_time.slice(0, 5)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span><strong>Drop:</strong> {booking.drop_name}</span>
                  </div>
                  {booking.address && (
                    <div className="text-[11px] text-slate-500 pl-5">
                      Pickup: {booking.address}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Passenger Details
                  </div>
                  <div className="font-black text-slate-950 text-sm flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>{booking.passenger_name}</span>
                  </div>
                  <div className="text-slate-700">
                    <strong>WhatsApp:</strong> {booking.phone}
                  </div>
                  <div className="text-slate-700">
                    <strong>Vehicle Type:</strong> Private 4-Seater Dedicated Sedan
                  </div>
                  <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Private Cab · No strangers shared</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dedicated Driver & Vehicle Section */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Car className="w-5 h-5 text-amber-600" />
                <h2 className="text-base font-black text-slate-900">
                  Assigned Driver & Dedicated Cab
                </h2>
              </div>

              {booking.driver ? (
                <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs text-slate-500 font-semibold">Driver Name</div>
                      <div className="text-base font-black text-slate-900">{booking.driver.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-semibold">Vehicle Reg No.</div>
                      <div className="text-sm font-mono font-black text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-300">
                        {booking.driver.vehicle_number}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-700">
                    <strong>Cab Model:</strong> {booking.driver.vehicle_model || 'Maruti Suzuki Dzire VXI (AC Sedan)'}
                  </div>

                  <div className="pt-2 flex flex-wrap gap-2.5">
                    {booking.driver.phone && (
                      <>
                        <a
                          href={`tel:${booking.driver.phone}`}
                          className="flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold px-3.5 py-2 rounded-xl active:scale-95 transition"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call Driver ({booking.driver.phone})</span>
                        </a>

                        <a
                          href={`https://wa.me/91${booking.driver.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Hi ${booking.driver.name}, I am ${booking.passenger_name}, passenger of MarutiCab booking #${booking.booking_ref}.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold px-3.5 py-2 rounded-xl active:scale-95 transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-white" />
                          <span>WhatsApp Driver</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-amber-50/70 border border-amber-200 p-4">
                  <p className="text-xs text-amber-950 font-semibold leading-relaxed">
                    🚘 <strong>Dedicated AC Sedan (Dzire / Amaze):</strong>
                  </p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Your cab dispatch is being scheduled. Exact driver name, phone number, and cab registration plate will be sent to your WhatsApp <strong>2 hours prior to your scheduled pickup time</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Transparent Payment Breakdown */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <CreditCard className="w-5 h-5 text-amber-600" />
                <h2 className="text-base font-black text-slate-900">
                  Fare & Payment Summary
                </h2>
              </div>

              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-700">
                  <span>Total One-Way Fixed Fare (Tolls Included):</span>
                  <strong className="text-sm font-black text-slate-950">{formatRs(totalFare)}</strong>
                </div>

                <div className="flex justify-between items-center bg-emerald-50 text-emerald-900 p-2.5 rounded-xl border border-emerald-200">
                  <span className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Advance Online Payment Received:</span>
                  </span>
                  <strong className="text-sm font-black text-emerald-950">{formatRs(advancePaid)}</strong>
                </div>

                <div className="flex justify-between items-center bg-amber-50 text-amber-950 p-2.5 rounded-xl border border-amber-200 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-amber-700" />
                    <span>Remaining Balance to Pay in Cab:</span>
                  </span>
                  <strong className="text-base font-black text-amber-950">{formatRs(balanceToDriver)}</strong>
                </div>

                <p className="text-[11px] text-slate-500 pt-1">
                  Pay the remaining ₹{balanceToDriver} balance directly to your driver after pickup via Cash or UPI QR.
                </p>
              </div>

              {/* Extra Run / Out-of-station Policy Box */}
              <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-3.5 sm:p-4">
                <div className="flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 space-y-1">
                    <strong className="text-slate-900 block">Extra Run & Travel Beyond Destination Policy:</strong>
                    <p className="leading-relaxed text-slate-600">
                      The quoted fare includes pickup and direct drop up to your chosen destination (<strong>{booking.drop_name}</strong>). Any additional local running, multi-point stops, or travel beyond the chosen destination point is charged at <strong>₹13/km</strong>, payable directly to the driver in the cab.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Support & Assistance (No Cancel Button - Support Channel) */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs text-center space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Need Help or Have Questions?
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                For trip updates, time rescheduling, special luggage requests, or assistance, contact our dispatch desk directly on WhatsApp.
              </p>
              <div className="pt-1 flex flex-col sm:flex-row gap-2.5 justify-center">
                <a
                  href={`https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent(supportMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs sm:text-sm px-5 py-3 transition shadow-xs active:scale-98 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>Chat on WhatsApp (+91 {SUPPORT_PHONE})</span>
                </a>

                <a
                  href={`tel:${SUPPORT_PHONE}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-black text-white font-extrabold text-xs sm:text-sm px-4 py-3 transition active:scale-98"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call Operations</span>
                </a>
              </div>
            </div>

            {/* Return link */}
            <div className="text-center pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 underline"
              >
                <span>Book Another Ride</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
