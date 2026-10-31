'use client'
// src/components/booking/SectionDropPoint.tsx
import { CheckCircle2 } from 'lucide-react'
import { PRICING_CONFIG, formatRs, getPointFareForDate } from '@/config/pricing'

interface Props {
  direction: 'K2I' | 'I2K'
  vehicle: 'sedan' | 'suv'
  daysAhead: number
  travelDate: string
  selectedPointId: string
  onSelectPoint: (pointId: string) => void
}

export function SectionDropPoint({ direction, vehicle, daysAhead, travelDate, selectedPointId, onSelectPoint }: Props) {
  const isK2I = direction === 'K2I'
  const sectionTitle = isK2I ? 'Choose your drop point' : 'Choose your pickup point in Indore'

  return (
    <section className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-8 shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base font-black text-[#FBBF24]">2.</span>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          {sectionTitle}
        </h2>
      </div>

      <div className="space-y-3">
        {PRICING_CONFIG.points.map((pt) => {
          const isSelected = selectedPointId === pt.id
          const fare = getPointFareForDate(pt.id, direction, daysAhead, undefined, travelDate) + (vehicle === 'suv' ? PRICING_CONFIG.SUV_EXTRA : 0)
          const pillColor =
            isSelected
              ? 'bg-amber-100 text-amber-900 border-amber-200'
              : 'bg-slate-100 text-slate-800 border-slate-200'

          return (
            <label
              key={pt.id}
              onClick={() => onSelectPoint(pt.id)}
              className={`flex items-center justify-between gap-4 p-4 sm:p-5 rounded-xl border-2 transition-all cursor-pointer min-h-[60px] ${
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
                  <span className="text-xs text-slate-500 block mt-0.5">
                    {pt.sub} · {pt.routeDistanceKm.toFixed(1)} km trip
                  </span>
                </div>
              </div>

              {/* Price Pill */}
              <span
                className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${pillColor}`}
              >
                {formatRs(fare)} total
              </span>
            </label>
          )
        })}
      </div>
      <div role="status" aria-live="polite" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-950">
        <strong className="block mb-0.5">Going beyond your selected drop?</strong>
        Extra distance costs ₹{PRICING_CONFIG.KM_CHARGE_PER_KM}/km. We’ll calculate it manually at your final destination and confirm the amount before collecting it.
      </div>
    </section>
  )
}
