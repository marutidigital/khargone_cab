'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { RazorpayCheckoutButton } from '@/components/RazorpayCheckoutButton'
import {
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Car,
  Calendar,
  Clock,
  MapPin,
  Tag,
  Loader2,
  AlertCircle,
  ArrowRight,
  PhoneCall,
  Sparkles,
} from 'lucide-react'

type BookingInfo = {
  id: string
  booking_ref: string
  passenger_name: string
  phone: string
  email?: string | null
  direction: string
  route_label: string
  travel_date: string
  pickup_time: string
  address?: string | null
  vehicle: string
  total_fare: number
  advance_amount: number
  advance_paid: number
  balance_amount: number
  status: string
  public_token?: string | null
}

function PayLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
      <Nav />
      <div className="mx-auto w-full max-w-lg px-4 py-12 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading booking details...</p>
      </div>
      <div />
    </div>
  )
}

function PayContent() {
  const searchParams = useSearchParams()
  const refParam = searchParams.get('ref') || ''

  const [bookingRefInput, setBookingRefInput] = useState(refParam)
  const [booking, setBooking] = useState<BookingInfo | null>(null)
  const [loadingBooking, setLoadingBooking] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Custom / fallback checkout states
  const [amount, setAmount] = useState(500)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  // Coupon
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)

  // Payment Confirmation
  const [confirmedPayment, setConfirmedPayment] = useState<{
    orderId: string
    paymentId: string
    bookingRef?: string
  } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const is2RsCoupon = appliedCoupon && ['MARUTI2', 'CAB2', 'TEST2', 'PAY2', 'TWO'].includes(appliedCoupon)
  const is99Coupon = appliedCoupon && ['TEST99', 'MARUTI99', 'CAB99', 'DISCOUNT99'].includes(appliedCoupon)
  const payableAdvance = is2RsCoupon ? 2 : (is99Coupon ? 5 : (booking ? booking.advance_amount : amount))

  const loadBooking = async (ref: string) => {
    if (!ref.trim()) return
    setLoadingBooking(true)
    setFetchError(null)
    try {
      const res = await fetch(`/api/pay/booking?ref=${encodeURIComponent(ref.trim())}`)
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Booking reference not found.')
      }
      setBooking(data.booking)
      setName(data.booking.passenger_name || '')
      setPhone(data.booking.phone || '')
      setEmail(data.booking.email || '')
      setAmount(data.booking.advance_amount || 500)
    } catch (err: any) {
      setBooking(null)
      setFetchError(err.message || 'Failed to find booking.')
    } finally {
      setLoadingBooking(false)
    }
  }

  useEffect(() => {
    if (refParam) {
      loadBooking(refParam)
    }
  }, [refParam])

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault()
    setCouponError(null)
    const code = couponCode.trim().toUpperCase()
    if (!code) {
      setCouponError('Enter a coupon code')
      return
    }
    if (['MARUTI2', 'CAB2', 'TEST2', 'PAY2', 'TWO'].includes(code)) {
      setAppliedCoupon(code)
    } else if (['TEST99', 'MARUTI99', 'CAB99', 'DISCOUNT99'].includes(code)) {
      setAppliedCoupon(code)
    } else {
      setCouponError('Invalid coupon code. Try MARUTI2 for test.')
    }
  }

  const handlePaymentSuccess = async (res: { orderId: string; paymentId: string; signature?: string }) => {
    setConfirming(true)
    setConfirmError(null)

    try {
      if (booking?.booking_ref) {
        const confirmRes = await fetch('/api/pay/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingRef: booking.booking_ref,
            orderId: res.orderId,
            paymentId: res.paymentId,
            signature: res.signature,
            advancePaid: payableAdvance,
            couponCode: appliedCoupon || undefined,
          }),
        })

        const confirmData = await confirmRes.json()
        if (!confirmRes.ok || !confirmData.success) {
          throw new Error(confirmData.error || 'Payment signature verified, but booking sync encountered an issue.')
        }
      }

      setConfirmedPayment({
        orderId: res.orderId,
        paymentId: res.paymentId,
        bookingRef: booking?.booking_ref,
      })
    } catch (err: any) {
      setConfirmError(err.message || 'Payment confirmed, booking sync in progress.')
      setConfirmedPayment({
        orderId: res.orderId,
        paymentId: res.paymentId,
        bookingRef: booking?.booking_ref,
      })
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased flex flex-col justify-between">
      <div>
        <Nav />

        <main className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
          {/* Confirmed State */}
          {confirmedPayment ? (
            <div className="bg-white border border-emerald-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-center">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600 animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  Payment Confirmed 🎉
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Advance ₹{payableAdvance} Successfully Paid!
                </h1>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Aapki cab booking officially record ho gayi hai. Hum opposite direction return ride match confirm kar rahe hain! 🚕💨
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2.5 font-medium text-slate-700">
                {confirmedPayment.bookingRef && (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-slate-500">Booking Reference</span>
                    <span className="font-mono font-black text-amber-700 text-sm">
                      #{confirmedPayment.bookingRef}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Payment ID</span>
                  <span className="font-mono text-slate-900">{confirmedPayment.paymentId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Order ID</span>
                  <span className="font-mono text-slate-900">{confirmedPayment.orderId}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-emerald-700 font-bold">
                  <span>WhatsApp Updates</span>
                  <span>Sent to registered number ✓</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {booking?.public_token ? (
                  <Link
                    href={`/booking/${booking.public_token}`}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-2xl shadow-xs transition-colors cursor-pointer text-sm"
                  >
                    <span>Track Booking Status</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link
                    href="/"
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-2xl shadow-xs transition-colors cursor-pointer text-sm"
                  >
                    <span>Return to Home</span>
                  </Link>
                )}

                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
                  <span>24x7 Helpline: <strong>+91 72823 16090</strong></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>MarutiCab Dedicated Cabs</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Advance Booking Payment
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Pay ₹{payableAdvance} refundable advance to lock your private sedan cab
                </p>
              </div>

              {/* Booking Reference Lookup if not present or searching another */}
              {!booking && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Have a Booking ID? Enter to load details:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. KC20754"
                      value={bookingRefInput}
                      onChange={(e) => setBookingRefInput(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 font-mono uppercase"
                    />
                    <button
                      type="button"
                      onClick={() => loadBooking(bookingRefInput)}
                      disabled={loadingBooking || !bookingRefInput.trim()}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      {loadingBooking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find'}
                    </button>
                  </div>
                  {fetchError && (
                    <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{fetchError}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Booking Card Display */}
              {booking && (
                <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                        Booking Details
                      </span>
                      <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2 mt-0.5">
                        <Car className="w-4 h-4 text-amber-600" />
                        <span>{booking.route_label}</span>
                      </h2>
                    </div>
                    <span className="font-mono font-black text-xs px-2.5 py-1 bg-amber-200 text-amber-950 rounded-lg">
                      #{booking.booking_ref}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-700">
                    <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-xl border border-amber-100">
                      <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Date</div>
                        <div className="font-bold">{booking.travel_date}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-xl border border-amber-100">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Pickup Time</div>
                        <div className="font-bold">{booking.pickup_time}</div>
                      </div>
                    </div>
                  </div>

                  {booking.address && (
                    <div className="flex items-start gap-2 text-xs text-slate-700 bg-white/80 p-2.5 rounded-xl border border-amber-100">
                      <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Pickup Location</span>
                        <span className="font-medium">{booking.address}</span>
                      </div>
                    </div>
                  )}

                  {/* Fare breakdown */}
                  <div className="bg-white rounded-xl p-3 space-y-1.5 border border-amber-200 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Cab Fare (Dedicated Sedan AC)</span>
                      <span className="font-bold text-slate-900">₹{booking.total_fare.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Balance payable to driver in cab</span>
                      <span className="font-bold text-slate-900">₹{(booking.total_fare - payableAdvance).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-amber-900 pt-1.5 border-t border-slate-100">
                      <span>Advance Amount to Pay Now</span>
                      <span className="text-base text-emerald-600">₹{payableAdvance}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Coupon Code Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                    <span>Have a Promo / Test Coupon?</span>
                  </label>
                  {appliedCoupon && (
                    <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Applied: {appliedCoupon}
                    </span>
                  )}
                </div>

                {!appliedCoupon ? (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. MARUTI2"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 font-mono uppercase"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Apply
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold pt-1">
                    <span>Coupon active: Advance set to ₹{payableAdvance}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCoupon(null)
                        setCouponCode('')
                      }}
                      className="text-slate-400 hover:text-slate-600 underline cursor-pointer text-[11px]"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {couponError && (
                  <p className="text-[11px] text-rose-600 font-medium">{couponError}</p>
                )}
              </div>

              {/* Passenger Inputs if manual or editing */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Passenger Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    WhatsApp Number (for instant updates)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {confirmError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{confirmError}</span>
                </div>
              )}

              {/* Razorpay Checkout Button */}
              <div className="pt-2">
                <RazorpayCheckoutButton
                  amountInRupees={payableAdvance}
                  customerName={name}
                  customerPhone={phone}
                  customerEmail={email}
                  description={booking ? `MarutiCab Advance #${booking.booking_ref}` : `MarutiCab Booking Advance (₹${payableAdvance})`}
                  buttonText={`Pay ₹${payableAdvance} Advance via UPI / Card`}
                  notes={{
                    booking_ref: booking?.booking_ref || '',
                    coupon: appliedCoupon || 'NONE',
                  }}
                  onSuccess={handlePaymentSuccess}
                />
              </div>

              {/* Trust Badges */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-center gap-2 text-xs text-slate-600 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>100% Refund Guarantee if return ride match is not confirmed</span>
                </div>
                <div className="text-center text-[11px] text-slate-400">
                  Secured by Razorpay · UPI (Google Pay, PhonePe, Paytm, BHIM) · Credit / Debit Cards · NetBanking
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default function PayPage() {
  return (
    <Suspense fallback={<PayLoadingSkeleton />}>
      <PayContent />
    </Suspense>
  )
}
