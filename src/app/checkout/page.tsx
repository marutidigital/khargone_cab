'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import {
  ShieldCheck,
  CreditCard,
  Car,
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  MessageCircle,
  AlertCircle,
  ArrowLeft,
  Lock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { Nav } from '@/components/Nav'
import { calculateBookingFare, type DropPointId, type RouteDirection } from '@/lib/config'

const SUPPORT_PHONE = '+917282316090'
const SUPPORT_WA = '917282316090'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [razorpayReady, setRazorpayReady] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const hasPaid = useRef(false)

  // Retrieve parameters from URL or sessionStorage
  const [checkoutData, setCheckoutData] = useState<{
    direction: RouteDirection
    mode: 'match' | 'confirmed'
    pointId: DropPointId
    date: string
    time: string
    name: string
    phone: string
    email?: string
    address?: string
    passengers: number
    consent: boolean
  } | null>(null)

  useEffect(() => {
    // 1. Try URL search params first
    const paramDir = (searchParams.get('direction') || 'K2I') as RouteDirection
    const paramMode = (searchParams.get('mode') || 'match') as 'match' | 'confirmed'
    const paramPoint = (searchParams.get('point') || 'rajendra') as DropPointId
    const paramDate = searchParams.get('date') || ''
    const paramTime = searchParams.get('time') || ''
    const paramName = searchParams.get('name') || ''
    const paramPhone = searchParams.get('phone') || ''

    if (paramName && paramPhone && paramDate && paramTime) {
      setCheckoutData({
        direction: paramDir,
        mode: paramMode,
        pointId: paramPoint,
        date: paramDate,
        time: paramTime,
        name: paramName,
        phone: paramPhone,
        address: searchParams.get('address') || '',
        passengers: Number(searchParams.get('passengers')) || 1,
        consent: true,
      })
      return
    }

    // 2. Fall back to sessionStorage
    try {
      const saved = window.sessionStorage.getItem('maruticab_checkout_state')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.name && parsed.phone) {
          setCheckoutData(parsed)
          return
        }
      }
    } catch {}

    // If nothing found, keep as null to show error/redirect
  }, [searchParams])

  // Track checkout initiated & abandoned
  useEffect(() => {
    if (!checkoutData) return

    // Track checkout initiated
    void fetch('/api/checkout/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'initiated',
        name: checkoutData.name,
        phone: checkoutData.phone,
        direction: checkoutData.direction === 'K2I' ? 'KI' : 'IK',
        travel_date: checkoutData.date,
        pickup_time: checkoutData.time,
        drop_point: checkoutData.pointId,
      }),
    }).catch(() => {})

    // Meta Pixel InitiateCheckout
    if (typeof window !== 'undefined' && (window as any).fbq) {
      ;(window as any).fbq('track', 'InitiateCheckout', {
        currency: 'INR',
        value: 500,
        content_name: `${checkoutData.direction === 'K2I' ? 'Khargone to Indore' : 'Indore to Khargone'} Cab`,
      })
    }

    // Track abandonment on unload
    const handleUnload = () => {
      if (hasPaid.current) return
      const payload = JSON.stringify({
        action: 'abandoned',
        name: checkoutData.name,
        phone: checkoutData.phone,
        direction: checkoutData.direction === 'K2I' ? 'KI' : 'IK',
        travel_date: checkoutData.date,
        pickup_time: checkoutData.time,
        drop_point: checkoutData.pointId,
        reason: 'User exited checkout page without paying',
      })
      navigator.sendBeacon('/api/checkout/track', payload)
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => {
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [checkoutData])

  // Calculate fare
  const fare = checkoutData
    ? calculateBookingFare({
        mode: checkoutData.mode,
        direction: checkoutData.direction,
        point: checkoutData.pointId,
        pickupTime: checkoutData.time,
      })
    : { totalFare: 2200, advanceAmount: 500, balanceAmount: 1700, baseFare: 2200 }

  const routeLabel = checkoutData?.direction === 'K2I'
    ? 'Khargone ➔ Indore'
    : 'Indore ➔ Khargone'

  // Drop point name
  const dropNames: Record<string, string> = {
    rajendra: 'Rajendra Nagar / AB Road',
    bhawarkua: 'Bhawarkua Square / Tower Chauraha',
    railway: 'Indore Railway Station / Navlakha',
    airport: 'Devi Ahilyabai Airport (IDR)',
    rajwada: 'Rajwada / Sarafa / Palasia',
  }
  const dropPointName = dropNames[checkoutData?.pointId || 'rajendra'] || 'Indore City Point'

  const handlePayAdvance = async () => {
    if (!checkoutData) return
    setLoading(true)
    setError('')

    try {
      // 1. Create order and pre-insert booking
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: fare.advanceAmount || 500,
          currency: 'INR',
          bookingData: {
            direction: checkoutData.direction,
            mode: checkoutData.mode,
            point: checkoutData.pointId,
            date: checkoutData.date,
            time: checkoutData.time,
            name: checkoutData.name,
            phone: checkoutData.phone,
            address: checkoutData.address || '',
            passengers: checkoutData.passengers,
            idempotencyKey: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          },
        }),
      })

      const orderData = await res.json()
      if (!res.ok) {
        throw new Error(orderData.error || 'Could not initiate payment order.')
      }

      setOrderId(orderData.id)

      if (typeof window === 'undefined' || !(window as any).Razorpay) {
        throw new Error('Payment gateway is loading. Please try in 5 seconds.')
      }

      // 2. Open Razorpay Checkout modal
      const options = {
        key: orderData.key_id || 'rzp_test_TyAjmTx2XdmBnh',
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'MarutiCab Intercity',
        description: `Advance for ${routeLabel} Cab (#${orderData.booking_ref || ''})`,
        image: '/images/maruti-logo.png',
        order_id: orderData.id,
        prefill: {
          name: checkoutData.name,
          contact: checkoutData.phone,
          email: checkoutData.email || `${checkoutData.phone}@maruticab.in`,
        },
        theme: {
          color: '#f59e0b',
        },
        handler: async (response: any) => {
          hasPaid.current = true
          // 3. Verify Payment
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })
            const verifyData = await verifyRes.json()
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || 'Payment verification failed.')
            }

            // Meta Pixel Purchase Event
            if (typeof window !== 'undefined' && (window as any).fbq) {
              ;(window as any).fbq('track', 'Purchase', {
                value: 500,
                currency: 'INR',
                order_id: response.razorpay_order_id,
              })
            }

            // Clean up session storage
            window.sessionStorage.removeItem('maruticab_checkout_state')

            // REDIRECT STRAIGHT TO DEDICATED CONFIRMATION / THANK YOU PAGE!
            const token = verifyData.publicToken || orderData.public_token
            if (token) {
              window.sessionStorage.setItem('maruticab_booking_token', String(token))
              window.location.href = `/booking/${encodeURIComponent(String(token))}`
            } else {
              window.location.href = '/my-rides'
            }
          } catch (err: any) {
            setError(err?.message || 'Payment verified with notice. Checking your booking…')
            setLoading(false)
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false)
            // User closed Razorpay modal without paying
            void fetch('/api/checkout/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'abandoned',
                name: checkoutData.name,
                phone: checkoutData.phone,
                booking_ref: orderData.booking_ref,
                reason: 'Dismissed Razorpay payment popup',
              }),
            }).catch(() => {})
          },
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err: any) {
      setError(err?.message || 'Failed to start payment. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-400 selection:text-slate-950">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayReady(true)}
      />
      <Nav />

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Ride Selection
          </Link>
        </div>

        {!checkoutData ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center backdrop-blur-md">
            <Car className="mx-auto h-12 w-12 text-amber-400 opacity-60" />
            <h1 className="mt-3 text-xl font-black text-white">No Active Checkout Found</h1>
            <p className="mt-2 text-sm text-slate-400">
              Please choose your route, pickup time, and enter passenger details on the home page first.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 hover:bg-amber-300 px-6 py-3 text-sm font-extrabold text-slate-950 transition"
            >
              Select Cab on Home
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/60 px-3 py-1 text-xs font-black text-amber-300 uppercase tracking-wide">
                <Lock className="h-3 w-3 text-amber-400" />
                Step 2 of 2 · Secure Checkout
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-black text-white">
                Review & Confirm Your Cab
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Zero stranger co-passengers · Dedicated Sedan · Pay only ₹500 advance now
              </p>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-500/50 bg-rose-950/60 p-4 text-sm text-rose-200 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Payment Notice</p>
                  <p className="text-xs text-rose-300 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Trip Details Card */}
            <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 sm:p-7 backdrop-blur-md shadow-2xl">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3">
                1. Trip Details
              </h2>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 rounded-2xl bg-slate-950/60 p-3.5 border border-slate-800/80">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Route</p>
                    <p className="text-sm font-black text-white mt-0.5">{routeLabel}</p>
                    <p className="text-xs text-amber-300 mt-0.5">{dropPointName}</p>
                    {checkoutData.address && (
                      <p className="text-[11px] text-slate-400 mt-1">📍 {checkoutData.address}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-slate-950/60 p-3.5 border border-slate-800/80">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Travel Date & Time</p>
                    <p className="text-sm font-black text-white mt-0.5">{checkoutData.date}</p>
                    <p className="text-xs font-bold text-amber-300 mt-0.5">⏰ {checkoutData.time}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-slate-950/60 p-3.5 border border-slate-800/80">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Passenger</p>
                    <p className="text-sm font-black text-white mt-0.5">{checkoutData.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">📞 +91 {checkoutData.phone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-slate-950/60 p-3.5 border border-slate-800/80">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-400/10 text-blue-400">
                    <Car className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Car Type</p>
                    <p className="text-sm font-black text-white mt-0.5">Private AC Sedan</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Clean & Sanitized · 4 Passengers Max</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Price & Payment Summary Card */}
            <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 sm:p-7 backdrop-blur-md shadow-2xl">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3">
                2. Price & Payment Breakdown
              </h2>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Total Trip Fare (All tolls & taxes included)</span>
                  <span className="font-extrabold text-white text-base">₹{fare.totalFare}</span>
                </div>
                <div className="flex justify-between items-center text-amber-400 bg-amber-950/40 border border-amber-500/20 p-3 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-amber-400" />
                    <div>
                      <p className="font-black text-sm">Advance Payable Now</p>
                      <p className="text-[11px] text-amber-300/80">Secures your cab & driver dispatch</p>
                    </div>
                  </div>
                  <span className="text-xl font-black text-amber-400">₹{fare.advanceAmount || 500}</span>
                </div>
                <div className="flex justify-between text-slate-300 pt-1">
                  <span>Remaining Balance (To Driver in Cab)</span>
                  <span className="font-bold text-white">
                    ₹{fare.balanceAmount || Math.max(0, fare.totalFare - 500)}
                  </span>
                </div>
              </div>

              {/* Guarantees */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>100% Full Refund if match not found</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Instant WhatsApp Booking Updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Doorstep / City Point Drop Included</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>No Stranger Co-Passengers Guaranteed</span>
                </div>
              </div>

              {/* Pay Button */}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handlePayAdvance}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-400 hover:bg-amber-300 py-4 px-6 text-base font-black text-slate-950 transition shadow-xl shadow-amber-500/20 disabled:opacity-50"
                >
                  <Lock className="h-5 w-5" />
                  {loading ? 'Opening Secure Gateway…' : `Pay ₹${fare.advanceAmount || 500} Advance to Confirm Cab`}
                </button>
                <p className="text-center text-[11px] text-slate-400 mt-2 flex items-center justify-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Secured by Razorpay · UPI (GPay/PhonePe), Debit/Credit Cards & NetBanking
                </p>
              </div>
            </section>

            {/* Need Help */}
            <div className="text-center pt-2">
              <a
                href={`https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent(`Hi MarutiCab, I am on the checkout page for ${routeLabel} on ${checkoutData.date}. I have a question.`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition"
              >
                <MessageCircle className="h-4 w-4 text-emerald-400" />
                Need help before booking? Chat with us on WhatsApp
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
          <Nav />
          <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-12 flex items-center justify-center">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center animate-pulse w-full max-w-md">
              <div className="mx-auto h-8 w-48 rounded bg-slate-800 mb-4" />
              <div className="mx-auto h-4 w-64 rounded bg-slate-800" />
            </div>
          </main>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
