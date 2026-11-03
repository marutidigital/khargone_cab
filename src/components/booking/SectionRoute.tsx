'use client'
// src/components/booking/SectionRoute.tsx
import { CircleDot, MapPin, ArrowRight, ArrowDownUp } from 'lucide-react'

interface Props {
  direction: 'K2I' | 'I2K'
  selectedPointName: string
  onSelectDirection: (direction: 'K2I' | 'I2K') => void
}

export function SectionRoute({ direction, selectedPointName, onSelectDirection }: Props) {
  const isK2I = direction === 'K2I'

  const fromTitle = isK2I ? 'Bus Stand Khargone' : selectedPointName || 'Indore'
  const fromSubtitle = isK2I ? 'Khargone, Madhya Pradesh' : 'Indore, Madhya Pradesh'

  const toTitle = isK2I ? selectedPointName || 'Indore' : 'Bus Stand Khargone'
  const toSubtitle = isK2I ? 'Indore, Madhya Pradesh' : 'Khargone, Madhya Pradesh'

  const toggleDirection = () => {
    onSelectDirection(isK2I ? 'I2K' : 'K2I')
  }

  return (
    <section className="bg-white border border-[#E5E7EB] rounded-3xl p-5 sm:p-8 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base font-black text-[#FBBF24]">1.</span>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Select your route
          </h2>
        </div>
        <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
          Private Cab
        </span>
      </div>

      {/* Route Switcher Segmented Control */}
      <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-100 p-1.5 rounded-2xl">
        <button
          type="button"
          onClick={() => onSelectDirection('K2I')}
          aria-pressed={isK2I}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 px-2 text-xs sm:text-sm font-extrabold transition-all active:scale-98 ${
            isK2I
              ? 'bg-[#FBBF24] text-slate-950 shadow-sm'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          <span>Khargone</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-800" />
          <span>Indore</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectDirection('I2K')}
          aria-pressed={!isK2I}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 px-2 text-xs sm:text-sm font-extrabold transition-all active:scale-98 ${
            !isK2I
              ? 'bg-[#FBBF24] text-slate-950 shadow-sm'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          <span>Indore</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-800" />
          <span>Khargone</span>
        </button>
      </div>

      {/* From and To Route Card with App-like Swap Button */}
      <div className="relative flex flex-col md:flex-row items-stretch gap-2.5">
        {/* FROM Field */}
        <div className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            {isK2I ? (
              <CircleDot className="w-4 h-4 text-[#16A34A] stroke-[2.5]" />
            ) : (
              <MapPin className="w-4 h-4 text-[#EF4444]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Pickup (Origin)
            </span>
            <span className="text-sm font-bold text-slate-900 truncate block">
              {fromTitle}
            </span>
            <span className="text-xs text-slate-500 truncate block">{fromSubtitle}</span>
          </div>
        </div>

        {/* Swap Button (Uber/Google Maps style) */}
        <button
          type="button"
          onClick={toggleDirection}
          className="self-center z-10 w-9 h-9 rounded-full bg-white border border-slate-300 shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-90 transition-transform -my-2 md:-mx-2 md:my-0 cursor-pointer"
          aria-label="Swap pickup and drop locations"
          title="Swap route direction"
        >
          <ArrowDownUp className="w-4 h-4 text-slate-700" />
        </button>

        {/* TO Field */}
        <div className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
            {isK2I ? (
              <MapPin className="w-4 h-4 text-[#EF4444]" />
            ) : (
              <CircleDot className="w-4 h-4 text-[#16A34A] stroke-[2.5]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Drop (Destination)
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
