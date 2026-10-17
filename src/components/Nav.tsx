'use client'
// src/components/Nav.tsx

import Link from 'next/link'
import { Shield, MessageCircle, Phone } from 'lucide-react'
import { PRICING_CONFIG } from '@/config/pricing'

export function Nav() {
  const whatsappUrl = `https://wa.me/${PRICING_CONFIG.contactWhatsApp}?text=${encodeURIComponent('Hi Hanscab, I have a question about booking a cab between Khargone and Indore.')}`

  return (
    <header className="sticky top-0 z-50 bg-[#0B1220]/95 backdrop-blur-md border-b border-slate-800/80 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#F5B841] rounded-lg p-1"
          aria-label="Hanscab Home"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F5B841] to-[#D97706] flex items-center justify-center shadow-md shadow-[#F5B841]/20">
            <span className="font-extrabold text-slate-950 text-xl tracking-tighter">H</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-white leading-none">
              Hans<span className="text-[#F5B841]">cab</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">
              Khargone ↔ Indore Private Cabs
            </span>
          </div>
        </Link>

        {/* Right action: WhatsApp & Trust */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 font-medium bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/60">
            <Shield className="w-3.5 h-3.5 text-[#F5B841]" />
            <span>Private Cars Only</span>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 min-h-[44px] min-w-[44px]"
            aria-label="Contact Hanscab on WhatsApp"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span className="hidden xs:inline">WhatsApp Help</span>
          </a>
        </div>
      </div>
    </header>
  )
}
