'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Car,
  Calendar,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { formatRs } from '@/config/pricing'

export interface PublicAvailableRide {
  id: string
  direction: 'KI' | 'IK'
  routeDirection: 'K2I' | 'I2K'
  routeLabel: string
  travelDate: string
  travelDateFormatted: string
  pickupTime: string
  pickupTimeFormatted: string
  passengerCount: number
  dropPoint: string
  dropName: string
  totalFare: number
  advanceAmount: number
  oppositeDirection: 'I2K' | 'K2I'
  oppositeRouteLabel: string
  oppositeBaseFare: number
  statusText: string
}

interface PublicRideMatchingBoardProps {
  onBookingSuccess?: (bookingRef: string, publicToken: string, whatsappUrl: string) => void
}

export function PublicRideMatchingBoard({ onBookingSuccess }: PublicRideMatchingBoardProps) {
  const [activeTab, setActiveTab] = useState<'ALL' | 'I2K' | 'K2I'>('ALL')
  const [rides, setRides] = useState<PublicAvailableRide[]>([])
  const [loading, setLoading] = useState(true)

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

  const countI2K = rides.filter((r) => r.oppositeDirection === 'I2K').length
  const countK2I = rides.filter((r) => r.oppositeDirection === 'K2I').length

  const filteredRides = rides.filter((r) => {
    if (activeTab === 'ALL') return true
    return r.oppositeDirection === activeTab
  })

  return (
    <section id="confirmed-rides-board" className="my-8 rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-8 shadow-sm transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-400 text-slate-950 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-xs">
              ⚡ Confirmed Rides
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {rides.length > 0 ? `${rides.length} Return Cab${rides.length > 1 ? 's' : ''} Ready` : 'Live Matching Active'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5 flex items-center gap-2">
            <span>Available Rides – Complete Your Round</span>
            <span>🚕</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Opposite return trips ready for direct booking. Complete the round trip and get instant ride confirmation.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setLoading(true)
            void fetchRides()
          }}
          className="self-start sm:self-center flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold px-3.5 py-2 transition-colors cursor-pointer shadow-2xs"
          title="Refresh ride board"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Direction Switch Tabs */}
      <div className="mt-6">
        <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
          Select Your Travel Route:
        </div>
        <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-100/80 p-1.5 max-w-xl">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>All Available</span>
            <span className={`rounded-full text-[10px] font-extrabold px-2 py-0.5 ${
              activeTab === 'ALL' ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700'
            }`}>
              {rides.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('I2K')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm font-black transition-all cursor-pointer ${
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
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm font-black transition-all cursor-pointer ${
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

      {/* Ride Cards List */}
      <div className="mt-6">
        {loading && rides.length === 0 ? (
          <div className="py-14 text-center">
            <RefreshCw className="h-7 w-7 animate-spin text-amber-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">Scanning active return rides...</p>
          </div>
        ) : filteredRides.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-8 sm:p-10 text-center max-w-xl mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto text-amber-800">
              <Car className="h-6 w-6" />
            </div>
            <h4 className="text-sm sm:text-base font-black text-slate-900">
              No return rides available for {activeTab === 'I2K' ? 'Indore ➔ Khargone' : activeTab === 'K2I' ? 'Khargone ➔ Indore' : 'this selection'} right now
            </h4>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              {activeTab === 'K2I' && countI2K > 0 ? (
                <>
                  Good news: <strong>{countI2K} cab{countI2K > 1 ? 's are' : ' is'} waiting in the opposite direction (Indore ➔ Khargone)</strong>!
                </>
              ) : activeTab === 'I2K' && countK2I > 0 ? (
                <>
                  Good news: <strong>{countK2I} cab{countK2I > 1 ? 's are' : ' is'} waiting in the opposite direction (Khargone ➔ Indore)</strong>!
                </>
              ) : (
                'You can request a new booking below — our system will match an opposite return passenger automatically!'
              )}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              {activeTab === 'K2I' && countI2K > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('I2K')}
                  className="rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs px-4 py-2.5 transition active:scale-95 cursor-pointer shadow-xs"
                >
                  ⚡ View Indore ➔ Khargone Rides ({countI2K})
                </button>
              )}
              {activeTab === 'I2K' && countK2I > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('K2I')}
                  className="rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs px-4 py-2.5 transition active:scale-95 cursor-pointer shadow-xs"
                >
                  ⚡ View Khargone ➔ Indore Rides ({countK2I})
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs px-4 py-2.5 transition active:scale-95 cursor-pointer"
              >
                Book Custom Cab Below ↓
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRides.map((ride) => (
              <div
                key={ride.id}
                className="group flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs hover:border-amber-400 hover:shadow-lg transition-all"
              >
                <div className="space-y-3.5">
                  {/* Your Booking Route */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-400 text-slate-950 shadow-2xs">
                        <Car className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Your Travel Route
                        </span>
                        <strong className="text-base font-black text-slate-900">
                          {ride.oppositeRouteLabel}
                        </strong>
                      </div>
                    </div>

                    <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-[10px] font-black uppercase">
                      ⚡ Instant Match
                    </span>
                  </div>

                  {/* Travel Date */}
                  <div className="flex items-center gap-2 text-xs text-slate-800 font-bold">
                    <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Travel Date: {ride.travelDateFormatted}</span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Dedicated 4-seater AC Sedan (Dzire / Amaze). Complete this return trip and both rides get confirmed immediately.
                  </p>
                </div>

                {/* Pricing & Booking Button */}
                <div className="mt-5 border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Fixed Fare
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <strong className="text-xl font-black text-slate-900">
                        {formatRs(ride.oppositeBaseFare)}
                      </strong>
                      <span className="text-[11px] font-bold text-emerald-700">
                        · ₹{ride.advanceAmount} Adv
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/book-return/${ride.id}`}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-4 py-2.5 text-xs shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>Book Now</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
