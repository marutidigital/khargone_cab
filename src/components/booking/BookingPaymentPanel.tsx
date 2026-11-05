'use client'

import { useState } from 'react'
import Script from 'next/script'
import {
  ShieldCheck,
  Tag,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { formatRs } from '@/config/pricing'
import { BOOKING_CONFIG, type BookingMode, type FareBreakdown } from '@/lib/config'

declare global {
  interface Window {
    Razorpay: any
  }
}

interface Props {
  mode: BookingMode
  breakdown: FareBreakdown
  dateLabel: string
  timeLabel: string | null
  isValid: boolean
  isSubmitting: boolean
  bookingLabel?: string
  passengerName: string
  passengerPhone: string
  passengerEmail?: string
  onPaymentSuccess: (paymentInfo: {
    orderId: string
    paymentId: string
    signature: string
    advancePaid: number
    couponCode?: string
  }) => void
}

export function BookingPaymentPanel({
  mode,
  breakdown,
  dateLabel,
  timeLabel,
  isValid,
  isSubmitting,
  bookingLabel,
  passengerName,
  passengerPhone,
  passengerEmail,
  onPaymentSuccess,
}: Props) {
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  // Standard advance is Rs 500
  // Rs 2 coupon: MARUTI2, CAB2, TEST2, PAY2, TWO -> Rs 2 advance
  // 99% coupon: MARUTI99, TEST99, CAB99 -> Rs 5 advance
  const is2RsCoupon = appliedCoupon && ['MARUTI2', 'CAB2', 'TEST2', 'PAY2', 'TWO'].includes(appliedCoupon)
  const is99Coupon = appliedCoupon && ['TEST99', 'MARUTI99', 'DISCOUNT99', 'CAB99', 'OFF99'].includes(appliedCoupon)
  const isCouponActive = Boolean(appliedCoupon)
  const advanceAmount = is2RsCoupon ? 2 : is99Coupon ? 5 : 500
  const balanceAmount = Math.max(0, breakdown.totalFare - advanceAmount)

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault()
    setCouponError(null)
    const code = couponInput.trim().toUpperCase()

    if (!code) {
      setCouponError('Enter a coupon code')
      return
    }

    const valid2Coupons = ['MARUTI2', 'CAB2', 'TEST2', 'PAY2', 'TWO']
    const valid99Coupons = ['TEST99', 'MARUTI99', 'DISCOUNT99', 'CAB99', 'OFF99']

    if (valid2Coupons.includes(code) || valid99Coupons.includes(code)) {
      setAppliedCoupon(code)
      setCouponInput('')
      setCouponError(null)
    } else {
      setCouponError('Invalid coupon code.')
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponError(null)
  }

  const handlePayAdvance = async () => {
    if (!isValid || !timeLabel) {
      setPaymentError('Please fill all passenger details and select date/time first.')
      return
    }

    setPaymentLoading(true)
    setPaymentError(null)

    try {
      // 1. Create Razorpay Order for advance amount
      const advancePaise = advanceAmount * 100
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: advancePaise,
          currency: 'INR',
          receipt: `adv_${Date.now()}`,
          notes: {
            passenger_name: passengerName,
            passenger_phone: passengerPhone,
            advance_amount: String(advanceAmount),
            coupon: appliedCoupon || 'NONE',
          },
        }),
      })

      const orderData = await orderRes.json()
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to initialize payment gateway.')
      }

      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_TvoQrpE4ShCGDC'
      if (!window.Razorpay) {
        throw new Error('Payment gateway SDK loading. Please retry in a few seconds.')
      }

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'MarutiCab Intercity',
        description: `₹${advanceAmount} Advance Booking Reservation`,
        order_id: orderData.order_id,
        prefill: {
          name: passengerName,
          contact: passengerPhone,
          ...(passengerEmail ? { email: passengerEmail } : {}),
        },
        theme: {
          color: '#FBBF24',
        },
        modal: {
          ondismiss: () => {
            setPaymentLoading(false)
            setPaymentError('Advance payment cancelled. Booking requires advance to confirm.')
          },
        },
        handler: async (response: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) => {
          try {
            // 3. Verify Payment Signature
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                order_id: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })

            const verifyData = await verifyRes.json()
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || 'Payment signature verification failed.')
            }

            // Call parent callback to complete booking creation
            onPaymentSuccess({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              advancePaid: advanceAmount,
              couponCode: appliedCoupon || undefined,
            })
          } catch (verifyErr: any) {
            setPaymentError(verifyErr.message || 'Payment verification failed.')
          } finally {
            setPaymentLoading(false)
          }
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (err: any) => {
        setPaymentError(err.error?.description || 'Payment failed. Please try again.')
        setPaymentLoading(false)
      })

      rzp.open()
    } catch (err: any) {
      setPaymentError(err.message || 'Could not launch checkout.')
      setPaymentLoading(false)
    }
  }

  return (
    <>
      <Script
        id="razorpay-checkout-script"
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-xs">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-[#FBBF24]">4.</span>
            <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
              Payment & Advance
            </h2>
          </div>
          <span className="rounded-full bg-amber-100 text-amber-900 text-[11px] font-extrabold px-2.5 py-0.5">
            ₹500 Advance
          </span>
        </div>

        {/* Fare Breakdown Details */}
        <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs sm:text-sm">
          <div className="flex justify-between gap-3 text-slate-600">
            <span>Ride type</span>
            <strong className="text-slate-900">
              {bookingLabel || (mode === 'match' ? 'Match Deal' : 'Confirmed Booking')}
            </strong>
          </div>
          <div className="flex justify-between gap-3 text-slate-600">
            <span>Pickup</span>
            <strong className="text-right text-slate-900">
              {dateLabel} · {timeLabel || 'Choose a time'}
            </strong>
          </div>
          <div className="flex justify-between gap-3 text-slate-600">
            <span>Base route fare</span>
            <strong className="text-slate-900">{formatRs(breakdown.baseFare)}</strong>
          </div>
          {breakdown.dropPointExtra > 0 && (
            <div className="flex justify-between gap-3 text-slate-600">
              <span>Drop-point extra</span>
              <strong className="text-slate-900">+{formatRs(breakdown.dropPointExtra)}</strong>
            </div>
          )}
          {breakdown.nightSurcharge > 0 && (
            <div className="flex justify-between gap-3 text-slate-600">
              <span>Night surcharge</span>
              <strong className="text-slate-900">+{formatRs(breakdown.nightSurcharge)}</strong>
            </div>
          )}

          <div className="flex justify-between gap-3 border-t border-slate-200 pt-2.5 font-bold text-slate-900">
            <span>Total Trip Fare</span>
            <strong className="text-base font-black text-slate-950">
              {formatRs(breakdown.totalFare)}
            </strong>
          </div>

          {/* Advance & Balance Split */}
          <div className="border-t border-dashed border-slate-200 pt-2.5 space-y-2">
            <div className="flex justify-between items-center text-amber-900 bg-amber-50/80 p-2 rounded-xl">
              <span className="font-extrabold flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-amber-600" />
                Advance Online Payment
              </span>
              <div className="text-right">
                {isCouponActive && (
                  <span className="text-[11px] text-slate-400 line-through mr-1.5 font-normal">
                    ₹500
                  </span>
                )}
                <strong className="text-sm font-black text-slate-950">
                  {formatRs(advanceAmount)}
                </strong>
              </div>
            </div>

            <div className="flex justify-between items-center text-emerald-900 bg-emerald-50/70 p-2 rounded-xl">
              <span className="font-bold">Remaining balance (to driver in cab)</span>
              <strong className="text-sm font-black text-emerald-950">
                {formatRs(balanceAmount)}
              </strong>
            </div>
          </div>
        </div>

        {/* Promo Coupon Box */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
            <Tag className="w-3.5 h-3.5 text-amber-600" />
            <span>Have a Coupon Code?</span>
          </div>

          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 text-xs">
              <div className="flex items-center gap-2 text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <strong>{appliedCoupon}</strong> Applied: <strong>Discount Verified</strong>
                  <div className="text-[10px] text-emerald-700">Pay only ₹{advanceAmount} now to confirm.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="text-xs text-rose-600 font-bold hover:underline cursor-pointer ml-2"
              >
                Remove
              </button>
            </div>
          ) : (
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter coupon code"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-900 placeholder:normal-case placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#FBBF24]"
              />
              <button
                type="submit"
                className="bg-slate-900 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Apply
              </button>
            </form>
          )}

          {couponError && (
            <p className="mt-1.5 text-[11px] text-rose-600 font-semibold">{couponError}</p>
          )}
        </div>

        {/* Notice of advance payment */}
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs leading-relaxed text-amber-950">
          <strong>Advance Booking Policy:</strong> We collect <strong>{formatRs(advanceAmount)}</strong> advance online payment to submit your booking request. The remaining balance of <strong>{formatRs(balanceAmount)}</strong> is payable directly to your driver in the cab.
        </p>

        {paymentError && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{paymentError}</span>
          </div>
        )}

        {/* Pay Advance Button */}
        <button
          type="button"
          disabled={!isValid || isSubmitting || paymentLoading}
          onClick={handlePayAdvance}
          className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#FBBF24] hover:bg-[#F59E0B] px-4 py-3 text-sm font-black text-slate-950 shadow-md transition-all active:scale-98 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer"
        >
          {paymentLoading || isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing Payment…</span>
            </>
          ) : (
            <>
              <span>Pay {formatRs(advanceAmount)} Advance & Confirm</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        <p className="mt-2 text-center text-[11px] text-slate-500">
          🔒 100% Secure Online Payment · Safe & Encrypted
        </p>
      </section>
    </>
  )
}
