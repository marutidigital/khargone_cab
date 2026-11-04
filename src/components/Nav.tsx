'use client'
// src/components/Nav.tsx
// White header with MarutiCab logo (black circle with yellow pin icon), Home link, and yellow "Book Now" button

import Link from 'next/link'
import { MapPin, MessageCircle } from 'lucide-react'
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
          className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-[#FBBF24] rounded-lg p-1 shrink-0"
          aria-label="MarutiCab Home"
        >
          {/* Black circle with yellow pin icon */}
          <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center shadow-xs">
            <MapPin className="w-4 h-4 text-[#FBBF24] fill-[#FBBF24]" />
          </div>

          <div className="flex items-baseline">
            <span className="text-2xl font-black text-black tracking-tight leading-none font-sans">
              Maruti
            </span>
            <span className="text-2xl font-black text-[#FBBF24] tracking-tight leading-none font-sans">
              Cab
            </span>
          </div>
        </Link>

        {/* Mobile quick actions (app-like top bar) */}
        <div className="flex sm:hidden items-center gap-1.5">
          <Link
            href="/confirmed-rides"
            className="flex items-center gap-1 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black px-2.5 py-1.5 rounded-full border border-amber-500 active:scale-95 transition-transform shadow-xs whitespace-nowrap"
            aria-label="Confirmed Rides"
          >
            <span>⚡ Confirmed Rides</span>
          </Link>

          <a
            href="https://wa.me/918878933778?text=Namaste%20MarutiCab%2C%20mujhe%20cab%20booking%20support%20chahiye."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-black px-2.5 py-1.5 rounded-full active:scale-95 transition-transform shadow-xs whitespace-nowrap"
            aria-label="WhatsApp Support"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-white" />
            <span>Support</span>
          </a>
        </div>

        {/* Desktop navigation links & Book Now button */}
        <div className="hidden sm:flex items-center gap-3 sm:gap-4">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-700 hover:text-black transition-colors"
          >
            Home
          </Link>

          <Link
            href="/confirmed-rides"
            className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm px-3 py-2 rounded-xl shadow-xs border border-amber-500 active:scale-95 transition-all whitespace-nowrap"
          >
            <span>⚡ Confirmed Rides</span>
            <span className="rounded-full bg-slate-950 text-amber-300 text-[10px] font-extrabold px-1.5 py-0.2">
              Round-Trips
            </span>
          </Link>

          <a
            href="https://wa.me/918878933778?text=Namaste%20MarutiCab%2C%20mujhe%20cab%20booking%20support%20chahiye."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs sm:text-sm font-extrabold px-3 py-2 rounded-xl shadow-xs active:scale-95 transition-all whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>WhatsApp Support</span>
          </a>

          <button
            type="button"
            onClick={scrollToBooking}
            className="bg-[#FBBF24] hover:bg-[#F59E0B] text-slate-950 font-extrabold text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-xl shadow-xs transition-all active:scale-98 min-h-[42px] flex items-center justify-center cursor-pointer whitespace-nowrap"
          >
            Book Now
          </button>
        </div>
      </div>
    </header>
  )
}
