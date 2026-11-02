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
              No advance is collected for new bookings. Pay the displayed fare in the cab after your ride is confirmed. Any advance paid on an older booking follows the refund terms shown in that booking.
            </div>
          </div>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="text-base font-bold text-slate-900">1. Booking Requests</h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              Your booking request is saved without an online payment. We confirm a Match Deal after finding a compatible opposite-direction ride at your selected time.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">2. Passenger Cancellations</h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              You may cancel from your secure booking status link while your Match Deal is waiting for confirmation. No payment is taken for new bookings. Online cancellation is unavailable after a compatible ride is confirmed. If an older booking has a captured advance, its refund is processed to the original payment method, usually within 5–7 working days.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">3. Trip Modifications</h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              The exact pickup time cannot be changed after confirmation. Contact support for changes; these depend on availability and may require a new booking.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">4. Fare and Payment</h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              The fare summary lists the route fare and any night charge. The full displayed fare is payable in the cab after confirmation. Tolls are included; no driver allowance or parking charge applies. Distance beyond the selected drop is charged at Rs 13/km, calculated at the final destination.
            </p>
          </section>
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><strong>संक्षेप में:</strong> पुष्टि से पहले बुकिंग रद्द करने पर ₹500 अग्रिम राशि वापस मिलेगी। पुष्टि के बाद ऑनलाइन रद्द नहीं कर सकते। रिफंड सामान्यतः 5–7 कार्यदिवस में मूल भुगतान माध्यम पर आता है।</p>
        </div>
      </main>

      <FooterMarquee />
    </div>
  )
}
