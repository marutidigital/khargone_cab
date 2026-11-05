'use client'

import { useState } from 'react'
import { Nav } from '@/components/Nav'
import { RazorpayCheckoutButton } from '@/components/RazorpayCheckoutButton'
import { ShieldCheck, CreditCard, CheckCircle2 } from 'lucide-react'

export default function RazorpayDemoPage() {
  const [amount, setAmount] = useState(500)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [verifiedPayment, setVerifiedPayment] = useState<{
    orderId: string
    paymentId: string
  } | null>(null)

  return (
    <div className="min-h-screen bg-[#F4F4F5] text-slate-900 antialiased flex flex-col justify-between">
      <div>
        <Nav />

        <main className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-6 h-6 text-amber-800" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Secure Online Checkout
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Secure online payment for MarutiCab rides
              </p>
            </div>

            {verifiedPayment ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h2 className="text-lg font-black text-emerald-950">Payment Verified!</h2>
                <p className="text-xs text-emerald-800">
                  Your payment signature was validated via HMAC-SHA256.
                </p>
                <div className="bg-white rounded-xl p-3 text-left text-xs font-mono space-y-1 border border-emerald-200">
                  <div><strong>Payment ID:</strong> {verifiedPayment.paymentId}</div>
                  <div><strong>Order ID:</strong> {verifiedPayment.orderId}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setVerifiedPayment(null)}
                  className="mt-2 text-xs font-bold text-emerald-800 underline cursor-pointer"
                >
                  Make another payment
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Amount quick picks */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Select Amount
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 500, 1800, 2200].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmount(amt)}
                        className={`py-2 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          amount === amt
                            ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {amt === 2 ? '₹2 (Test)' : `₹${amt.toLocaleString('en-IN')}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer Details */}
                <div className="space-y-3 pt-2">
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
                      WhatsApp Mobile Number
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

                {/* Checkout Button Component */}
                <div className="pt-3">
                  <RazorpayCheckoutButton
                    amountInRupees={amount}
                    customerName={name}
                    customerPhone={phone}
                    description={`MarutiCab Advance Payment (₹${amount})`}
                    buttonText={`Pay ₹${amount.toLocaleString('en-IN')} Online`}
                    onSuccess={(res) => setVerifiedPayment(res)}
                  />
                </div>

                <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-slate-500 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>256-bit Encrypted · Official Payment Gateway</span>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
