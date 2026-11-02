// src/app/terms/page.tsx
import { Nav } from '@/components/Nav'
import { FooterMarquee } from '@/components/FooterMarquee'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service - MarutiCab',
  description: 'Terms of Service and transparent travel conditions for MarutiCab private car bookings.',
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
            <p className="text-xs text-slate-500 mt-1">Effective Date: October 2026 · MarutiCab</p>
          </div>

          <section className="space-y-4 text-sm leading-relaxed text-slate-600">
            <h2 className="text-base font-bold text-slate-900">1. Nature of Service</h2>
            <p>
              MarutiCab provides dedicated, private one-way and return cab bookings between Khargone and Indore. Every booking reserves the entire private car for your family or group without shared co-passengers.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">2. All-Inclusive Pricing</h2>
            <p>
              The fare shown at checkout includes tolls. There is no driver allowance or parking charge. Night pickups from 10:00 PM through 4:30 AM include the displayed surcharge. A route beyond your selected drop point is charged at Rs 13/km, calculated at the final destination.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">3. Pickup &amp; Waiting Time</h2>
            <p>
              Your pickup time is exact and fixed once confirmed. Your driver will contact you before pickup. Please be ready on time; contact support promptly if you are delayed or need to cancel.
            </p>
            <p>Drivers allow 15 minutes after the scheduled pickup. If you are running late, contact support immediately; after the waiting period the car may leave and a confirmed-ride advance may not be refundable. Match Deal no-match refunds follow the separate full-refund rule above.</p>

            <h2 className="text-base font-bold text-slate-900 pt-2">4. Luggage &amp; Passenger Capacity</h2>
            <p>
              Economy Sedans accommodate up to 4 passengers and 2–3 standard luggage bags. Passengers must adhere to the legal seating capacity of the booked vehicle.
            </p>
          </section>
          <section className="rounded-xl bg-amber-50 p-4 text-sm"><h2 className="font-bold text-slate-900">Match Deal</h2><p className="mt-2 text-slate-700">A Rs 500 advance is paid online. If a compatible opposite-direction booking is found, your exact pickup time remains unchanged. If no match is found by 24 hours before pickup, choose a full advance refund or upgrade to Confirm Now. If no choice is received within six hours, we request a full refund. Guaranteed rides also require a Rs 500 advance; the displayed balance is paid in the cab.</p></section>
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><strong>संक्षेप में:</strong> Match Deal के लिए ₹500 अग्रिम राशि पूरी तरह वापस मिलेगी यदि मैच नहीं मिलता। पिकअप का समय बुकिंग की पुष्टि के बाद नहीं बदलेगा।</p>
        </div>
      </main>

      <FooterMarquee />
    </div>
  )
}
