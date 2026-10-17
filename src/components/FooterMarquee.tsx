'use client'
// src/components/FooterMarquee.tsx
// Dark bottom marquee bar with slow scroll, pause on hover, and prefers-reduced-motion respect

export function FooterMarquee() {
  const text =
    'No Driver Allowance • No Toll Charges • No Parking Charges • Everything Included • Hanscab · Transparent · Reliable · Hassle-Free'

  return (
    <div
      className="w-full bg-[#18181B] text-slate-200 py-2.5 overflow-hidden border-t border-slate-800 select-none group"
      aria-label="Service perks marquee ticker"
    >
      <div className="flex w-max motion-safe:animate-marquee group-hover:[animation-play-state:paused]">
        <div className="flex items-center gap-8 text-xs font-semibold tracking-wide px-4 text-slate-300">
          <span>{text}</span>
          <span className="text-[#FBBF24]">★</span>
          <span>{text}</span>
          <span className="text-[#FBBF24]">★</span>
          <span>{text}</span>
          <span className="text-[#FBBF24]">★</span>
          <span>{text}</span>
        </div>
      </div>
    </div>
  )
}
