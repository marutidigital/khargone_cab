'use client'
// src/components/wizard/StepVehicle.tsx

import Image from 'next/image'
import type { VehicleType } from '@/types'
import { Users, Briefcase, Wind, CheckCircle2, Star, ShieldCheck } from 'lucide-react'
import { PRICING_CONFIG, formatRs } from '@/config/pricing'

interface Props {
  selected: VehicleType
  onSelect: (v: VehicleType) => void
  onNext: () => void
}

export function StepVehicle({ selected, onSelect, onNext }: Props) {
  const vehicles = [PRICING_CONFIG.vehicles.sedan, PRICING_CONFIG.vehicles.suv]

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Star className="w-6 h-6 text-[#F5B841]" />
          Choose Your Vehicle
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Select private cab size based on your passengers and luggage.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {vehicles.map((v) => {
          const isSelected = selected === v.id

          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect(v.id)}
              aria-pressed={isSelected}
              className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 min-h-[52px] flex flex-col justify-between ${
                isSelected
                  ? 'border-[#F5B841] bg-amber-50/40 shadow-xl shadow-amber-500/10 ring-2 ring-[#F5B841]/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-sm'
              }`}
            >
              <div>
                {/* Top header badge & check */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100/90 border border-amber-200/80 px-2.5 py-0.5 rounded-full">
                    {v.badge}
                  </span>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isSelected ? 'bg-[#F5B841] text-slate-950' : 'border-2 border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-4 h-4 stroke-[3]" />}
                  </div>
                </div>

                {/* Car Image */}
                <div className="w-full h-36 relative bg-slate-50 rounded-xl overflow-hidden my-3 border border-slate-100 flex items-center justify-center">
                  <Image
                    src={v.image}
                    alt={v.name}
                    fill
                    className="object-contain p-3"
                    sizes="(max-width: 640px) 100vw, 360px"
                    priority
                  />
                </div>

                {/* Name & Models */}
                <div className="text-lg font-extrabold text-slate-900 tracking-tight">
                  {v.name}
                </div>
                <div className="text-xs text-slate-500 italic mt-0.5 mb-3">
                  {v.models}
                </div>

                {/* Key Spec Badges */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700">
                    <Users className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span>{v.seats}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700">
                    <Briefcase className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span>{v.bags}</span>
                  </div>
                </div>

                {/* Features list */}
                <div className="space-y-1.5 text-xs text-slate-600 mb-4 border-t border-slate-100 pt-3">
                  {v.features.map((feat) => (
                    <div key={feat} className="flex items-center gap-2">
                      <Wind className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Row */}
              <div className="pt-3 border-t border-slate-200/80 flex items-baseline justify-between mt-2">
                <span className="text-xs text-slate-500 font-medium">Starting from</span>
                <div className="text-right">
                  <span className="text-2xl font-black text-slate-950 tracking-tight">
                    {formatRs(v.baseFare)}
                  </span>
                  <span className="text-[11px] text-slate-500 block">base highway fare</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-emerald-900 font-medium">
        <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <span>All vehicles are private AC cars. No stranger co-passengers will be boarded.</span>
      </div>
    </div>
  )
}
