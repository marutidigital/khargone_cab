'use client'
// src/components/booking/TripSummaryCard.tsx
import Image from 'next/image'
import {
  CircleDot,
  MapPin,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Phone,
  Loader2,
  X,
} from 'lucide-react'
import { PRICING_CONFIG, formatRs, DetailedFareBreakdown } from '@/config/pricing'

interface Props {
  direction: 'K2I' | 'I2K'
  vehicle: 'sedan' | 'suv'
  pointName: string
  dateLabel: string | null
  timeLabel: string | null
  breakdown: DetailedFareBreakdown
  isValid: boolean
  isSubmitting: boolean
  onBookCar: () => void
  isMobileModal?: boolean
  onCloseMobileModal?: () => void
}

export function TripSummaryCard({
  direction,
  vehicle,
  pointName,
  dateLabel,
  timeLabel,
  breakdown,
  isValid,
  isSubmitting,
  onBookCar,
  isMobileModal,
  onCloseMobileModal,
}: Props) {
  const isK2I = direction === 'K2I'
  const fromTitle = isK2I ? 'Bus Stand Khargone' : pointName || 'Indore'
  const toTitle = isK2I ? pointName || 'Indore' : 'Bus Stand Khargone'

  const vehicleCfg = PRICING_CONFIG.vehicles[vehicle]

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
      {/* Header & Route Timeline */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
            Your trip summary
          </h3>

          {isMobileModal && onCloseMobileModal && (
            <button
              type="button"
              onClick={onCloseMobileModal}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              aria-label="Close summary modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Route Timeline + Small Car Thumbnail */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 space-y-2.5">
            {/* From */}
            <div className="flex items-center gap-2.5 text-xs font-bold text-slate-900">
              {isK2I ? (
                <CircleDot className="w-3.5 h-3.5 text-[#16A34A] stroke-[3] flex-shrink-0" />
              ) : (
                <MapPin className="w-3.5 h-3.5 text-[#EF4444] flex-shrink-0" />
              )}
              <span className="truncate">{fromTitle}</span>
            </div>

            {/* To */}
            <div className="flex items-center gap-2.5 text-xs font-bold text-slate-900">
              {isK2I ? (
                <MapPin className="w-3.5 h-3.5 text-[#EF4444] flex-shrink-0" />
              ) : (
                <CircleDot className="w-3.5 h-3.5 text-[#16A34A] stroke-[3] flex-shrink-0" />
              )}
              <span className="truncate">{toTitle}</span>
            </div>
          </div>

          {/* Small car thumbnail */}
          <div className="w-16 h-12 relative bg-slate-100 rounded-xl overflow-hidden p-1 flex items-center justify-center border border-slate-200 flex-shrink-0">
            <Image
              src={vehicleCfg.image}
              alt={vehicleCfg.name}
              fill
              className="object-contain p-1"
              sizes="64px"
            />
          </div>
        </div>
      </div>

      {/* Selected Attributes Table */}
      <div className="p-5 border-b border-slate-100 space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Vehicle</span>
          <span className="font-bold text-slate-900">{vehicleCfg.name} ({vehicleCfg.seats})</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500">{isK2I ? 'Drop point' : 'Pickup point'}</span>
          <span className="font-bold text-slate-900 truncate max-w-[190px]">
            {pointName || 'Rajendra Nagar'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500">Travel date</span>
          <span className="font-bold text-slate-900">{dateLabel || '-'}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500">Pickup time</span>
          <span className="font-bold text-slate-900">{timeLabel || '-'}</span>
        </div>
      </div>

      {/* Fare Breakdown */}
      <div className="p-5 space-y-2.5 text-xs bg-slate-50/50">
        <div className="flex items-center justify-between gap-3 text-slate-600">
          <span className="min-w-0">Fare for {pointName} ({vehicleCfg.name})</span>
          <span className="shrink-0">{formatRs(breakdown.standardFare + breakdown.vehicleExtra)}</span>
        </div>

        <div className="flex items-center justify-between text-slate-500">
          <span>Total route via Kasrawad &amp; Khalghat</span>
          <span>{breakdown.routeDistanceKm.toFixed(1)} km</span>
        </div>

        <p className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
          If you travel beyond your selected drop point, extra distance is ₹{breakdown.kmRate}/km. We’ll calculate it manually at your final destination and confirm the amount before collecting it.
        </p>

        {breakdown.earlyDiscount > 0 && (
          <div className="flex items-center justify-between text-[#16A34A] font-semibold">
            <span>Early booking discount</span>
            <span>−{formatRs(breakdown.earlyDiscount)}</span>
          </div>
        )}

        <div className="text-[11px] text-slate-500">Tolls are included in the displayed fare.</div>

        {breakdown.nightExtra > 0 && (
          <div className="flex items-center justify-between text-amber-900 font-semibold">
            <span>Night surcharge (22:00–04:59)</span>
            <span>+{formatRs(breakdown.nightExtra)}</span>
          </div>
        )}

        <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
          <span className="text-sm font-black text-slate-900">Total Fixed Fare</span>
          <span className="text-2xl font-black text-slate-950">
            {formatRs(breakdown.totalFare)}
          </span>
        </div>

      </div>

      {/* Button & 4 Trust Badges */}
      <div className="p-5 border-t border-slate-100 space-y-4">
        <button
          type="button"
          disabled={!isValid || isSubmitting}
          onClick={onBookCar}
          className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all min-h-[48px] ${
            isValid && !isSubmitting
              ? 'bg-[#FBBF24] hover:bg-[#F59E0B] text-slate-950 shadow-md shadow-amber-500/20 active:scale-98 cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Registering Request...</span>
            </>
          ) : isValid ? (
            <>
              <span>Book Your Car</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </>
          ) : (
            <span>Complete selections above</span>
          )}
        </button>

        {/* 4 Trust Badges */}
        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A] flex-shrink-0" />
            <span>No Hidden Charges</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] flex-shrink-0" />
            <span>Everything Included</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#16A34A] flex-shrink-0" />
            <span>Safe &amp; Reliable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-[#16A34A] flex-shrink-0" />
            <span>WhatsApp Support</span>
          </div>
        </div>
      </div>
    </div>
  )
}
