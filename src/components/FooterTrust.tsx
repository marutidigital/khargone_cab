'use client'
// src/components/FooterTrust.tsx

import { useState } from 'react'
import Image from 'next/image'
import {
  ShieldCheck,
  RefreshCw,
  Clock,
  Car,
  UserCheck,
  Phone,
  MessageCircle,
  FileText,
  ChevronDown,
  X
} from 'lucide-react'
import { PRICING_CONFIG } from '@/config/pricing'

export function FooterTrust() {
  const [activeModal, setActiveModal] = useState<'refund' | 'terms' | 'privacy' | null>(null)

  const whatsappUrl = `https://wa.me/${PRICING_CONFIG.contactWhatsApp}?text=${encodeURIComponent('Hi Hanscab, I need assistance with a cab booking.')}`

  return (
    <footer className="mt-16 bg-[#070C15] border-t border-slate-800 text-slate-300">
      {/* Real Cars & Verified Drivers Showcase */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#F5B841]/10 border border-[#F5B841]/20 px-3 py-1 rounded-full text-xs font-semibold text-[#F5B841] mb-2">
            <Car className="w-3.5 h-3.5" />
            <span>Hanscab Verified Fleet</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Clean Private Cars & Trusted Local Drivers
          </h3>
          <p className="text-sm text-slate-400 max-w-xl mx-auto mt-1">
            Dedicated private vehicles for your family. No stranger pickups, no shared taxi hassles.
          </p>
        </div>

        {/* Fleet & Driver Cards Showcase */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {/* Card 1: Dzire Sedan */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-full h-32 relative bg-slate-800/60 rounded-xl overflow-hidden mb-3 flex items-center justify-center">
              <Image
                src="/economy_sedan.png"
                alt="Economy Sedan"
                fill
                className="object-contain p-2"
                sizes="(max-width: 640px) 100vw, 300px"
              />
            </div>
            <div className="text-sm font-bold text-white">Maruti Dzire / Honda Amaze</div>
            <div className="text-xs text-[#F5B841] font-semibold mt-0.5">AC Private Sedan</div>
            <p className="text-xs text-slate-400 mt-2">
              Clean upholstery, sanitized interiors, boot space for 2–3 bags.
            </p>
          </div>

          {/* Card 2: Ertiga / Innova SUV */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-full h-32 relative bg-slate-800/60 rounded-xl overflow-hidden mb-3 flex items-center justify-center">
              <Image
                src="/premium_suv.png"
                alt="Premium SUV"
                fill
                className="object-contain p-2"
                sizes="(max-width: 640px) 100vw, 300px"
              />
            </div>
            <div className="text-sm font-bold text-white">Maruti Ertiga / Innova</div>
            <div className="text-xs text-[#F5B841] font-semibold mt-0.5">7-Seater Family SUV</div>
            <p className="text-xs text-slate-400 mt-2">
              Generous legroom, chilled dual AC, comfortable for up to 6 passengers.
            </p>
          </div>

          {/* Card 3: Verified Drivers */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center justify-between">
            <div className="w-full h-32 bg-gradient-to-br from-slate-800 to-slate-850 rounded-xl mb-3 flex flex-col items-center justify-center p-3 border border-slate-700/50">
              <div className="w-12 h-12 rounded-full bg-[#F5B841]/20 border border-[#F5B841]/40 flex items-center justify-center mb-2">
                <UserCheck className="w-6 h-6 text-[#F5B841]" />
              </div>
              <span className="text-xs font-bold text-slate-200">Police Verified & Commercial Licensed</span>
            </div>
            <div>
              <div className="text-sm font-bold text-white">Courteous Local Drivers</div>
              <div className="text-xs text-[#F5B841] font-semibold mt-0.5">Experienced Route Experts</div>
              <p className="text-xs text-slate-400 mt-2">
                Driver calls 30 mins before pickup. Strict speed limits & smooth driving.
              </p>
            </div>
          </div>
        </div>

        {/* 4 Trust Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-6 border-y border-slate-800/80">
          <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-800">
            <RefreshCw className="w-5 h-5 text-[#F5B841] flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-white leading-tight">100% Refund Policy</div>
              <div className="text-[11px] text-slate-400 mt-0.5">If trip is unconfirmed</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-800">
            <ShieldCheck className="w-5 h-5 text-[#F5B841] flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-white leading-tight">Fixed Clear Fare</div>
              <div className="text-[11px] text-slate-400 mt-0.5">No hidden driver allowance</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-800">
            <Car className="w-5 h-5 text-[#F5B841] flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-white leading-tight">Strictly Private</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Never pooled with strangers</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-800">
            <Clock className="w-5 h-5 text-[#F5B841] flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-white leading-tight">Support Hours</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{PRICING_CONFIG.supportHours}</div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Policies, WhatsApp, Copyright */}
        <div className="pt-8 pb-4 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="font-bold text-white text-sm">Hanscab (hanscab.in)</span>
            <span>Reliable Private Cabs between Khargone and Indore</span>
            <span>WhatsApp / Phone: +{PRICING_CONFIG.contactWhatsApp} · Support: {PRICING_CONFIG.supportHours}</span>
          </div>

          {/* Policy Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
            <button
              onClick={() => setActiveModal('refund')}
              className="text-slate-300 hover:text-[#F5B841] transition-colors underline min-h-[44px] flex items-center"
            >
              Refund & Cancellation
            </button>
            <span className="text-slate-700">·</span>
            <button
              onClick={() => setActiveModal('terms')}
              className="text-slate-300 hover:text-[#F5B841] transition-colors underline min-h-[44px] flex items-center"
            >
              Terms of Service
            </button>
            <span className="text-slate-700">·</span>
            <button
              onClick={() => setActiveModal('privacy')}
              className="text-slate-300 hover:text-[#F5B841] transition-colors underline min-h-[44px] flex items-center"
            >
              Privacy Policy
            </button>
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-500 pt-4 border-t border-slate-850">
          © {new Date().getFullYear()} Hanscab · All rights reserved. Private cab services for Khargone ↔ Indore.
        </div>
      </div>

      {/* Modal for Policies */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111A2E] border border-slate-700 rounded-2xl max-w-lg w-full p-6 text-slate-200 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {activeModal === 'refund' && (
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-[#F5B841]" />
                  Refund & Cancellation Policy
                </h3>
                <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                  <p className="bg-[#F5B841]/10 border border-[#F5B841]/30 p-3 rounded-xl text-slate-100 font-semibold">
                    100% Full Refund Guarantee: If Hanscab is unable to confirm your car or assign a driver for your trip, your Rs 500 advance deposit will be immediately refunded back to your UPI account without any deduction.
                  </p>
                  <p>
                    <strong>Customer Cancellations:</strong>
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Cancel more than 4 hours before pickup: 100% full refund of the Rs 500 advance token.</li>
                    <li>Cancel less than 4 hours before pickup: Rs 200 cancellation fee applies to compensate the dispatched driver; remaining Rs 300 will be refunded.</li>
                    <li>No-show at pickup time without prior notice: Advance deposit of Rs 500 is non-refundable.</li>
                  </ul>
                  <p>
                    Refunds are initiated directly via UPI within 2 hours of approved cancellation.
                  </p>
                </div>
              </div>
            )}

            {activeModal === 'terms' && (
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#F5B841]" />
                  Terms of Service
                </h3>
                <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                  <p>
                    Welcome to Hanscab (hanscab.in). By booking a cab through our platform or WhatsApp service, you agree to the following terms:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Private Hire:</strong> All bookings are for exclusive private car hire (you and your party only). No additional passengers will be boarded.</li>
                    <li><strong>Luggage Limits:</strong> Economy Sedan accommodates up to 4 passengers and 2–3 standard bags. Premium SUV accommodates up to 6 passengers and 4–5 bags.</li>
                    <li><strong>Pickup Window:</strong> Your driver will arrive at the scheduled pickup point and call you 30 minutes prior. Standard waiting time is 15 minutes.</li>
                    <li><strong>Payment:</strong> Rs 500 advance deposit secures the vehicle. The remaining balance is payable directly to the driver via Cash or UPI upon trip completion.</li>
                  </ul>
                </div>
              </div>
            )}

            {activeModal === 'privacy' && (
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#F5B841]" />
                  Privacy Policy
                </h3>
                <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                  <p>
                    Hanscab values your personal privacy. We only collect the necessary information to schedule and execute your private cab journey between Khargone and Indore.
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Contact Information:</strong> Your mobile number is used strictly for trip confirmation, driver coordination, and payment links. We never sell or spam your phone number.</li>
                    <li><strong>WhatsApp Consent:</strong> We only reach out to you on WhatsApp after you provide explicit consent during the booking flow.</li>
                    <li><strong>Data Security:</strong> Booking requests are securely handled and never shared with unauthorized third parties.</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="bg-[#F5B841] text-slate-950 font-bold px-4 py-2 rounded-xl text-xs hover:bg-[#E5A630] transition-colors min-h-[44px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  )
}
