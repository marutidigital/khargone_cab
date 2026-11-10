'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  Car,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  MapPin,
  User,
  Phone,
  Mail,
  Tag,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { Nav } from '@/components/Nav'
import { FooterMarquee } from '@/components/FooterMarquee'
import { FooterTrust } from '@/components/FooterTrust'
import { PRICING_CONFIG, formatRs } from '@/config/pricing'
import { calculateBookingFare, type DropPointId, type RouteDirection } from '@/lib/config'

interface PublicAvailableRide {
  id: string
  direction: 'KI' | 'IK'
  routeDirection: 'K2I' | 'I2K'
  routeLabel: string
  travelDate: string
  travelDateFormatted: string
  pickupTime: string
  pickupTimeFormatted: string
  passengerCount: number
  dropPoint: string
  dropName: string
  totalFare: number
  advanceAmount: number
  oppositeDirection: 'I2K' | 'K2I'
  oppositeRouteLabel: string
  oppositeBaseFare: number
  statusText: string
  isAvailable?: boolean
}

const ALL_TIME_SLOTS: string[] = []
for (let h = 4; h <= 23; h++) {
  ALL_TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  if (h < 23) {
    ALL_TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
  }
}

function formatSlot12(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  const h12 = h % 12 || 12
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function BookReturnRidePage() {
  const params = useParams()
  const router = useRouter()
  const rideId = params?.rideId as string

  const [ride, setRide] = useState<PublicAvailableRide | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Passenger state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [passengers, setPassengers] = useState(1)
  const [selectedPointId, setSelectedPointId] = useState<DropPointId>('rajendra')
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  // Coupon state
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [couponNotice, setCouponNotice] = useState<string | null>(null)

  // Payment state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [razorpayReady, setRazorpayReady] = useState(false)

  // Fetch ride details
  const fetchRide = useCallback(async () => {
    if (!rideId) return
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/public/available-rides/${encodeURIComponent(rideId)}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        throw new Error('This return ride is no longer available or was already booked.')
      }
      const data = await res.json()
      if (!data.ride) {
        throw new Error('Return ride details not found.')
      }
      setRide(data.ride)
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not load ride details.')
    } finally {
      setLoading(false)
    }
  }, [rideId])

  useEffect(() => {
    void fetchRide()
  }, [fetchRide])

  // Target booking pickup minutes
  const targetMinutes = useMemo(() => {
    if (!ride) return 12 * 60
    const [h, m] = ride.pickupTime.split(':').map(Number)
    return (Number.isFinite(h) ? h : 12) * 60 + (Number.isFinite(m) ? m : 0)
  }, [ride])

  // Evaluates 4-Hour Pickup Time Gap
  const timeSlotOptions = useMemo(() => {
    if (!ride) return []
    return ALL_TIME_SLOTS.map((timeStr) => {
      const [h, m] = timeStr.split(':').map(Number)
      const slotMinutes = h * 60 + m
      const diffMinutes = Math.abs(slotMinutes - targetMinutes)
      const isEligible = diffMinutes >= 240
      const diffHours = (diffMinutes / 60).toFixed(1)

      return {
        timeStr,
        label: formatSlot12(timeStr),
        isEligible,
        diffHours,
        reason: isEligible
          ? `${diffHours}h gap from opposite ride (${ride.pickupTimeFormatted})`
          : `Only ${diffHours}h gap (< 4h min requirement)`,
      }
    })
  }, [ride, targetMinutes])

  // Set default eligible time
  useEffect(() => {
    if (!selectedTime && timeSlotOptions.length > 0) {
      const firstEligible = timeSlotOptions.find((t) => t.isEligible)
      if (firstEligible) {
        setSelectedTime(firstEligible.timeStr)
      }
    }
  }, [timeSlotOptions, selectedTime])

  const visitorDirection: RouteDirection = ride?.oppositeDirection || 'I2K'

  // Fare calculation
  const fare = useMemo(() => {
    return calculateBookingFare({
      mode: 'match',
      direction: visitorDirection,
      point: selectedPointId,
      pickupTime: selectedTime || '12:00',
    })
  }, [visitorDirection, selectedPointId, selectedTime])

  // Advance calculation with coupon MARUTI2 / CAB2 / TEST2
  const advanceToPay = useMemo(() => {
    if (appliedCoupon === 'MARUTI2' || appliedCoupon === 'CAB2' || appliedCoupon === 'TEST2') {
      return 2
    }
    return 500
  }, [appliedCoupon])

  const balanceInCab = Math.max(0, fare.totalFare - advanceToPay)

  const applyCoupon = () => {
    const code = couponCode.trim().toUpperCase()
    if (code === 'MARUTI2' || code === 'CAB2' || code === 'TEST2') {
      setAppliedCoupon(code)
      setCouponNotice('Coupon applied! Advance discount verified.')
      setErrorMsg(null)
    } else if (code) {
      setAppliedCoupon(null)
      setCouponNotice(null)
      setErrorMsg('Invalid coupon code.')
    }
  }

  const handleCheckoutAndConfirm = async () => {
    setErrorMsg(null)

    if (name.trim().length < 2) {
      setErrorMsg('Please enter passenger full name.')
      return
    }
    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setErrorMsg('Please enter a valid 10-digit Indian WhatsApp mobile number.')
      return
    }
    if (!selectedTime) {
      setErrorMsg('Please select a pickup time slot with at least a 4-hour gap.')
      return
    }

    if (!ride) return

    setIsSubmitting(true)

    try {
      const advancePaise = advanceToPay * 100
      const idempotencyKey = crypto.randomUUID()

      // 1. Create Razorpay order and pre-insert pending_payment booking
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: advancePaise,
          currency: 'INR',
          receipt: `rcpt_ret_${Date.now()}`,
          bookingData: {
            direction: visitorDirection,
            mode: 'match',
            point: selectedPointId,
            date: ride.travelDate,
            time: selectedTime,
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim() || undefined,
            address: address.trim() || undefined,
            passengers: passengers,
            idempotencyKey,
            matchedWithBookingId: ride.id,
            couponCode: appliedCoupon || undefined,
          },
          notes: {
            passenger_name: name.trim(),
            passenger_phone: phone.trim(),
            matched_with_booking_id: ride.id,
            route: ride.oppositeRouteLabel,
          },
        }),
      })

      const orderData = await orderRes.json()
      if (!orderRes.ok || !orderData.order_id) {
        throw new Error(orderData.error || 'Failed to initialize payment gateway.')
      }

      const keyId = orderData.key_id || 'rzp_test_TyAjmTx2XdmBnh'
      const RazorpayClass = (window as any).Razorpay
      if (!RazorpayClass) {
        throw new Error('Payment gateway SDK loading. Please retry in a few seconds.')
      }

      // 2. Open Razorpay Checkout
      const options = {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'MarutiCab Return Match',
        description: `Advance for ${ride.oppositeRouteLabel}`,
        order_id: orderData.order_id,
        prefill: {
          name: name.trim(),
          contact: phone.trim(),
          ...(email.trim() ? { email: email.trim() } : {}),
        },
        theme: {
          color: '#F59E0B',
        },
        modal: {
          ondismiss: () => {
            setIsSubmitting(false)
            setErrorMsg('Advance payment cancelled. Booking requires advance to confirm.')
          },
        },
        handler: async (response: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) => {
          try {
            // 3. Atomically verify payment and link match
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                order_id: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                booking_id: orderData.booking_id,
              }),
            })

            const verifyData = await verifyRes.json()
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || 'Payment verification failed.')
            }

            const targetToken = verifyData.publicToken || orderData.public_token
            if (targetToken) {
              try {
                window.sessionStorage.setItem('maruticab_booking_token', String(targetToken))
              } catch {}
              // Direct navigation to dedicated confirmation / thank you page! NO POPUPS!
              window.location.href = `/booking/${encodeURIComponent(String(targetToken))}`
              return
            }

            // Fallback redirect
            window.location.href = `/booking/${encodeURIComponent(orderData.booking_id)}`
          } catch (verifyErr: any) {
            setErrorMsg(verifyErr.message || 'Payment verification failed.')
            setIsSubmitting(false)
          }
        },
      }

      const rzp = new RazorpayClass(options)
      rzp.on('payment.failed', (failRes: any) => {
        setIsSubmitting(false)
        setErrorMsg(failRes.error?.description || 'Payment failed. Please retry.')
      })
      rzp.open()
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not process payment.')
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
        <Nav />
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-4" />
          <p className="text-sm font-bold text-slate-600">Loading Return Ride Details…</p>
        </div>
        <FooterMarquee />
      </div>
    )
  }

  if (!ride) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
        <Nav />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Ride No Longer Available</h1>
          <p className="text-sm text-slate-600 mb-6">
            {errorMsg || 'This return ride was already paired or expired. Please browse other live return rides.'}
          </p>
          <Link
            href="/confirmed-rides"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-6 py-3 text-sm transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Browse All Return Rides</span>
          </Link>
        </div>
        <FooterMarquee />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased flex flex-col justify-between">
      <Script
        id="razorpay-checkout-script"
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => setRazorpayReady(true)}
      />

      <div>
        <Nav />

        <main className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-6 sm:py-8">
          {/* Top Back Navigation */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <Link
              href="/confirmed-rides"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-950 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Confirmed Rides Board</span>
            </Link>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 text-xs font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>100% Confirmed Return Deal</span>
            </span>
          </div>

          {/* Hero Banner: Opposite Ride Details */}
          <div className="rounded-3xl bg-slate-900 text-white p-5 sm:p-7 shadow-lg mb-8 relative overflow-hidden">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 text-slate-950 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Opposite Cab Waiting For You</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white flex flex-wrap items-center gap-2">
                <span>Book Return Ride:</span>
                <span className="text-amber-400">{ride.oppositeRouteLabel}</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                A verified passenger is traveling on <strong>{ride.routeLabel}</strong> at <strong>{ride.pickupTimeFormatted}</strong> on <strong>{ride.travelDateFormatted}</strong>. By reserving your return seat below, both rides get immediately confirmed with our dedicated driver fleet.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4 text-xs">
                <div className="rounded-2xl bg-slate-800/80 border border-slate-700/80 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Travel Date</span>
                  <strong className="text-sm font-black text-white">{ride.travelDateFormatted}</strong>
                </div>
                <div className="rounded-2xl bg-slate-800/80 border border-slate-700/80 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Opposite Departure</span>
                  <strong className="text-sm font-black text-white">{ride.pickupTimeFormatted}</strong>
                </div>
                <div className="rounded-2xl bg-slate-800/80 border border-slate-700/80 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Cab Category</span>
                  <strong className="text-sm font-black text-amber-400">AC Sedan (Dzire / Amaze)</strong>
                </div>
                <div className="rounded-2xl bg-slate-800/80 border border-slate-700/80 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Fare</span>
                  <strong className="text-sm font-black text-emerald-400">{formatRs(fare.totalFare)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Form and Summary Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Left 2 Columns: Booking Details Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1: Select Pickup Time Slot */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black">
                      1
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      Select Your Return Pickup Time
                    </h2>
                  </div>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    Min 4-hour gap required
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Opposite ride departs at <strong>{ride.pickupTimeFormatted}</strong>. Choose a pickup time with at least 4 hours gap to allow safe intercity transit.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-1 border border-slate-100 rounded-2xl">
                  {timeSlotOptions.map((slot) => {
                    const isSelected = selectedTime === slot.timeStr
                    return (
                      <button
                        key={slot.timeStr}
                        type="button"
                        disabled={!slot.isEligible}
                        onClick={() => setSelectedTime(slot.timeStr)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50 text-slate-950 font-black shadow-xs ring-2 ring-amber-400/40'
                            : slot.isEligible
                            ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold'
                            : 'border-slate-100 bg-slate-50/60 text-slate-300 cursor-not-allowed opacity-50'
                        }`}
                        title={slot.reason}
                      >
                        <div className="text-xs sm:text-sm">{slot.label}</div>
                        <div className="text-[10px] mt-0.5 text-slate-500 truncate">
                          {slot.isEligible ? `${slot.diffHours}h gap ✓` : 'Under 4h gap'}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Step 2: Drop Point & Address */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-6 w-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black">
                    2
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    {visitorDirection === 'I2K' ? 'Khargone Drop Point' : 'Indore Drop Location'}
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  {PRICING_CONFIG.points.map((pt) => {
                    const isSelected = selectedPointId === pt.id
                    return (
                      <button
                        key={pt.id}
                        type="button"
                        onClick={() => setSelectedPointId(pt.id as DropPointId)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/80 font-black text-slate-950 ring-2 ring-amber-400/30'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium'
                        }`}
                      >
                        <div className="text-xs sm:text-sm font-bold flex items-center justify-between">
                          <span>{pt.name}</span>
                          {pt.extraFare > 0 && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              +{formatRs(pt.extraFare)}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{pt.description}</p>
                      </button>
                    )
                  })}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Exact Pickup / Drop Address or Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Near Vijay Nagar Square / Collectorate / Home Address"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Step 3: Passenger Information */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-6 w-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black">
                    3
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    Passenger Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Rajesh Sharma"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      WhatsApp Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="tel"
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="10-digit mobile number"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address (Optional)
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="For booking receipt & updates"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Number of Passengers (Max 4 for Sedan)
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setPassengers(cnt)}
                          className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            passengers === cnt
                              ? 'border-amber-500 bg-amber-400 text-slate-950'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {cnt} {cnt === 1 ? 'Rider' : 'Riders'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Fare & Payment Summary */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs sticky top-20">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">
                  Fare & Payment Summary
                </h3>

                <div className="space-y-2.5 text-xs border-b border-slate-100 pb-4">
                  <div className="flex justify-between text-slate-600">
                    <span>Base Route Fare ({ride.oppositeRouteLabel})</span>
                    <span className="font-bold text-slate-900">{formatRs(fare.baseFare)}</span>
                  </div>
                  {fare.dropPointExtra > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Drop point surcharge</span>
                      <span className="font-bold text-amber-700">+{formatRs(fare.dropPointExtra)}</span>
                    </div>
                  )}
                  {fare.nightSurcharge > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Night transit surcharge</span>
                      <span className="font-bold text-amber-700">+{formatRs(fare.nightSurcharge)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-1">
                    <span>Total Trip Fare</span>
                    <span className="text-base text-slate-900">{formatRs(fare.totalFare)}</span>
                  </div>
                </div>

                <div className="my-4 space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">Advance Online Payment:</span>
                    <span className="text-sm font-black text-amber-600">{formatRs(advanceToPay)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Balance in Cab (to driver):</span>
                    <span className="font-bold text-slate-800">{formatRs(balanceInCab)}</span>
                  </div>
                </div>

                {/* Coupon Code Section */}
                <div className="mb-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Coupon Code"
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold uppercase text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      className="rounded-xl bg-slate-900 text-white px-3 py-2 text-xs font-bold hover:bg-slate-800 cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                  {couponNotice && (
                    <p className="text-[11px] text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{couponNotice}</span>
                    </p>
                  )}
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Submit / Pay Button */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCheckoutAndConfirm}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-400 hover:bg-amber-500 active:scale-98 text-slate-950 font-black py-3.5 px-4 text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Securing Your Cab…</span>
                    </>
                  ) : (
                    <>
                      <span>Pay {formatRs(advanceToPay)} Advance & Confirm</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>100% Secure Payment via Razorpay · Instant WhatsApp Confirmation</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <FooterTrust />
      <FooterMarquee />
    </div>
  )
}
