'use client'
// src/components/FooterTrust.tsx
import Image from 'next/image'
import Link from 'next/link'
import {
  ShieldCheck,
  RefreshCw,
  Clock,
  Car,
  UserCheck,
  Phone,
  MessageCircle,
} from 'lucide-react'
import { PRICING_CONFIG } from '@/config/pricing'

export function FooterTrust() {
  const whatsappUrl = `https://wa.me/${PRICING_CONFIG.contactWhatsApp}?text=${encodeURIComponent(
    'Hi Hanscab, I need assistance with a cab booking.'
  )}`

  return (
    <footer className="mt-16 bg-white border-t border-[#E5E7EB] text-slate-700">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-8">
        {/* Real Cars & Verified Drivers Showcase */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 bg-[#FBBF24]/20 border border-[#FBBF24]/40 px-3 py-1 rounded-full text-xs font-bold text-amber-950 mb-2">
            <Car className="w-3.5 h-3.5 text-amber-800" />
            <span>Hanscab Verified Fleet</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Clean Private Cars &amp; Trusted Local Drivers
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto mt-1">
            Dedicated private vehicles for your family. No shared taxi hassles, no co-passengers.
          </p>
        </div>

        {/* Fleet & Driver Showcase */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {/* Card 1: Dzire Sedan */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-full h-32 relative bg-white rounded-xl overflow-hidden mb-3 flex items-center justify-center border border-slate-200">
              <Image
                src="/cars/sedan.webp"
                alt="Maruti Dzire Economy Sedan"
                fill
                className="object-contain p-2"
                sizes="(max-width: 640px) 100vw, 300px"
              />
            </div>
            <div className="text-sm font-bold text-slate-900">Maruti Dzire / Honda Amaze</div>
            <div className="text-xs text-amber-800 font-extrabold mt-0.5">AC Private Sedan</div>
            <p className="text-xs text-slate-500 mt-2">
              Clean upholstery, sanitized interiors, comfortable boot space for 2–3 bags.
            </p>
          </div>

          {/* Card 2: Ertiga / Innova SUV */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-full h-32 relative bg-white rounded-xl overflow-hidden mb-3 flex items-center justify-center border border-slate-200">
              <Image
                src="/cars/suv.webp"
                alt="Maruti Ertiga Premium SUV"
                fill
                className="object-contain p-2"
                sizes="(max-width: 640px) 100vw, 300px"
              />
            </div>
            <div className="text-sm font-bold text-slate-900">Maruti Ertiga / Toyota Innova</div>
            <div className="text-xs text-sky-800 font-extrabold mt-0.5">AC Premium SUV (6 Pax)</div>
            <p className="text-xs text-slate-500 mt-2">
              Extra legroom and roof carrier, ideal for family airport drops and luggage.
            </p>
          </div>

          {/* Card 3: Verified Drivers */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center mb-3">
              <UserCheck className="w-8 h-8 text-emerald-700 stroke-[2.5]" />
            </div>
            <div className="text-sm font-bold text-slate-900">Local Verified Drivers</div>
            <div className="text-xs text-emerald-700 font-extrabold mt-0.5">5+ Years Highway Experience</div>
            <p className="text-xs text-slate-500 mt-2">
              Background verified, polite, and punctual. Calls 30 minutes prior to pickup.
            </p>
          </div>
        </div>

        {/* 3 Pillars of Trust */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-200 mb-8">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">100% Refund Guarantee</div>
              <p className="text-xs text-slate-500 mt-0.5">
                Full advance refund if Hanscab cannot confirm your car.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">No Hidden Costs</div>
              <p className="text-xs text-slate-500 mt-0.5">
                All tolls, driver allowance, and parking charges included.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-sky-700" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Daily Support</div>
              <p className="text-xs text-slate-500 mt-0.5">
                Available {PRICING_CONFIG.supportHours} on WhatsApp &amp; Call.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Legal & Contact Row */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} Hanscab (hanscab.in). All rights reserved. Khargone ↔ Indore Private Cabs.
          </div>

          <div className="flex items-center gap-4 sm:gap-6 font-semibold">
            <Link href="/refund" className="hover:text-black transition-colors">
              Refund &amp; Cancellation
            </Link>
            <Link href="/terms" className="hover:text-black transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-black transition-colors">
              Privacy Policy
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span>WhatsApp Help</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
