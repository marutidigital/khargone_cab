'use client'
// src/components/OffersStrip.tsx

import { Tag, Sparkles, CreditCard, Gift } from 'lucide-react'
import { PRICING_CONFIG, formatRs } from '@/config/pricing'

export function OffersStrip() {
  const offers = [
    {
      id: 'ik',
      icon: <Tag className="w-3.5 h-3.5 text-[#F5B841]" />,
      badge: `${formatRs(PRICING_CONFIG.indoreToKhargoneDiscount)} OFF`,
      title: 'Indore → Khargone Return Trips',
      detail: 'Auto-applied on return route',
      active: true,
    },
    {
      id: 'advance',
      icon: <CreditCard className="w-3.5 h-3.5 text-[#22C55E]" />,
      badge: `Pay ${formatRs(PRICING_CONFIG.advanceDeposit)} Now`,
      title: 'Zero Pressure Booking',
      detail: 'Pay balance directly to driver in car',
      active: true,
    },
    ...(PRICING_CONFIG.offers.referral.enabled
      ? [
          {
            id: 'referral',
            icon: <Gift className="w-3.5 h-3.5 text-[#38BDF8]" />,
            badge: `${formatRs(PRICING_CONFIG.offers.referral.discount)} OFF`,
            title: 'Refer a Friend',
            detail: 'Save after their completed trip',
            active: true,
          },
        ]
      : []),
  ]

  return (
    <div className="w-full bg-[#111A2E]/90 border-b border-slate-800 py-2.5 px-4 overflow-x-auto scrollbar-none">
      <div className="max-w-4xl mx-auto flex items-center justify-start sm:justify-center gap-3 sm:gap-6 min-w-max">
        {offers.map(o => (
          <div
            key={o.id}
            className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/60 px-3 py-1.5 rounded-full text-xs shadow-sm"
          >
            {o.icon}
            <span className="font-bold text-[#F5B841]">{o.badge}</span>
            <span className="text-slate-300 font-medium hidden xs:inline">{o.title}</span>
            <span className="text-slate-400 text-[11px] hidden md:inline">({o.detail})</span>
          </div>
        ))}
      </div>
    </div>
  )
}
