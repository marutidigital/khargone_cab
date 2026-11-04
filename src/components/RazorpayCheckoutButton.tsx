'use client'

import { useState } from 'react'
import Script from 'next/script'
import { CreditCard, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

declare global {
  interface Window {
    Razorpay: any
  }
}

interface RazorpayCheckoutButtonProps {
  amountInPaise?: number // in paise (e.g., 50000 = Rs 500)
  amountInRupees?: number // in rupees (e.g., 500 = Rs 500)
  title?: string
  description?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  notes?: Record<string, string>
  onSuccess?: (paymentResult: { orderId: string; paymentId: string }) => void
  onFailure?: (error: string) => void
  className?: string
  buttonText?: string
}

export function RazorpayCheckoutButton({
  amountInPaise,
  amountInRupees = 500,
  title = 'MarutiCab Private Cab',
  description = 'Advance Cab Booking Payment',
  customerName = '',
  customerPhone = '',
  customerEmail = '',
  notes,
  onSuccess,
  onFailure,
  className,
  buttonText,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null)

  // Calculate paise
  const finalAmountPaise = amountInPaise ?? Math.round(amountInRupees * 100)
  const displayRupees = (finalAmountPaise / 100).toLocaleString('en-IN')

  const handleCheckout = async () => {
    setLoading(true)
    setErrorMessage(null)
    setPaymentSuccess(null)

    try {
      // 1. Create order on backend
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalAmountPaise,
          currency: 'INR',
          receipt: `rcpt_${Date.now()}`,
          notes,
        }),
      })

      const orderData = await orderRes.json()
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to initialize payment order.')
      }

      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
      if (!keyId) {
        throw new Error('Razorpay public key (NEXT_PUBLIC_RAZORPAY_KEY_ID) is not configured.')
      }

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.')
      }

      // 2. Open Razorpay Standard Checkout Modal
      const options = {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: title,
        description: description,
        order_id: orderData.order_id,
        prefill: {
          name: customerName,
          contact: customerPhone,
          email: customerEmail,
        },
        theme: {
          color: '#FBBF24',
        },
        modal: {
          ondismiss: () => {
            setLoading(false)
            setErrorMessage('Payment cancelled by user.')
            onFailure?.('Payment cancelled by user.')
          },
        },
        handler: async (response: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) => {
          try {
            // 3. Verify signature on backend
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

            setPaymentSuccess(response.razorpay_payment_id)
            onSuccess?.({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
            })
          } catch (err: any) {
            setErrorMessage(err.message || 'Payment verification error.')
            onFailure?.(err.message || 'Payment verification error.')
          } finally {
            setLoading(false)
          }
        },
      }

      const rzp = new window.Razorpay(options)

      rzp.on('payment.failed', (failedRes: any) => {
        const errorDesc =
          failedRes.error?.description ||
          failedRes.error?.reason ||
          'Payment process encountered a failure.'
        setErrorMessage(errorDesc)
        onFailure?.(errorDesc)
        setLoading(false)
      })

      rzp.open()
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not initiate payment.')
      onFailure?.(err.message || 'Could not initiate payment.')
      setLoading(false)
    }
  }

  return (
    <>
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setScriptLoaded(true)}
      />

      <div className="space-y-2">
        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading}
          className={
            className ||
            'flex items-center justify-center gap-2 w-full py-3 px-5 rounded-xl bg-[#FBBF24] hover:bg-[#F59E0B] text-slate-950 font-black text-sm shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-50'
          }
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Opening Checkout…</span>
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              <span>{buttonText || `Pay ₹${displayRupees} Online`}</span>
            </>
          )}
        </button>

        {errorMessage && (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {paymentSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Payment successful! Ref ID: {paymentSuccess}</span>
          </div>
        )}
      </div>
    </>
  )
}
