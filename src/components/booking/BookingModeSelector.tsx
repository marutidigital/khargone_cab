'use client'

import Image from 'next/image'
import { Clock3, ShieldCheck } from 'lucide-react'
import { formatRs } from '@/config/pricing'
import { BOOKING_CONFIG, calculateBookingFare, type RouteDirection, type DropPointId } from '@/lib/config'

interface Props {
  direction: RouteDirection
  point: DropPointId
  daysAhead: number
}

export function BookingModeSelector({ direction, point, daysAhead }: Props) {
  const fare = calculateBookingFare({ mode: 'match', direction, point, pickupTime: '12:00' }).totalFare
  const confidence = daysAhead >= 2
    ? { label: 'High chance', detail: 'Booking 2 or more days ahead gives us more time to find a return ride.', color: 'text-emerald-800 bg-emerald-50 border-emerald-200' }
    : { label: 'Very low chance', detail: 'Same-day and next-day Match Deal requests have a very low chance of finding a return ride.', color: 'text-amber-900 bg-amber-50 border-amber-200' }

  return (
    <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-xs sm:p-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-base font-black text-[#FBBF24]">4.</span>
        <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">Match Deal booking</h2>
      </div>

      <div className="rounded-2xl border-2 border-amber-400 bg-amber-50/40 p-4 ring-2 ring-amber-100">
        <div className="flex items-start gap-4">
          <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <Image src="/cars/sedan.webp" alt="MarutiCab private sedan" fill className="object-contain p-2" sizes="112px" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Clock3 className="h-5 w-5 text-amber-700" />
              <h3 className="font-extrabold text-slate-900">Match Deal · Private Sedan</h3>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">Your cab stays private. We confirm the trip when a compatible ride is found in the opposite direction.</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="text-xs text-slate-500">Complete fare before night charge</span>
              <span className="text-2xl font-black text-slate-950">{formatRs(fare)}</span>
            </div>
          </div>
        </div>
        <div className={`mt-4 rounded-xl border p-3 ${confidence.color}`}>
          <div className="flex items-center gap-2 text-sm font-extrabold">
            <ShieldCheck className="h-4 w-4" />
            Estimated match chance: {confidence.label}
          </div>
          <p className="mt-1 text-xs leading-relaxed">{confidence.detail} A match is never guaranteed; we’ll update you before the cutoff.</p>
        </div>
      </div>

      <p className="mt-4 rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs leading-relaxed text-sky-950">
        <strong>How it works:</strong> The opposite-direction return ride is matched with a separate customer. Your group has its own private cab. If no match is found by the cutoff, you can request a refund or an upgrade.
        <span className="mt-1 block font-semibold">Pay {formatRs(BOOKING_CONFIG.matchAdvance)} to place your Match Deal request; the remaining fare is paid in the cab after confirmation.</span>
      </p>
    </section>
  )
}
