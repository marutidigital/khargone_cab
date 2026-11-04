'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Nav } from '@/components/Nav'
import {
  Car,
  Calendar,
  Clock,
  Phone,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock3,
  AlertCircle,
  MessageCircle,
} from 'lucide-react'
import { formatRs } from '@/config/pricing'

interface BookingSummary {
  id: string
  booking_ref: string
  direction: string
  drop_name: string
  travel_date: string
  pickup_time: string
  status: string
  total_fare: number
  advance_paid: number
  balance_amount: number
  public_token: string
  driver_name: string | null
  created_at: string
}

export default function MyRidesPage() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [bookings, setBookings] = useState<BookingSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPhone = phone.replace(/\D/g, '').slice(-10)
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/bookings/my-rides?phone=${cleanPhone}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to find bookings')
      setBookings(data.bookings || [])
      setSearched(true)
    } catch (err: any) {
      setError(err.message || 'Error loading bookings')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'matched':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
          </span>
        )
      case 'waiting':
      case 'pending_payment':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
            <Clock3 className="w-3.5 h-3.5" /> Active / Matching
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F4F5] text-slate-900 font-sans">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
              <Car className="w-6 h-6 text-amber-800" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              My Rides & Booking Status
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Check live driver details, trip status, and dispatch information.
            </p>
          </div>

          {/* Phone Lookup Form */}
          <form onSubmit={handleLookup} className="space-y-3 mb-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  required
                  placeholder="Enter 10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FBBF24] focus:border-[#FBBF24]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-[#FBBF24] hover:bg-[#F59E0B] text-slate-950 font-black px-5 py-3 rounded-xl text-xs sm:text-sm transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Find Rides</span>}
              </button>
            </div>
            {error && (
              <p className="text-xs text-rose-600 font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> {error}
              </p>
            )}
          </form>

          {/* WhatsApp Direct Help */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-center justify-between gap-3 text-xs text-emerald-950 mb-6">
            <div className="flex items-center gap-2.5">
              <MessageCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-extrabold block">MarutiCab WhatsApp Support</span>
                <span className="text-[11px] text-emerald-800">
                  Contact operations directly on WhatsApp at <strong>+91 8878933778</strong> for trip assistance.
                </span>
              </div>
            </div>
            <a
              href="https://wa.me/918878933778?text=Namaste%20MarutiCab%2C%20mujhe%20booking%20status%20chahiye."
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white px-3 py-1.5 rounded-lg font-bold text-[11px] shrink-0"
            >
              Open WhatsApp
            </a>
          </div>

          {/* Results List */}
          {searched && (
            <div className="space-y-4">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                Your Bookings ({bookings.length})
              </h2>

              {bookings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                  <p className="text-sm font-bold">No bookings found for this phone number.</p>
                  <p className="text-xs mt-1">Make sure you entered the mobile number used during booking.</p>
                  <Link
                    href="/"
                    className="mt-4 inline-flex items-center gap-1.5 bg-[#FBBF24] text-slate-950 px-4 py-2 rounded-xl text-xs font-black shadow-xs"
                  >
                    Book a Ride Now <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                bookings.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 hover:border-amber-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3 mb-3">
                      <div>
                        <div className="text-xs font-mono font-bold text-slate-500">
                          #{b.booking_ref}
                        </div>
                        <h3 className="text-sm font-extrabold text-slate-900 mt-0.5">
                          {b.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'}
                        </h3>
                        <p className="text-xs text-slate-600">Point: {b.drop_name}</p>
                      </div>
                      <div>{getStatusBadge(b.status)}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        <span>{b.travel_date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>{b.pickup_time.slice(0, 5)}</span>
                      </div>
                      <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-200 text-slate-800">
                        <span>
                          Advance: <strong>{formatRs(b.advance_paid || 0)}</strong> · Balance:{' '}
                          <strong>{formatRs(b.balance_amount || 0)}</strong>
                        </span>
                        <strong className="text-sm font-black text-slate-950">
                          {formatRs(b.total_fare)}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Link
                        href={`/booking/${b.public_token}`}
                        className="flex-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl py-2 px-3 text-center text-xs font-bold text-slate-800 transition"
                      >
                        View Full Details & Driver Info
                      </Link>
                      <a
                        href={`https://wa.me/918878933778?text=${encodeURIComponent(
                          `Hi MarutiCab, booking status for ${b.booking_ref}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#25D366] hover:bg-[#20bd5a] text-white p-2 rounded-xl transition"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 fill-white" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
