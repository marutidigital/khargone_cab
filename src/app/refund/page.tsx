// src/app/refund/page.tsx
import { Nav } from '@/components/Nav'
import { FooterMarquee } from '@/components/FooterMarquee'
import Link from 'next/link'
import { ShieldCheck, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Refund & Cancellation Policy - Hanscab',
  description: 'Hanscab transparent 100% refund policy if your trip cannot be confirmed.',
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
              Refund &amp; Cancellation Policy
            </h1>
            <p className="text-xs text-slate-500 mt-1">Effective Date: October 2026 · Hanscab</p>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-sm text-emerald-950">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>100% Full Refund Guarantee:</strong> If Hanscab cannot confirm your car or driver for any reason, you will receive a full 100% refund of your advance deposit without deductions.
            </div>
          </div>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="text-base font-bold text-slate-900">1. Advance Token Deposits</h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              To guarantee your private car reservation, an advance token deposit of Rs 500 is collected upon confirmation. The remaining balance fare is payable directly to your driver in cash or UPI at the time of your ride.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">2. Passenger Cancellations</h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              If you cancel your booking more than 4 hours before the scheduled pickup time, your entire advance deposit is fully refunded or credited towards your next ride at your choice. For cancellations made within 2 hours of pickup, a nominal dispatch compensation of Rs 200 may be retained.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">3. Trip Modifications</h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              You may reschedule your pickup time or travel date with at least 3 hours advance notice via WhatsApp at no additional charge, subject to car availability.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">4. Refund Processing Time</h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              Refunds are processed back to the original UPI ID or bank account within 2 to 4 business hours.
            </p>
          </section>
        </div>
      </main>

      <FooterMarquee />
    </div>
  )
}
