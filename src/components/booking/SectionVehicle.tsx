'use client'
// src/components/booking/SectionVehicle.tsx
import Image from 'next/image'
import { Star, CheckCircle2, Check, ShieldCheck } from 'lucide-react'
import { PRICING_CONFIG, formatRs, getStartingPrice } from '@/config/pricing'

interface Props {
  selectedVehicle: 'sedan' | 'suv'
  direction: 'K2I' | 'I2K'
  onSelectVehicle: (v: 'sedan' | 'suv') => void
}

export function SectionVehicle({ selectedVehicle, direction, onSelectVehicle }: Props) {
  const lowestStartingPrice = getStartingPrice(direction)
  const suvStartingPrice = lowestStartingPrice + PRICING_CONFIG.SUV_EXTRA

  const isSedan = selectedVehicle === 'sedan'
  const isSuv = selectedVehicle === 'suv'

  return (
    <section className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base font-black text-[#FBBF24]">2.</span>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          Choose your vehicle
        </h2>
      </div>

      {/* Vehicle cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Economy Sedan */}
        <div
          onClick={() => onSelectVehicle('sedan')}
          className={`relative rounded-2xl p-4.5 border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
            isSedan
              ? 'border-[#FBBF24] bg-amber-50/20 shadow-sm ring-2 ring-[#FBBF24]/20'
              : 'border-[#E5E7EB] hover:border-slate-300 bg-white'
          }`}
        >
          {/* Top Row: Badge + Radio Check */}
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1 bg-[#FBBF24]/20 text-amber-900 border border-[#FBBF24]/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              <Star className="w-3 h-3 fill-amber-700 text-amber-700" />
              <span>Recommended</span>
            </span>

            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                isSedan
                  ? 'bg-[#FBBF24] text-slate-950 shadow-xs'
                  : 'border-2 border-slate-300 bg-white'
              }`}
            >
              {isSedan && <CheckCircle2 className="w-4 h-4 stroke-[3]" />}
            </div>
          </div>

          {/* Vehicle Image in grey rounded panel */}
          <div className="w-full h-36 relative bg-slate-100 rounded-xl overflow-hidden mb-3.5 flex items-center justify-center p-2">
            <Image
              src="/cars/sedan.webp"
              alt="Economy Sedan Dzire Amaze Aura"
              fill
              className="object-contain p-2"
              sizes="(max-width: 768px) 100vw, 360px"
              loading="lazy"
            />
          </div>

          {/* Details */}
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-base font-extrabold text-slate-900">Economy Sedan</h3>
              <span className="text-xs font-bold text-slate-500">5 Seater</span>
            </div>

            <p className="text-xs italic text-slate-500 mb-2.5">Dzire · Amaze · Aura</p>

            <ul className="text-xs text-slate-600 space-y-1 mb-4">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>Up to 4 passengers</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>2–3 luggage bags</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>AC comfortable seats</span>
              </li>
            </ul>

            <div className="pt-2.5 border-t border-slate-100 flex items-baseline justify-between">
              <span className="text-xs text-slate-500">Starting at</span>
              <span className="text-lg font-black text-slate-900">
                {formatRs(lowestStartingPrice)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Premium SUV */}
        <div
          onClick={() => onSelectVehicle('suv')}
          className={`relative rounded-2xl p-4.5 border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
            isSuv
              ? 'border-[#FBBF24] bg-amber-50/20 shadow-sm ring-2 ring-[#FBBF24]/20'
              : 'border-[#E5E7EB] hover:border-slate-300 bg-white'
          }`}
        >
          {/* Top Row: Badge + Upgrade Pill + Radio Check */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="bg-sky-100 text-sky-800 border border-sky-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                Best for Families
              </span>
              <span className="bg-orange-100 text-orange-800 border border-orange-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                +Rs 600 upgrade
              </span>
            </div>

            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                isSuv
                  ? 'bg-[#FBBF24] text-slate-950 shadow-xs'
                  : 'border-2 border-slate-300 bg-white'
              }`}
            >
              {isSuv && <CheckCircle2 className="w-4 h-4 stroke-[3]" />}
            </div>
          </div>

          {/* Vehicle Image in grey rounded panel */}
          <div className="w-full h-36 relative bg-slate-100 rounded-xl overflow-hidden mb-3.5 flex items-center justify-center p-2">
            <Image
              src="/cars/suv.webp"
              alt="Premium SUV Ertiga Carens Innova"
              fill
              className="object-contain p-2"
              sizes="(max-width: 768px) 100vw, 360px"
              loading="lazy"
            />
          </div>

          {/* Details */}
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-base font-extrabold text-slate-900">Premium SUV</h3>
              <span className="text-xs font-bold text-slate-500">7 Seater</span>
            </div>

            <p className="text-xs italic text-slate-500 mb-2.5">Ertiga · Carens · Innova</p>

            <ul className="text-xs text-slate-600 space-y-1 mb-4">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>Up to 6 passengers</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>4–5 luggage bags</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>AC extra spacious</span>
              </li>
            </ul>

            <div className="pt-2.5 border-t border-slate-100 flex items-baseline justify-between">
              <span className="text-xs text-slate-500">Starting at</span>
              <span className="text-lg font-black text-slate-900">
                {formatRs(suvStartingPrice)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Light green strip below cards */}
      <div className="mt-4 bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs text-[#166534] font-medium">
        <div className="flex items-center gap-1.5">
          <Check className="w-4 h-4 text-[#16A34A] stroke-[2.5]" />
          <span>No Driver Allowance</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Check className="w-4 h-4 text-[#16A34A] stroke-[2.5]" />
          <span>No Toll</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Check className="w-4 h-4 text-[#16A34A] stroke-[2.5]" />
          <span>No Parking</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Check className="w-4 h-4 text-[#16A34A] stroke-[2.5]" />
          <span>Everything Included in Your Fare</span>
        </div>
        <div className="flex items-center gap-1.5 font-bold text-[#15803D]">
          <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
          <span>100% Transparent Pricing</span>
        </div>
      </div>
    </section>
  )
}
