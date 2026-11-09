'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Nav } from '@/components/Nav'
import { PublicRideMatchingBoard } from '@/components/booking/PublicRideMatchingBoard'
import { BookingSuccessModal } from '@/components/booking/BookingSuccessModal'
import { FooterMarquee } from '@/components/FooterMarquee'
import { FooterTrust } from '@/components/FooterTrust'
import { ShieldCheck, Car, ArrowLeft, Clock, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function ConfirmedRidesPage() {
  const router = useRouter()
  const [successData, setSuccessData] = useState<{
    bookingRef: string
    publicToken: string
    whatsappUrl: string
  } | null>(null)

  return (
    <div className="min-h-screen bg-[#F4F4F5] text-slate-900 antialiased flex flex-col justify-between">
      <div>
        <Nav />

        <main className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-8 sm:py-8">
          {/* Top Breadcrumb & Action Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-950 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Standard Booking Form</span>
            </Link>

            <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 self-start sm:self-auto">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Fixed Fares · Doorstep / Point Drop · AC Sedans</span>
            </div>
          </div>

          {/* Hero Explainer Card */}
          <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 mb-6 shadow-xl relative overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-400 text-slate-950 px-3 py-1 text-xs font-black uppercase tracking-wider mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Dedicated Return Matching Page</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                Confirmed Return Rides
              </h1>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5 text-xs">
                <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-3">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block">Indore ➔ Khargone</span>
                  <strong className="text-base font-black text-white">₹1,800 Fare</strong>
                </div>
                <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-3">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block">Khargone ➔ Indore</span>
                  <strong className="text-base font-black text-white">₹2,200 Fare</strong>
                </div>
                <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-3 col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block">Advance to Book</span>
                  <strong className="text-base font-black text-white">₹500</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Live Board Component */}
          <PublicRideMatchingBoard
            onBookingSuccess={(bookingRef: string, publicToken: string, whatsappUrl: string) => {
              setSuccessData({
                bookingRef,
                publicToken,
                whatsappUrl,
              })
            }}
          />
        </main>
      </div>

      {/* Booking Success WhatsApp Modal */}
      {successData && (
        <BookingSuccessModal
          isOpen={Boolean(successData)}
          bookingRef={successData.bookingRef}
          publicToken={successData.publicToken}
          direction="K2I"
          pointName="City Point"
          date="Confirmed Date"
          time="Selected Time"
          passengerName="Passenger"
          phone=""
          totalFare={1800}
          whatsappUrl={successData.whatsappUrl}
          onClose={() => {
            const token = successData.publicToken
            setSuccessData(null)
            router.push(`/booking/${token}`)
          }}
          onViewStatus={() => {
            const token = successData.publicToken
            setSuccessData(null)
            router.push(`/booking/${token}`)
          }}
        />
      )}

      <div className="hidden lg:block">
        <FooterMarquee />
        <FooterTrust />
      </div>
    </div>
  )
}
