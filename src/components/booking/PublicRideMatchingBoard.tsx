'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Car,
  Calendar,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { formatRs } from '@/config/pricing'
import {
  PublicMatchBookingModal,
  type PublicAvailableRide,
} from './PublicMatchBookingModal'

interface PublicRideMatchingBoardProps {
  onBookingSuccess: (bookingRef: string, publicToken: string, whatsappUrl: string) => void
}

export function PublicRideMatchingBoard({ onBookingSuccess }: PublicRideMatchingBoardProps) {
  const [activeTab, setActiveTab] = useState<'I2K' | 'K2I'>('I2K')
  const [rides, setRides] = useState<PublicAvailableRide[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRideForBooking, setSelectedRideForBooking] = useState<PublicAvailableRide | null>(null)

  const fetchRides = useCallback(async () => {
    try {
      const res = await fetch('/api/public/available-rides', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch available rides')
      const data = await res.json()
      setRides(data.rides || [])
    } catch (err) {
      console.warn('Error loading public available rides:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchRides()
    const timer = window.setInterval(() => void fetchRides(), 20_000)
    return () => window.clearInterval(timer)
  }, [fetchRides])

  // Filter rides strictly by the passenger's desired travel direction (oppositeDirection === activeTab)
  // When activeTab is 'I2K', the visitor travels Indore ➔ Khargone
  // When activeTab is 'K2I', the visitor travels Khargone ➔ Indore
  const filteredRides = rides.filter((r) => r.oppositeDirection === activeTab)

  const countI2K = rides.filter((r) => r.oppositeDirection === 'I2K').length
  const countK2I = rides.filter((r) => r.oppositeDirection === 'K2I').length

  return (
    <section id="confirmed-rides-board" className="my-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-400 text-slate-950 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-xs">
              ⚡ Confirmed Rides
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Available
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <span>Available Rides – Complete Your Round</span>
            <span>🚕</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Select your route below to book an available confirmed return ride.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setLoading(true)
            void fetchRides()
          }}
          className="self-start sm:self-center flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 transition-colors cursor-pointer"
          title="Refresh ride board"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Direction Switch Tabs: Shows your travel route */}
      <div className="mt-5">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 max-w-md">
          <button
            type="button"
            onClick={() => setActiveTab('I2K')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'I2K'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Indore ➔ Khargone</span>
            <span className={`rounded-full text-[10px] font-extrabold px-2 py-0.5 ${
              activeTab === 'I2K' ? 'bg-slate-950 text-amber-300' : 'bg-slate-200 text-slate-700'
            }`}>
              {countI2K}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('K2I')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'K2I'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Khargone ➔ Indore</span>
            <span className={`rounded-full text-[10px] font-extrabold px-2 py-0.5 ${
              activeTab === 'K2I' ? 'bg-slate-950 text-amber-300' : 'bg-slate-200 text-slate-700'
            }`}>
              {countK2I}
            </span>
          </button>
        </div>
      </div>

      {/* Ride Cards List: Simple and Minimal Design */}
      <div className="mt-5">
        {loading && rides.length === 0 ? (
          <div className="py-12 text-center">
            <RefreshCw className="h-6 w-6 animate-spin text-amber-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">Checking available rides...</p>
          </div>
        ) : filteredRides.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center max-w-xl mx-auto">
            <Car className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">
              No rides available for {activeTab === 'I2K' ? 'Indore ➔ Khargone' : 'Khargone ➔ Indore'} right now
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Check the other tab or request a new booking above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRides.map((ride) => (
              <div
                key={ride.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-amber-400 hover:shadow-md transition-all"
              >
                <div className="space-y-3">
                  {/* Your Booking Route */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-400 text-slate-950">
                        <Car className="h-4 w-4" />
                      </div>
                      <strong className="text-base font-black text-slate-900">
                        {ride.oppositeRouteLabel}
                      </strong>
                    </div>

                    <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                      Available
                    </span>
                  </div>

                  {/* Travel Date */}
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-bold pt-1">
                    <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>{ride.travelDateFormatted}</span>
                  </div>
                </div>

                {/* Pricing & Booking Button */}
                <div className="mt-5 border-t border-slate-100 pt-3.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">
                      Fixed Fare
                    </div>
                    <div className="flex items-baseline gap-1">
                      <strong className="text-lg font-black text-slate-900">
                        {formatRs(ride.oppositeBaseFare)}
                      </strong>
                      <span className="text-[10px] font-bold text-emerald-700">
                        · ₹{ride.advanceAmount} Adv
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedRideForBooking(ride)}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-4 py-2.5 text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <span>Book Now</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Drawer / Modal */}
      {selectedRideForBooking && (
        <PublicMatchBookingModal
          ride={selectedRideForBooking}
          onClose={() => setSelectedRideForBooking(null)}
          onSuccess={(bookingRef, publicToken, whatsappUrl) => {
            setSelectedRideForBooking(null)
            void fetchRides()
            onBookingSuccess(bookingRef, publicToken, whatsappUrl)
          }}
        />
      )}
    </section>
  )
}
