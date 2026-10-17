'use client'
// src/components/booking/PaymentConfirmationSheet.tsx
import { MessageCircle, CheckCircle2, Clock, X, ArrowRight, ShieldCheck } from 'lucide-react'
import { formatRs, DetailedFareBreakdown } from '@/config/pricing'

interface Props {
  bookingCode: string
  name: string
  phone: string
  direction: 'K2I' | 'I2K'
  pointName: string
  vehicleName: string
  pickupDateStr: string
  pickupTimeLabel: string
  passengers: number
  breakdown: DetailedFareBreakdown
  whatsappUrl: string
  isDuplicate?: boolean
  onClose: () => void
}

export function PaymentConfirmationSheet({
  bookingCode,
  name,
  phone,
  direction,
  pointName,
  vehicleName,
  pickupDateStr,
  pickupTimeLabel,
  passengers,
  breakdown,
  whatsappUrl,
  isDuplicate,
  onClose,
}: Props) {
  const isK2I = direction === 'K2I'
  const route = isK2I ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header Badge */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <CheckCircle2 className="w-8 h-8 text-amber-700 stroke-[2.5]" />
          </div>

          <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100/80 border border-amber-200 px-3 py-1 rounded-full">
            Request Saved · Ref: {bookingCode}
          </span>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-3">
            Booking Request Saved!
          </h2>

          <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
            Online payment is opening soon. We&apos;ve saved your request and will connect you on WhatsApp.
          </p>
        </div>

        {isDuplicate && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            A request with this phone number and pickup time was already recorded. We are coordinating your car!
          </div>
        )}

        {/* Trip Summary Card inside sheet */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5 space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Route</span>
            <span className="font-bold text-slate-900">{route}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">{isK2I ? 'Drop in Indore' : 'Pickup in Indore'}</span>
            <span className="font-bold text-slate-900">{pointName}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Car &amp; Passengers</span>
            <span className="font-bold text-slate-900">
              {vehicleName} ({passengers} Pax)
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Pickup Date &amp; Time</span>
            <span className="font-bold text-slate-900">
              {pickupDateStr} at {pickupTimeLabel}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Total Fixed Fare</span>
            <span className="font-black text-slate-950 text-sm">
              {formatRs(breakdown.totalFare)}
            </span>
          </div>

          <div className="flex justify-between py-1 text-slate-700">
            <span>Advance confirmation deposit</span>
            <span className="font-bold text-amber-900">{formatRs(breakdown.advanceDeposit)}</span>
          </div>

          <div className="flex justify-between py-1 text-slate-700">
            <span>Pay in car to driver</span>
            <span className="font-bold text-slate-900">{formatRs(breakdown.balanceFare)}</span>
          </div>
        </div>

        {/* Chat on WhatsApp Button */}
        <div className="space-y-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2.5 transition-all text-sm min-h-[48px] cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            <span>Chat on WhatsApp</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </a>

          <p className="text-[11px] text-slate-500 text-center leading-normal">
            Clicking opens WhatsApp with your route and car details prefilled. Our dispatcher will confirm driver assignment.
          </p>
        </div>
      </div>
    </div>
  )
}
