'use client'
// src/components/wizard/StepRoute.tsx

import type { Direction } from '@/types'
import { ArrowRight, MapPin, CheckCircle2, Sparkles, Navigation } from 'lucide-react'
import { PRICING_CONFIG, formatRs } from '@/config/pricing'

interface Props {
  direction: Direction
  onChange: (dir: Direction) => void
  onNext: () => void
}

export function StepRoute({ direction, onChange, onNext }: Props) {
  const isKI = direction === 'KI'
  const isIK = direction === 'IK'

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Navigation className="w-6 h-6 text-[#F5B841]" />
          Select Your Travel Direction
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Private, direct highway cab with doorstep/city drop.
        </p>
      </div>

      {/* Direction Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Option 1: Khargone -> Indore */}
        <button
          type="button"
          onClick={() => onChange('KI')}
          aria-pressed={isKI}
          className={`relative w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 min-h-[52px] ${
            isKI
              ? 'border-[#F5B841] bg-amber-50/60 shadow-lg shadow-amber-500/10 ring-2 ring-[#F5B841]/20'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-sm'
          }`}
        >
          {/* Radio indicator */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Outbound Route
            </span>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                isKI ? 'bg-[#F5B841] text-slate-950' : 'border-2 border-slate-300 bg-white'
              }`}
            >
              {isKI && <CheckCircle2 className="w-4 h-4 stroke-[3]" />}
            </div>
          </div>

          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-lg font-extrabold text-slate-900">Khargone</span>
            <ArrowRight className="w-5 h-5 text-[#F5B841] flex-shrink-0" />
            <span className="text-lg font-extrabold text-slate-900">Indore</span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3 mt-2">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span><strong>Pickup:</strong> {PRICING_CONFIG.khargoneHub}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
              <span><strong>Drop:</strong> Chosen point in Indore (Airport/Stn/City)</span>
            </div>
          </div>
        </button>

        {/* Option 2: Indore -> Khargone */}
        <button
          type="button"
          onClick={() => onChange('IK')}
          aria-pressed={isIK}
          className={`relative w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 min-h-[52px] ${
            isIK
              ? 'border-[#F5B841] bg-amber-50/60 shadow-lg shadow-amber-500/10 ring-2 ring-[#F5B841]/20'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-sm'
          }`}
        >
          {/* Badge */}
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3 text-emerald-700" />
              Save {formatRs(PRICING_CONFIG.indoreToKhargoneDiscount)} Off
            </span>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                isIK ? 'bg-[#F5B841] text-slate-950' : 'border-2 border-slate-300 bg-white'
              }`}
            >
              {isIK && <CheckCircle2 className="w-4 h-4 stroke-[3]" />}
            </div>
          </div>

          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-lg font-extrabold text-slate-900">Indore</span>
            <ArrowRight className="w-5 h-5 text-[#F5B841] flex-shrink-0" />
            <span className="text-lg font-extrabold text-slate-900">Khargone</span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3 mt-2">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span><strong>Pickup:</strong> Chosen point in Indore (Airport/Stn/City)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
              <span><strong>Drop:</strong> {PRICING_CONFIG.khargoneHub}</span>
            </div>
          </div>
        </button>
      </div>

      {/* Info notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-[#F5B841]/20 flex items-center justify-center text-[#92400E] font-bold flex-shrink-0 mt-0.5">
          i
        </div>
        <p className="leading-relaxed">
          Highway distance is approx <strong>150 km</strong> (travel time ~<strong>{PRICING_CONFIG.estimatedTravelHours} hours</strong> via AB Road/Bawadi). You receive the car exclusively for your party with AC included.
        </p>
      </div>
    </div>
  )
}
