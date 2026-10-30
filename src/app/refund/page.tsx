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
              Booking requests are saved without advance payment. Our team will contact you to confirm cab availability.
            </div>
          </div>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="text-base font-bold text-slate-900">1. Booking Requests</h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              Submitting a request does not collect payment or guarantee a confirmed car. Our team will contact you after checking availability. If all cabs are booked, we will get in touch if a cancellation comes in or a new car is added to our fleet.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">2. Passenger Cancellations</h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              Please contact MarutiCab as soon as possible if you need to cancel a request or a confirmed trip. No payment is collected when you submit a request.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">3. Trip Modifications</h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              You may reschedule your pickup time or travel date with at least 3 hours advance notice via WhatsApp at no additional charge, subject to car availability.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">4. Fare and Payment</h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              The website displays the total fare for the selected route, vehicle, date, and pickup point. Any distance beyond the selected drop point is calculated at Rs 13 per additional kilometre at the final destination.
            </p>
          </section>
        </div>
      </main>

      <FooterMarquee />
    </div>
  )
}
