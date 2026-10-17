'use client'
// src/components/Nav.tsx
// White header with Hanscab logo (black circle with yellow pin icon), Home link, and yellow "Book Now" button

import Link from 'next/link'
import { MapPin, Phone } from 'lucide-react'
import { PRICING_CONFIG } from '@/config/pricing'

export function Nav() {
  const scrollToBooking = (e: React.MouseEvent) => {
    e.preventDefault()
    const element = document.getElementById('booking-section')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-[#FBBF24] rounded-lg p-1"
          aria-label="Hanscab Home"
        >
          {/* Black circle with yellow pin icon */}
          <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center shadow-xs">
            <MapPin className="w-4 h-4 text-[#FBBF24] fill-[#FBBF24]" />
          </div>

          <div className="flex items-baseline">
            <span className="text-2xl font-black text-black tracking-tight leading-none font-sans">
              Hans
            </span>
            <span className="text-2xl font-black text-[#FBBF24] tracking-tight leading-none font-sans">
              cab
            </span>
          </div>
        </Link>

        {/* Navigation links & Book Now button */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-700 hover:text-black transition-colors"
          >
            Home
          </Link>

          <a
            href={`https://wa.me/${PRICING_CONFIG.contactWhatsApp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-black"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Support</span>
          </a>

          <button
            type="button"
            onClick={scrollToBooking}
            className="bg-[#FBBF24] hover:bg-[#F59E0B] text-slate-950 font-extrabold text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-xl shadow-xs transition-all active:scale-98 min-h-[44px] flex items-center justify-center cursor-pointer"
          >
            Book Now
          </button>
        </div>
      </div>
    </header>
  )
}
