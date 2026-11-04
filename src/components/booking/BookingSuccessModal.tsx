'use client'

import { CheckCircle2, MessageCircle, ArrowRight, ShieldCheck, X } from 'lucide-react'
import { formatRs } from '@/config/pricing'

interface Props {
  isOpen: boolean
  bookingRef: string
  publicToken: string
  direction: 'K2I' | 'I2K'
  pointName: string
  date: string
  time: string
  passengerName: string
  phone: string
  totalFare: number
  whatsappUrl: string
  onClose: () => void
  onViewStatus: () => void
}

export function BookingSuccessModal({
  isOpen,
  bookingRef,
  direction,
  pointName,
  date,
  time,
  passengerName,
  totalFare,
  whatsappUrl,
  onClose,
  onViewStatus,
}: Props) {
  if (!isOpen) return null

  const routeLabel = direction === 'K2I' ? 'Khargone → Indore' : 'Indore → Khargone'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xl relative animate-in slide-in-from-bottom duration-300 max-h-[92vh] overflow-y-auto no-scrollbar"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success Icon */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 stroke-[2.5]" />
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-3 py-0.5 text-xs font-bold text-amber-900 mb-1">
            Booking Ref: {bookingRef}
          </span>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Ride Confirmed &amp; Reserved!
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xs">
            Advance payment received for <span className="font-bold text-slate-800">{passengerName}</span>. Your private cab is confirmed.
          </p>
        </div>

        {/* Trip Card */}
        <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2.5 text-xs sm:text-sm">
          <div className="flex justify-between items-center text-slate-600">
            <span>Route</span>
            <span className="font-bold text-slate-900">{routeLabel}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>Drop / Pickup</span>
            <span className="font-bold text-slate-900">{pointName}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>Date &amp; Time</span>
            <span className="font-bold text-slate-900">{date} · {time}</span>
          </div>
          <div className="flex justify-between items-center border-t border-slate-200 pt-2 text-slate-900 font-extrabold text-sm sm:text-base">
            <span>Total Fare</span>
            <span className="text-emerald-700">{formatRs(totalFare)}</span>
          </div>
        </div>

        {/* WhatsApp Notification Banner */}
        <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-950 text-xs flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            <strong>Advance payment verified.</strong> Driver details and payment receipt have been sent directly to your WhatsApp!
          </span>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-2.5">
          {/* WhatsApp Button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[48px] rounded-xl bg-[#25D366] hover:bg-[#20bd5a] active:scale-98 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <MessageCircle className="w-4 h-4 fill-white text-[#25D366]" />
            <span>Open WhatsApp Confirmation</span>
          </a>

          {/* View Booking Status Button */}
          <button
            type="button"
            onClick={onViewStatus}
            className="w-full min-h-[44px] rounded-xl border border-slate-300 hover:bg-slate-50 active:scale-98 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all"
          >
            <span>View Booking Status</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
