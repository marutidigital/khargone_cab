'use client'

import React, { useState, useMemo } from 'react'
import {
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  ShieldCheck,
  Car,
  ArrowRight,
  Loader2,
  Tag,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { PRICING_CONFIG, formatRs } from '@/config/pricing'
import { calculateBookingFare, getDropPointExtra, type DropPointId, type RouteDirection } from '@/lib/config'

export interface PublicAvailableRide {
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
}

interface PublicMatchBookingModalProps {
  ride: PublicAvailableRide
  onClose: () => void
  onSuccess: (bookingRef: string, publicToken: string, whatsappUrl: string) => void
}

// Generate time slots every 30 minutes from 04:00 to 23:00
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

export function PublicMatchBookingModal({
  ride,
  onClose,
  onSuccess,
}: PublicMatchBookingModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [passengers, setPassengers] = useState(1)
  const [selectedPointId, setSelectedPointId] = useState<DropPointId>('rajendra')
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [couponNotice, setCouponNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Target booking pickup minutes
  const targetMinutes = useMemo(() => {
    const [h, m] = ride.pickupTime.split(':').map(Number)
    return (Number.isFinite(h) ? h : 12) * 60 + (Number.isFinite(m) ? m : 0)
  }, [ride.pickupTime])

  // Evaluates 4-Hour Pickup Time Gap:
  // ABS(existing_pickup_datetime - visitor_pickup_datetime) >= 4 hours (240 mins)
  // Exact 4h boundary is eligible!
  const timeSlotOptions = useMemo(() => {
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
          ? `${diffHours}h gap from existing ${ride.pickupTimeFormatted}`
          : `Only ${diffHours}h gap (< 4h min)`,
      }
    })
  }, [targetMinutes, ride.pickupTimeFormatted])

  const visitorDirection: RouteDirection = ride.oppositeDirection

  // Fare calculation
  const fare = useMemo(() => {
    return calculateBookingFare({
      mode: 'match',
      direction: visitorDirection,
      point: selectedPointId,
      pickupTime: selectedTime || '12:00',
    })
  }, [visitorDirection, selectedPointId, selectedTime])

  // Advance calculation with coupon MARUTI2 / CAB2
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

  // Load Razorpay checkout script if needed
  const ensureRazorpayLoaded = async (): Promise<boolean> => {
    if ((window as any).Razorpay) return true
    return new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
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

    setIsSubmitting(true)

    try {
      // 1. Ensure Razorpay script is present
      const loaded = await ensureRazorpayLoaded()
      const RazorpayClass = (window as any).Razorpay
      if (!loaded || !RazorpayClass) {
        throw new Error('Razorpay checkout failed to load. Please check your internet connection.')
      }

      // 2. Create Razorpay order on backend (amount in paise: Rs 2 = 200 paise, Rs 500 = 50000 paise)
      const advancePaise = advanceToPay * 100
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: advancePaise,
          currency: 'INR',
          receipt: `rcpt_pm_${Date.now()}`,
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
        throw new Error(orderData.error || 'Failed to create payment order.')
      }

      const keyId =
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_TvoQrpE4ShCGDC'

      // 3. Open Razorpay modal
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
        },
        theme: {
          color: '#F59E0B',
        },
        modal: {
          ondismiss: () => {
            setIsSubmitting(false)
          },
        },
        handler: async (response: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) => {
          try {
            // 4. Submit booking with verified payment and pair with target ride!
            const bookingRes = await fetch('/api/bookings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                direction: visitorDirection,
                mode: 'match',
                point: selectedPointId,
                date: ride.travelDate,
                time: selectedTime,
                name: name.trim(),
                phone: phone.trim(),
                passengers: passengers,
                consent: true,
                idempotencyKey: crypto.randomUUID(),
                matchedWithBookingId: ride.id,
                paymentOrderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                paymentSignature: response.razorpay_signature,
                advancePaid: advanceToPay,
                couponCode: appliedCoupon || undefined,
              }),
            })

            const bookingResult = await bookingRes.json()
            if (!bookingRes.ok) {
              throw new Error(bookingResult.error || 'Could not complete match booking.')
            }

            setIsSubmitting(false)
            onSuccess(
              bookingResult.bookingRef,
              bookingResult.publicToken,
              bookingResult.whatsappUrl
            )
          } catch (submitErr: any) {
            setIsSubmitting(false)
            setErrorMsg(submitErr.message || 'Payment verified but booking confirmation failed.')
          }
        },
      }

      const rzp = new RazorpayClass(options)
      rzp.on('payment.failed', (resp: any) => {
        setIsSubmitting(false)
        setErrorMsg(resp.error?.description || 'Payment was declined or failed.')
      })
      rzp.open()
    } catch (err: any) {
      setIsSubmitting(false)
      setErrorMsg(err.message || 'Checkout failed. Please try again.')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                Complete Return Journey
              </span>
              <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 border border-emerald-500/30">
                Instant Confirmation
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5 flex items-center gap-1.5">
              <span>Book Opposite:</span>
              <span className="text-amber-400">{ride.oppositeRouteLabel}</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Inherited Details Card (Read-Only) */}
          <div className="rounded-2xl bg-amber-50/80 border border-amber-200 p-4 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="bg-white/80 rounded-xl p-2.5 border border-amber-100 flex items-center gap-2">
                <Car className="h-4 w-4 text-amber-700 shrink-0" />
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block uppercase">
                    Your Booking Route
                  </span>
                  <strong className="text-slate-900 font-bold">{ride.oppositeRouteLabel}</strong>
                </div>
              </div>
              <div className="bg-white/80 rounded-xl p-2.5 border border-amber-100 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-700 shrink-0" />
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block uppercase">
                    Travel Date
                  </span>
                  <strong className="text-slate-900 font-bold">{ride.travelDateFormatted}</strong>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-amber-800 font-medium">
              💡 Private 4-seater dedicated AC Sedan. Confirmed round-trip booking.
            </p>
          </div>

          {/* Section: Passenger Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <User className="h-4 w-4 text-amber-600" />
              <span>Your Passenger Details</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  WhatsApp Mobile Number *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit mobile number"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* City Drop Point */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {visitorDirection === 'K2I' ? 'Indore Drop Location' : 'Indore Pickup Location'}
              </label>
              <select
                value={selectedPointId}
                onChange={(e) => setSelectedPointId(e.target.value as DropPointId)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
              >
                {PRICING_CONFIG.points.map((p) => {
                  const extra = getDropPointExtra(p.id)
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} {extra > 0 ? `(+₹${extra})` : '(No extra)'}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          {/* Section: Select Pickup Time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-600" />
                <span>Select Your Pickup Time</span>
              </h4>
              <span className="text-[10px] font-bold text-emerald-700">
                Instant Round-Trip Match
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Choose an available pickup time slot for your travel:
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 max-h-44 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200">
              {timeSlotOptions.map((slot) => {
                const isSelected = selectedTime === slot.timeStr
                if (!slot.isEligible) {
                  return (
                    <div
                      key={slot.timeStr}
                      title={slot.reason}
                      className="rounded-xl border border-slate-200 bg-slate-100 p-2 text-center text-slate-400 opacity-60 cursor-not-allowed select-none"
                    >
                      <span className="text-[11px] font-bold line-through block">{slot.label}</span>
                      <span className="text-[8px] font-semibold text-rose-500 block truncate">
                        &lt;4h gap
                      </span>
                    </div>
                  )
                }

                return (
                  <button
                    key={slot.timeStr}
                    type="button"
                    onClick={() => {
                      setSelectedTime(slot.timeStr)
                      setErrorMsg(null)
                    }}
                    className={`rounded-xl p-2 text-center transition-all cursor-pointer border ${
                      isSelected
                        ? 'border-amber-500 bg-amber-400 text-slate-950 font-black shadow-xs ring-2 ring-amber-400/50'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-amber-300 hover:bg-amber-50/50 font-bold'
                    }`}
                  >
                    <span className="text-xs block">{slot.label}</span>
                    <span
                      className={`text-[9px] block ${
                        isSelected ? 'text-slate-900 font-extrabold' : 'text-emerald-700'
                      }`}
                    >
                      ✓ {slot.diffHours}h
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Fare Summary & Coupon */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Total Fare:</span>
              <strong className="text-slate-900 font-black text-sm">
                {formatRs(fare.totalFare)}
              </strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Advance to Pay Now:</span>
              <div className="text-right">
                <strong className="text-emerald-700 font-black text-base">
                  {formatRs(advanceToPay)}
                </strong>
                {appliedCoupon && (
                  <span className="text-[10px] text-amber-700 block font-bold">
                    Coupon {appliedCoupon} applied
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-slate-200 pt-2">
              <span className="text-slate-500 font-semibold">Remaining Balance to Driver:</span>
              <span className="text-slate-800 font-bold">{formatRs(balanceInCab)} (in cab)</span>
            </div>

            {/* Coupon input */}
            <div className="pt-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="grow rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 uppercase"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors"
                >
                  Apply
                </button>
              </div>
              {couponNotice && (
                <p className="text-[11px] font-bold text-emerald-700 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{couponNotice}</span>
                </p>
              )}
            </div>
          </div>

          {/* Secure Payment Notice */}
          <div className="flex items-center gap-2 text-slate-600 text-[11px]">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              🔒 100% Secure Online Payment. Note: Confirmed bookings are final and non-refundable once confirmed.
            </span>
          </div>
        </div>

        {/* Modal Footer / Action Button */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3.5 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">Pay Advance</div>
            <strong className="text-lg font-black text-slate-900">{formatRs(advanceToPay)}</strong>
          </div>

          <button
            type="button"
            disabled={isSubmitting || !selectedTime || name.trim().length < 2 || !phone.trim()}
            onClick={handleCheckoutAndConfirm}
            className="flex items-center gap-2 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-6 py-3 text-xs sm:text-sm shadow-md transition-all active:scale-98 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing Payment...</span>
              </>
            ) : (
              <>
                <span>Pay {formatRs(advanceToPay)} & Complete Round</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
