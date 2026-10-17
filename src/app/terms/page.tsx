// src/app/terms/page.tsx
import { Nav } from '@/components/Nav'
import { FooterMarquee } from '@/components/FooterMarquee'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service - Hanscab',
  description: 'Terms of Service and transparent travel conditions for Hanscab private car bookings.',
}

export default function TermsPage() {
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
              Legal
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-3">
              Terms of Service
            </h1>
            <p className="text-xs text-slate-500 mt-1">Effective Date: October 2026 · Hanscab (hanscab.in)</p>
          </div>

          <section className="space-y-4 text-sm leading-relaxed text-slate-600">
            <h2 className="text-base font-bold text-slate-900">1. Nature of Service</h2>
            <p>
              Hanscab provides dedicated, private one-way and return cab bookings between Khargone and Indore. Every booking reserves the entire private car for your family or group without shared co-passengers.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">2. All-Inclusive Pricing</h2>
            <p>
              The total fare shown at checkout includes toll charges, driver allowance, and parking charges. No surprise add-ons or hidden charges will be demanded by the driver on your route.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">3. Pickup &amp; Waiting Time</h2>
            <p>
              Your driver will contact you 30 minutes before your scheduled pickup time. To maintain route schedule, complimentary waiting time of up to 20 minutes is provided at the pickup point.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">4. Luggage &amp; Passenger Capacity</h2>
            <p>
              Economy Sedans accommodate up to 4 passengers and 2–3 standard luggage bags. Premium SUVs accommodate up to 6 passengers and 4–5 bags. Passengers must adhere to the legal seating capacity of the booked vehicle.
            </p>
          </section>
        </div>
      </main>

      <FooterMarquee />
    </div>
  )
}
