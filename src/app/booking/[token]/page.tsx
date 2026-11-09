'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2,
  Clock,
  Car,
  MapPin,
  Calendar,
  Phone,
  ShieldCheck,
  CreditCard,
  MessageCircle,
  Copy,
  Check,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { Nav } from '@/components/Nav'

interface DriverInfo {
  id?: string
  name: string
  phone: string
  vehicle_number: string
  vehicle_model?: string
}

interface BookingView {
  id: string
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
  masked_phone?: string
  total_fare: number
  advance_amount: number
  advance_paid: number
  balance_amount: number
  cutoff_at?: string | null
  refund_status?: string
  driver_name?: string | null
  driver?: DriverInfo | null
  created_at?: string
}

const SUPPORT_PHONE = '+917282316090'
const SUPPORT_WA = '917282316090'

export default function BookingConfirmationPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [booking, setBooking] = useState<BookingView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadBooking = useCallback(async (showIndicator = false) => {
    if (!token) return
    if (showIndicator) setIsRefreshing(true)
    try {
      const res = await fetch(`/api/booking/${encodeURIComponent(token)}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not load your booking details.')
      } else {
        setBooking(data.booking)
        setError('')
      }
    } catch {
      setError('Unable to load booking. Please check your internet connection.')
    } finally {
      setLoading(false)
      if (showIndicator) setIsRefreshing(false)
    }
  }, [token])

  useEffect(() => {
    void loadBooking()
    // Live polling every 10 seconds to update match or driver status automatically
    const interval = window.setInterval(() => {
      void loadBooking()
    }, 10_000)
    return () => window.clearInterval(interval)
  }, [loadBooking])

  const copyRef = () => {
    if (!booking?.booking_ref) return
    navigator.clipboard.writeText(booking.booking_ref).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  const formatPickupDate = (dateStr?: string) => {
    if (!dateStr) return ''
    try {
      const d = new Date(`${dateStr}T12:00:00+05:30`)
      return new Intl.DateTimeFormat('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d)
    } catch {
      return dateStr
    }
  }

  const formatPickupTime12h = (timeStr?: string) => {
    if (!timeStr) return ''
    const [h, m] = timeStr.split(':').map(Number)
    if (Number.isNaN(h)) return timeStr
    const period = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${String(h12).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${period}`
  }

  const isConfirmed = booking?.status === 'confirmed' || booking?.mode === 'confirmed'
  const isWaitingMatch = booking?.status === 'waiting' && booking?.mode === 'match'
  const isCompleted = booking?.status === 'completed'
  const isCancelled = booking?.status === 'cancelled' || booking?.status === 'refunded'

  const routeLabel = booking?.direction === 'KI'
    ? 'Khargone ➔ Indore'
    : 'Indore ➔ Khargone'

  const whatsappMessage = encodeURIComponent(
    `Hi MarutiCab, I have booked a cab #${booking?.booking_ref || ''} (${routeLabel} on ${booking?.travel_date || ''}). Please share details.`
  )
  const whatsappUrl = `https://wa.me/${SUPPORT_WA}?text=${whatsappMessage}`

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-amber-400 selection:text-slate-950">
      <Nav />

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
        {loading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center backdrop-blur-md animate-pulse">
            <div className="mx-auto h-16 w-16 rounded-full bg-slate-800" />
            <div className="mx-auto mt-4 h-6 w-48 rounded bg-slate-800" />
            <div className="mx-auto mt-2 h-4 w-72 rounded bg-slate-800" />
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-900/60 bg-rose-950/40 p-8 text-center backdrop-blur-md">
            <AlertCircle className="mx-auto h-12 w-12 text-rose-400" />
            <h1 className="mt-3 text-xl font-black text-rose-200">Booking Link Not Found</h1>
            <p className="mt-2 text-sm text-rose-300/80">{error}</p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={`https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent('Hi MarutiCab, my booking link is not loading.')}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-3 text-sm font-extrabold text-white transition shadow-lg shadow-emerald-950/50"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp Support
              </a>
              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 hover:bg-slate-800 px-5 py-3 text-sm font-bold text-slate-200 transition"
              >
                Go to Home
              </Link>
            </div>
          </div>
        ) : booking ? (
          <div className="space-y-6">
            {/* ── 1. STATUS HERO BANNER ── */}
            {isConfirmed ? (
              <section className="relative overflow-hidden rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/80 via-slate-950 to-emerald-950/50 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 ring-4 ring-emerald-500/30">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 animate-in zoom-in-75 duration-300" />
                </div>
                
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/80 px-3.5 py-1 text-xs font-black tracking-wide text-emerald-300 uppercase shadow-inner">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Booking Confirmed · Booking ID #{booking.booking_ref}
                </div>

                <h1 className="mt-3 text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Your Booking is Confirmed! 🎉
                </h1>
                <p className="mt-1 text-sm font-medium text-emerald-300">
                  आपकी बुकिंग कन्फर्म हो गई है!
                </p>

                {/* Driver Dispatch Status Message */}
                <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/50 p-4 text-left">
                  {booking.driver ? (
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                          🚗 Assigned Driver & Cab
                        </span>
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                          Ready for Duty
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-slate-900/80 p-3 border border-emerald-500/20">
                          <p className="text-[11px] text-slate-400 font-medium">Driver Name</p>
                          <p className="text-base font-black text-white mt-0.5">{booking.driver.name}</p>
                          <a
                            href={`tel:${booking.driver.phone}`}
                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300"
                          >
                            <Phone className="h-3.5 w-3.5" /> Call Driver ({booking.driver.phone})
                          </a>
                        </div>
                        <div className="rounded-xl bg-slate-900/80 p-3 border border-emerald-500/20">
                          <p className="text-[11px] text-slate-400 font-medium">Vehicle / Sedan</p>
                          <p className="text-base font-black text-white mt-0.5">
                            {booking.driver.vehicle_model || 'Private AC Sedan'}
                          </p>
                          <p className="text-xs font-mono font-bold text-amber-300 mt-1 uppercase tracking-wider">
                            {booking.driver.vehicle_number}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-400">
                        <Car className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-amber-300">
                          Soon we will share your driver and car details with you!
                        </h2>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          जल्द ही हम आपके साथ ड्राइवर का नाम, मोबाइल नंबर और गाड़ी नंबर WhatsApp पर शेयर करेंगे।
                        </p>
                        <ul className="mt-2 text-xs text-slate-400 space-y-1 list-disc list-inside">
                          <li>Dedicated private AC Sedan cab is reserved for you.</li>
                          <li>Driver details will be dispatched to your WhatsApp <strong>2–3 hours before pickup</strong>.</li>
                          <li>Pickup time is locked and guaranteed.</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            ) : isWaitingMatch ? (
              <section className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-950/70 via-slate-950 to-amber-950/40 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 ring-4 ring-amber-500/30">
                  <Clock className="h-10 w-10 text-amber-400 animate-pulse" />
                </div>
                
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/80 px-3.5 py-1 text-xs font-black tracking-wide text-amber-300 uppercase shadow-inner">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                  Booking Received · Advance Confirmed
                </div>

                <h1 className="mt-3 text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Booking Received! Matching Return Ride 🚕
                </h1>
                <p className="mt-1 text-sm font-medium text-amber-300">
                  आपकी बुकिंग मिल गई है! रिटर्न राइड मैच हो रही है।
                </p>

                <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-950/50 p-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-400">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-amber-300">
                        Opposite Passenger Match in Progress
                      </h2>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        A dedicated private economy sedan is reserved for your journey. Our system is pairing an opposite passenger between Khargone and Indore for your maximum discount.
                      </p>
                      <div className="mt-3 rounded-xl bg-slate-900/80 p-3 border border-amber-500/20 text-xs text-slate-300 space-y-1">
                        <p className="font-bold text-amber-200">🛡️ 100% Refund Guarantee:</p>
                        <p className="text-[11px] text-slate-400">
                          If an opposite match is not found before pickup cutoff, your full ₹500 advance will be automatically refunded without any cancellation fee.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : isCompleted ? (
              <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 sm:p-8 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
                <h1 className="mt-3 text-2xl font-black text-white">Trip Completed! ❤️</h1>
                <p className="text-xs text-slate-400 mt-1">Thank you for traveling with MarutiCab.</p>
              </section>
            ) : (
              <section className="rounded-3xl border border-rose-900/60 bg-rose-950/40 p-6 sm:p-8 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-rose-400" />
                <h1 className="mt-3 text-2xl font-black text-rose-200">Booking {booking.status}</h1>
                <p className="text-xs text-rose-300/80 mt-1">This booking is closed. Contact support for any queries.</p>
              </section>
            )}

            {/* ── 2. TRIP DETAILS CARD ── */}
            <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 sm:p-6 backdrop-blur-md shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Booking Reference</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xl font-mono font-black text-amber-400">#{booking.booking_ref}</span>
                    <button
                      type="button"
                      onClick={copyRef}
                      className="rounded-lg bg-slate-800 hover:bg-slate-700 p-1.5 text-slate-300 transition"
                      title="Copy Booking ID"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                    {copied && <span className="text-xs text-emerald-400 font-bold">Copied!</span>}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cab Type</span>
                  <p className="text-sm font-extrabold text-white mt-0.5">Private AC Sedan</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 rounded-2xl bg-slate-900/60 p-3.5 border border-slate-800">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Route</p>
                    <p className="text-sm font-black text-white mt-0.5">{routeLabel}</p>
                    <p className="text-xs text-amber-300/90 mt-0.5">{booking.drop_name}</p>
                    {booking.address && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">📍 {booking.address}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-slate-900/60 p-3.5 border border-slate-800">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Date & Pickup Time</p>
                    <p className="text-sm font-black text-white mt-0.5">
                      {formatPickupDate(booking.travel_date)}
                    </p>
                    <p className="text-xs font-extrabold text-amber-400 mt-0.5">
                      ⏰ {formatPickupTime12h(booking.pickup_time)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-slate-900/60 p-3.5 border border-slate-800">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Passenger</p>
                    <p className="text-sm font-black text-white mt-0.5">{booking.passenger_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      📞 {booking.masked_phone || booking.phone} · {booking.passenger_count || 1} passenger(s)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-slate-900/60 p-3.5 border border-slate-800">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-400/10 text-blue-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Included Features</p>
                    <p className="text-xs font-bold text-white mt-0.5">✓ Dedicated Sedan (No strangers)</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">✓ Tolls & Taxes Included · AC Always On</p>
                  </div>
                </div>
              </div>
            </section>

            {/* ── 3. FARE & PAYMENT BREAKDOWN ── */}
            <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 sm:p-6 backdrop-blur-md shadow-xl">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3">
                Fare & Payment Summary
              </h2>

              <div className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Total Trip Fare (All inclusive)</span>
                  <span className="font-extrabold text-white">₹{booking.total_fare}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-400">
                  <span className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Advance Paid Online
                  </span>
                  <span className="font-black text-emerald-400">₹{booking.advance_paid || booking.advance_amount || 500}</span>
                </div>
                <div className="border-t border-slate-800/80 pt-3 flex justify-between items-baseline">
                  <div>
                    <p className="text-sm font-black text-amber-400">Remaining Balance to Driver</p>
                    <p className="text-[11px] text-slate-400">Pay directly to driver in cab by Cash or UPI</p>
                  </div>
                  <span className="text-xl font-black text-white">
                    ₹{booking.balance_amount || Math.max(0, booking.total_fare - 500)}
                  </span>
                </div>
              </div>
            </section>

            {/* ── 4. ACTIONS & 24x7 HELP DESK ── */}
            <section className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 py-3.5 px-5 text-sm font-extrabold text-white transition shadow-xl shadow-emerald-950/50"
              >
                <MessageCircle className="h-5 w-5" /> Chat on WhatsApp Support
              </a>
              <a
                href={`tel:${SUPPORT_PHONE}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 hover:bg-slate-800 py-3.5 px-5 text-sm font-bold text-slate-200 transition"
              >
                <Phone className="h-4 w-4" /> Call 24x7 Help Desk
              </a>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-500/40 hover:bg-amber-400/10 py-3.5 px-5 text-sm font-extrabold text-amber-300 transition"
              >
                Book Return Cab <ArrowRight className="h-4 w-4" />
              </Link>
            </section>

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => void loadBooking(true)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Checking for updates…' : 'Live Status · Click to refresh'}
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
