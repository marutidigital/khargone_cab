'use client'

import { Check, MapPin } from 'lucide-react'
import { PRICING_CONFIG, formatRs } from '@/config/pricing'
import { calculateBookingFare } from '@/lib/config'

interface Props {
  direction: 'K2I' | 'I2K'
  vehicle: 'sedan' | 'suv'
  daysAhead: number
  travelDate: string
  selectedPointId: string
  onSelectPoint: (pointId: string) => void
}

export function SectionDropPoint({ direction, vehicle, daysAhead, travelDate, selectedPointId, onSelectPoint }: Props) {
  void daysAhead
  void travelDate
  const isK2I = direction === 'K2I'
  const sectionTitle = isK2I ? 'Choose your drop point' : 'Choose your pickup point in Indore'

  return (
    <section className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-xs sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-[#FBBF24]">2.</span>
            <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">{sectionTitle}</h2>
          </div>
          <p className="ml-6 mt-1 text-xs text-slate-500">Choose a location to see your complete fare</p>
        </div>
        <span className="hidden shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 sm:inline-flex">
          {isK2I ? 'Khargone → Indore' : 'Indore → Khargone'}
        </span>
      </div>

      <div className="mt-4 grid gap-2.5">
        {PRICING_CONFIG.points.map((point) => {
          const selected = selectedPointId === point.id
          const fare = calculateBookingFare({
            mode: 'match',
            direction,
            point: point.id,
            pickupTime: '12:00',
            vehicle: vehicle === 'suv' ? 'premium_suv' : 'economy_sedan',
          }).totalFare

          return (
            <button
              key={point.id}
              type="button"
              aria-pressed={selected}
              aria-label={`${point.name}, ${formatRs(fare)} total fare`}
              onClick={() => onSelectPoint(point.id)}
              className={`flex min-h-[72px] w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition active:scale-[0.99] sm:px-4 ${
                selected
                  ? 'border-amber-400 bg-amber-50/70 shadow-sm ring-1 ring-amber-200'
                  : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50'
              }`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-500'}`}>
                {selected ? <Check className="h-4 w-4 stroke-[3]" /> : <MapPin className="h-4 w-4" />}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold text-slate-900">{point.name}</span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-500">{point.sub} · {point.routeDistanceKm.toFixed(1)} km</span>
              </span>

              <span className="shrink-0 text-right">
                <span className={`block text-sm font-black tabular-nums ${selected ? 'text-amber-950' : 'text-slate-900'}`}>{formatRs(fare)}</span>
                <span className="mt-0.5 block text-[10px] font-medium text-slate-500">fare for this point</span>
              </span>
            </button>
          )
        })}
      </div>

      <div role="status" aria-live="polite" className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-950">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
        <p><strong>Need a different final drop?</strong> Extra distance is ₹{PRICING_CONFIG.KM_CHARGE_PER_KM}/km, calculated manually at your destination and confirmed with you first.</p>
      </div>
    </section>
  )
}
