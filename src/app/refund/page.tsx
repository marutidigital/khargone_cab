// src/app/refund/page.tsx
import { Nav } from '@/components/Nav'
import { FooterMarquee } from '@/components/FooterMarquee'
import Link from 'next/link'
import { ShieldCheck, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Booking & Cancellation Policy - MarutiCab',
  description: 'How MarutiCab booking requests, availability, cancellations, and changes work.',
}

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-[#F4F4F5] flex flex-col justify-between font-sans">
      <Nav />

      <main className="max-w-3xl mx-auto px-4 py-10 w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-black mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Booking</span>
        </Link>

        <div className="bg-white rounded-2xl p-6 sm:p-10 border border-[#E5E7EB] shadow-xs space-y-6 text-slate-800">
          <div className="border-b border-slate-100 pb-5">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100 border border-amber-200 px-3 py-1 rounded-full">
              Transparent Assurance
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-3">
              Booking &amp; Cancellation Policy
            </h1>
            <p className="text-xs text-slate-500 mt-1">Effective Date: October 2026 · MarutiCab</p>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-sm text-emerald-950">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              Match Deal advance of Rs 500 is refundable if no compatible ride is found. Confirm Now bookings pay Rs 500 now and the remaining fare in the cab.
            </div>
          </div>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="text-base font-bold text-slate-900">1. Booking Requests</h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              Your booking is active only after the Rs 500 payment is verified. A Match Deal confirms after an opposite-direction ride is found. Confirm Now guarantees a private cab at the exact pickup time.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">2. Passenger Cancellations</h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              If no Match Deal is found by 24 hours before pickup, select a full refund or upgrade. If no option is selected within six hours, we request a full Rs 500 refund. Refunds go to the original payment method and usually take 5–7 working days. Contact MarutiCab promptly for other cancellations.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">3. Trip Modifications</h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              The exact pickup time cannot be changed after payment. Contact support for changes; these depend on availability and may require a new booking.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">4. Fare and Payment</h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              The fare summary lists the base fare, drop-point difference, night surcharge, advance and balance. Tolls are included; no driver allowance or parking charge applies. Distance beyond the selected drop is charged at Rs 13/km, calculated at the final destination.
            </p>
          </section>
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><strong>संक्षेप में:</strong> मैच नहीं मिलने पर ₹500 अग्रिम राशि वापस मिलेगी। रिफंड सामान्यतः 5–7 कार्यदिवस में मूल भुगतान माध्यम पर आता है।</p>
        </div>
      </main>

      <FooterMarquee />
    </div>
  )
}
