'use client'

import { ArrowRight, ShieldCheck } from 'lucide-react'
import { formatRs } from '@/config/pricing'
import { BOOKING_CONFIG, type BookingMode, type FareBreakdown } from '@/lib/config'

interface Props {
  mode: BookingMode
  breakdown: FareBreakdown
  dateLabel: string
  timeLabel: string | null
  isValid: boolean
  isSubmitting: boolean
  onPay: () => void
  bookingLabel?: string
}

export function BookingPaymentPanel({ mode, breakdown, dateLabel, timeLabel, isValid, isSubmitting, onPay, bookingLabel }: Props) {
  return (
    <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-xs sm:p-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-base font-black text-[#FBBF24]">7.</span>
        <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">Payment</h2>
      </div>
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="flex justify-between gap-3 text-slate-600"><span>Ride type</span><strong className="text-slate-900">{bookingLabel || (mode === 'match' ? 'Match Deal' : 'Confirm Now')}</strong></div>
        <div className="flex justify-between gap-3 text-slate-600"><span>Pickup</span><strong className="text-right text-slate-900">{dateLabel} · {timeLabel || 'Choose a time'}</strong></div>
        <div className="flex justify-between gap-3 text-slate-600"><span>Base fare</span><strong className="text-slate-900">{formatRs(breakdown.baseFare)}</strong></div>
        <div className="flex justify-between gap-3 text-slate-600"><span>Drop-point extra</span><strong className="text-slate-900">{formatRs(breakdown.dropPointExtra)}</strong></div>
        <div className="flex justify-between gap-3 text-slate-600"><span>Night surcharge</span><strong className="text-slate-900">{formatRs(breakdown.nightSurcharge)}</strong></div>
        <div className="flex justify-between gap-3 border-t border-slate-200 pt-3 font-extrabold text-slate-900"><span>Total fare</span><strong>{formatRs(breakdown.totalFare)}</strong></div>
        <div className="flex justify-between gap-3 text-emerald-800"><span>Pay in the cab after confirmation</span><strong>{formatRs(breakdown.totalFare)}</strong></div>
      </div>

      <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-950">
        <strong>No advance payment.</strong> We’ll contact you about your Match Deal. Pay the full fare in the cab after your ride is confirmed.
      </p>
      <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-slate-600">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
        Tolls included, no driver allowance, no parking charges. Any extra distance past your selected drop point is ₹{BOOKING_CONFIG.extraKmRate}/km, calculated with you at the final destination.
      </p>
      <button
        type="button"
        disabled={!isValid || isSubmitting}
        onClick={onPay}
        className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FBBF24] px-4 py-3 text-sm font-black text-slate-950 shadow-sm transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      >
        <span>{isSubmitting ? 'Saving booking…' : 'Book your car'}</span>
        {!isSubmitting && <ArrowRight className="h-4 w-4" />}
      </button>
      <p className="mt-2 text-center text-[11px] text-slate-500">Your request is saved without payment. We’ll update you when the ride is confirmed.</p>
    </section>
  )
}
