'use client'
// src/components/wizard/StepPoint.tsx

import type { Direction, DropPoint } from '@/types'
import { MapPin, CheckCircle2, Building, Plane, Train, Navigation } from 'lucide-react'
import { PRICING_CONFIG, formatRs } from '@/config/pricing'

interface Props {
  direction: Direction
  selectedPointId: string
  onSelect: (pointId: DropPoint) => void
  onNext: () => void
}

function getPointIcon(id: string) {
  switch (id) {
    case 'airport':
      return <Plane className="w-5 h-5 text-sky-600" />
    case 'railway':
      return <Train className="w-5 h-5 text-indigo-600" />
    case 'rajwada':
      return <Building className="w-5 h-5 text-amber-600" />
    default:
      return <MapPin className="w-5 h-5 text-emerald-600" />
  }
}

export function StepPoint({ direction, selectedPointId, onSelect, onNext }: Props) {
  const isKI = direction === 'KI'
  const title = isKI ? 'Select Drop Point in Indore' : 'Select Pickup Point in Indore'
  const sub = isKI
    ? 'Where should the driver drop you in Indore?'
    : 'Where should the driver pick you up in Indore?'

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <MapPin className="w-6 h-6 text-[#F5B841]" />
          {title}
        </h2>
        <p className="text-sm text-slate-600 mt-1">{sub}</p>
      </div>

      {/* Point selection list */}
      <div className="space-y-3">
        {PRICING_CONFIG.points.map((p) => {
          const isSelected = selectedPointId === p.id

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id as DropPoint)}
              aria-pressed={isSelected}
              className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 min-h-[56px] flex items-center justify-between gap-4 ${
                isSelected
                  ? 'border-[#F5B841] bg-amber-50/60 shadow-md ring-2 ring-[#F5B841]/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-white shadow-sm border border-amber-200' : 'bg-slate-100'
                  }`}
                >
                  {getPointIcon(p.id)}
                </div>

                <div className="min-w-0">
                  <div className="text-base font-bold text-slate-900 truncate">
                    {p.name}
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">
                    {p.sub}
                  </div>
                </div>
              </div>

              {/* Price add-on pill */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    p.extra === 0
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {p.extra === 0 ? '+Rs 0 (Base)' : `+${formatRs(p.extra)}`}
                </span>

                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isSelected ? 'bg-[#F5B841] text-slate-950' : 'border-2 border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-4 h-4 stroke-[3]" />}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Note about Khargone Hub */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 flex items-center gap-2">
        <Navigation className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <span>
          {isKI
            ? `Pickup in Khargone is fixed at ${PRICING_CONFIG.khargoneHub}.`
            : `Drop in Khargone is fixed at ${PRICING_CONFIG.khargoneHub}.`}
        </span>
      </div>
    </div>
  )
}
