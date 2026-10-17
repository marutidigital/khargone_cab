'use client'
// src/components/booking/SectionDropPoint.tsx
import { MapPin, CheckCircle2 } from 'lucide-react'
import { PRICING_CONFIG, formatRs } from '@/config/pricing'
import { RouteMap } from '@/components/RouteMap'

interface Props {
  direction: 'K2I' | 'I2K'
  selectedPointId: string
  onSelectPoint: (pointId: string) => void
}

export function SectionDropPoint({ direction, selectedPointId, onSelectPoint }: Props) {
  const isK2I = direction === 'K2I'
  const sectionTitle = isK2I ? 'Choose your drop point' : 'Choose your pickup point in Indore'

  return (
    <section className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base font-black text-[#FBBF24]">3.</span>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          {sectionTitle}
        </h2>
      </div>

      {/* 1. Map above rows */}
      <div className="mb-4">
        <RouteMap
          selectedPointId={selectedPointId}
          onSelectPoint={onSelectPoint}
          direction={direction}
        />
      </div>

      {/* 2. Radio Rows */}
      <div className="space-y-2.5">
        {PRICING_CONFIG.points.map((pt) => {
          const isSelected = selectedPointId === pt.id
          const pillColor =
            pt.extra === 0
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
              : 'bg-amber-100 text-amber-900 border-amber-200'

          return (
            <label
              key={pt.id}
              onClick={() => onSelectPoint(pt.id)}
              className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl border-2 transition-all cursor-pointer min-h-[52px] ${
                isSelected
                  ? 'border-[#FBBF24] bg-amber-50/20 shadow-xs'
                  : 'border-[#E5E7EB] hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[#FBBF24] text-slate-950'
                      : 'border-2 border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                </div>

                <div>
                  <span className="text-sm font-bold text-slate-900 block leading-tight">
                    {pt.name}
                  </span>
                  <span className="text-xs text-slate-500 block mt-0.5">{pt.sub}</span>
                </div>
              </div>

              {/* Price Pill */}
              <span
                className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${pillColor}`}
              >
                {pt.extra === 0 ? '+Rs 0' : `+${formatRs(pt.extra)}`}
              </span>
            </label>
          )
        })}
      </div>
    </section>
  )
}
