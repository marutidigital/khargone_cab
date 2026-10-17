'use client'
// src/components/booking/SectionRoute.tsx
import { CircleDot, MapPin, ArrowLeftRight } from 'lucide-react'
import { PRICING_CONFIG } from '@/config/pricing'

interface Props {
  direction: 'K2I' | 'I2K'
  selectedPointName: string
  onSwapDirection: () => void
}

export function SectionRoute({ direction, selectedPointName, onSwapDirection }: Props) {
  const isK2I = direction === 'K2I'

  const fromTitle = isK2I ? 'Bus Stand Khargone' : selectedPointName || 'Indore'
  const fromSubtitle = isK2I ? 'Khargone, Madhya Pradesh' : 'Indore, Madhya Pradesh'

  const toTitle = isK2I ? selectedPointName || 'Indore' : 'Bus Stand Khargone'
  const toSubtitle = isK2I ? 'Indore, Madhya Pradesh' : 'Khargone, Madhya Pradesh'

  return (
    <section className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base font-black text-[#FBBF24]">1.</span>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          Select your route
        </h2>
      </div>

      <div className="relative flex flex-col md:flex-row items-center gap-3">
        {/* FROM Field */}
        <div className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            {isK2I ? (
              <CircleDot className="w-4 h-4 text-[#16A34A] stroke-[2.5]" />
            ) : (
              <MapPin className="w-4 h-4 text-[#EF4444]" />
            )}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              From (Pickup)
            </span>
            <span className="text-sm font-bold text-slate-900 truncate block">
              {fromTitle}
            </span>
            <span className="text-xs text-slate-500 truncate block">{fromSubtitle}</span>
          </div>
        </div>

        {/* Circular Swap Button */}
        <button
          type="button"
          onClick={onSwapDirection}
          className="w-10 h-10 rounded-full bg-white border border-slate-300 hover:border-[#FBBF24] hover:bg-amber-50/60 shadow-sm flex items-center justify-center text-slate-700 hover:text-slate-950 transition-all flex-shrink-0 cursor-pointer active:scale-95 z-10 -my-2 md:my-0 md:-mx-2"
          aria-label="Swap Route Direction"
          title="Swap Route Direction"
        >
          <ArrowLeftRight className="w-4 h-4 text-slate-700" />
        </button>

        {/* TO Field */}
        <div className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
            {isK2I ? (
              <MapPin className="w-4 h-4 text-[#EF4444]" />
            ) : (
              <CircleDot className="w-4 h-4 text-[#16A34A] stroke-[2.5]" />
            )}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              To (Drop)
            </span>
            <span className="text-sm font-bold text-slate-900 truncate block">
              {toTitle}
            </span>
            <span className="text-xs text-slate-500 truncate block">{toSubtitle}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
