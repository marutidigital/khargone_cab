'use client'

import { CheckCircle2, Clock3, ShieldCheck } from 'lucide-react'
import { formatRs } from '@/config/pricing'
import { BOOKING_CONFIG, calculateBookingFare, type BookingMode, type DropPointId } from '@/lib/config'

interface Props {
  selectedMode: BookingMode
  point: DropPointId
  matchAllowed: boolean
  onSelect: (mode: BookingMode) => void
}

export function BookingModeSelector({ selectedMode, point, matchAllowed, onSelect }: Props) {
  const matchFare = calculateBookingFare({ mode: 'match', point, pickupTime: '12:00' }).totalFare
  const guaranteedFare = calculateBookingFare({ mode: 'guaranteed', point, pickupTime: '12:00' }).totalFare
  const cards: { mode: BookingMode; title: string; fare: number; description: string; Icon: typeof ShieldCheck }[] = [
    {
      mode: 'match',
      title: 'Match Deal',
      fare: matchFare,
      description: `Private cab. Pay ${formatRs(BOOKING_CONFIG.matchAdvance)} now, rest in the taxi. Your ride confirms when we find someone going the opposite way at the right time. No match by cutoff = full refund or upgrade.`,
      Icon: Clock3,
    },
    {
      mode: 'guaranteed',
      title: 'Confirm Now',
      fare: guaranteedFare,
      description: 'A guaranteed private cab at your exact pickup time.',
      Icon: ShieldCheck,
    },
  ]

  return (
    <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-xs sm:p-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-base font-black text-[#FBBF24]">4.</span>
        <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">Choose how to book</h2>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {cards.map(({ mode, title, fare, description, Icon }) => {
          const selected = selectedMode === mode
          const unavailable = mode === 'match' && !matchAllowed
          return (
            <button
              key={mode}
              type="button"
              aria-pressed={selected}
              disabled={unavailable}
              onClick={() => onSelect(mode)}
              className={`rounded-2xl border-2 p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${selected ? 'border-amber-400 bg-amber-50/50 ring-2 ring-amber-100' : 'border-slate-200 hover:border-amber-300'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${mode === 'match' ? 'text-amber-700' : 'text-emerald-700'}`} />
                  <span className="font-extrabold text-slate-900">{title}</span>
                </div>
                {selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-amber-600" />}
              </div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <span className="text-xs text-slate-500">Complete trip fare</span>
                <span className="text-2xl font-black text-slate-950">{formatRs(fare)}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {unavailable
                  ? `Match Deal needs at least ${BOOKING_CONFIG.matchMinAdvanceHours} hours before pickup. Choose Confirm Now for an earlier ride.`
                  : description}
              </p>
              <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700">
                Pay {formatRs(mode === 'match' ? BOOKING_CONFIG.matchAdvance : BOOKING_CONFIG.guaranteedAdvance)} now · balance in the taxi
              </p>
            </button>
          )
        })}
      </div>

      <p className="mt-4 rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs leading-relaxed text-sky-950">
        <strong>Why is Match Deal cheaper?</strong> The taxi returns with another customer, so the empty return trip is not added to your fare. Your taxi stays private to your group; the other customer rides on the return trip.
      </p>
    </section>
  )
}
