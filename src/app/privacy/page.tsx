// src/app/privacy/page.tsx
import { Nav } from '@/components/Nav'
import { FooterMarquee } from '@/components/FooterMarquee'
import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy - Hanscab',
  description: 'Hanscab privacy policy regarding booking information and WhatsApp communications.',
}

export default function PrivacyPage() {
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
              Data Protection
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-3">
              Privacy Policy
            </h1>
            <p className="text-xs text-slate-500 mt-1">Effective Date: October 2026 · Hanscab (hanscab.in)</p>
          </div>

          <section className="space-y-4 text-sm leading-relaxed text-slate-600">
            <p>
              At Hanscab, we respect your privacy and are committed to protecting your personal information. This Privacy Policy outlines what information we collect and how we use it to provide seamless private cab booking services between Khargone and Indore.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">1. Information We Collect</h2>
            <p>
              When requesting a cab booking on hanscab.in, we collect:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
              <li>Your name and contact phone number (10-digit Indian mobile number).</li>
              <li>Trip details including travel date, pickup time, pickup location, and drop point.</li>
              <li>Number of passengers and preferred vehicle category (Economy Sedan or Premium SUV).</li>
              <li>Optional landmark or specific doorstep pickup address.</li>
            </ul>

            <h2 className="text-base font-bold text-slate-900 pt-2">2. How We Use Your Information</h2>
            <p>
              Your contact details are used exclusively to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
              <li>Coordinate car availability and driver dispatch.</li>
              <li>Send ride confirmations, payment links, and driver contact info via WhatsApp.</li>
              <li>Provide customer assistance during your journey.</li>
            </ul>

            <h2 className="text-base font-bold text-slate-900 pt-2">3. WhatsApp Consent</h2>
            <p>
              We only send booking communications and driver coordinates to users who explicitly agree to be contacted on WhatsApp. We do not engage in spam marketing.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">4. Data Deletion Request</h2>
            <p>
              You have the right to request deletion of your booking history and contact record at any time by messaging our support team on WhatsApp.
            </p>
          </section>
        </div>
      </main>

      <FooterMarquee />
    </div>
  )
}
