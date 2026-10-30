'use client'
// src/components/booking/SectionRoute.tsx
import { CircleDot, MapPin, ArrowRight } from 'lucide-react'

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

  return (
    <section className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-8 shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base font-black text-[#FBBF24]">1.</span>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          Select your route
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {([
          { value: 'I2K', label: 'Indore to Khargone' },
          { value: 'K2I', label: 'Khargone to Indore' },
        ] as const).map((route) => {
          const isSelected = direction === route.value
          return (
            <button
              key={route.value}
              type="button"
              onClick={() => onSelectDirection(route.value)}
              aria-pressed={isSelected}
              className={`flex items-center justify-center gap-3 rounded-xl border-2 px-4 py-3 text-sm font-extrabold transition-colors ${
                isSelected
                  ? 'border-[#FBBF24] bg-amber-50 text-slate-950'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:text-slate-900'
              }`}
            >
              {route.label.split(' to ')[0]}
              <ArrowRight className="h-4 w-4 shrink-0 text-amber-600" />
              {route.label.split(' to ')[1]}
            </button>
          )
        })}
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
