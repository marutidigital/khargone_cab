'use client'
// src/app/page.tsx

import { useState, useEffect, useCallback, useRef } from 'react'
import { Nav }               from '@/components/Nav'
import Image                 from 'next/image'
import { CheckCircle2, Clock } from 'lucide-react'
import { StepBar }           from '@/components/StepBar'
import { DirectionTabs }     from '@/components/DirectionTabs'
import { VehicleSelector }   from '@/components/VehicleSelector'
import { DropList }          from '@/components/DropList'
import { DatePicker }        from '@/components/DatePicker'
import { TimePicker }        from '@/components/TimePicker'
import { TripSummary }       from '@/components/TripSummary'
import { BookForm }          from '@/components/BookForm'
import { FooterTicker }      from '@/components/FooterTicker'
import { Toast }             from '@/components/Toast'
import { supabase }          from '@/lib/supabase'
import { POINTS, calcPrice, isNightHour, TIME_SLOTS } from '@/lib/constants'
import type { Direction, DropOption, Booking } from '@/types'
import type { VehicleType }  from '@/components/VehicleSelector'

// ── helpers ──────────────────────────────────────────────────────────────────
type SlotKey = keyof typeof TIME_SLOTS

function getSlotForHour(h: number): SlotKey | null {
  if (h >= 5  && h <= 10) return 'morning'
  if (h >= 11 && h <= 16) return 'afternoon'
  if (h >= 17 && h <= 21) return 'evening'
  if (h >= 22 || h < 5)   return 'night'
  return null
}

// ── component ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [dir,       setDir]       = useState<Direction>('KI')
  const [vehicle,   setVehicle]   = useState<VehicleType>('sedan')
  const [selDrop,   setSelDrop]   = useState<DropOption | null>(null)
  const [selDate,   setSelDate]   = useState<{ date: Date; str: string; daysAhead: number } | null>(null)
  const [pickupTime, setPickupTime] = useState<{ h: number; m: number } | null>(null)
  const [bookings,  setBookings]  = useState<Booking[]>([])
  const [waitingOpp,setWaitingOpp]= useState<Booking[]>([])
  const [toast,     setToast]     = useState<{ msg: string; type?: 'success' | 'error' } | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [showForm,  setShowForm]  = useState(false)
  const [successBooking, setSuccessBooking] = useState<{ booking: Booking; matched: boolean } | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch('/api/bookings?limit=20')
      const json = await res.json()
      if (json.bookings) setBookings(json.bookings as Booking[])
    } catch (e) {
      console.error('Failed to fetch bookings:', e)
    }
  }, [])

  const fetchWaitingOpposite = useCallback(async () => {
    const opp = dir === 'KI' ? 'IK' : 'KI'
    try {
      const res = await fetch(`/api/bookings?direction=${opp}&status=waiting&limit=5`)
      const json = await res.json()
      if (json.bookings) setWaitingOpp(json.bookings as Booking[])
    } catch (e) {
      console.error('Failed to fetch waiting opposite bookings:', e)
    }
  }, [dir])

  useEffect(() => { fetchBookings() },        [fetchBookings])
  useEffect(() => { fetchWaitingOpposite() },  [fetchWaitingOpposite])

  const handleDirChange = (d: Direction) => {
    setDir(d)
    setSelDrop(null)
    setSelDate(null)
    setPickupTime(null)
    setShowForm(false)
  }

  // SUV adds ₹600 to all prices
  const vehicleExtra = vehicle === 'suv' ? 600 : 0

  const price = selDrop && selDate && pickupTime
    ? calcPrice(selDrop.extra, selDate.daysAhead, isNightHour(pickupTime.h), vehicleExtra)
    : null

  // Determine current step (1-6)
  const currentStep = showForm ? 5
    : pickupTime  ? 4
    : selDate     ? 4
    : selDrop     ? 3
    : vehicle     ? 2
    : 1

  const activeSlot  = pickupTime ? getSlotForHour(pickupTime.h) : null
  const timeLabel   = activeSlot
    ? `${TIME_SLOTS[activeSlot].label} (${TIME_SLOTS[activeSlot].range})`
    : null

  const continueDisabled = !selDrop || !selDate || !pickupTime

  const handleContinue = () => {
    if (!continueDisabled) {
      setShowForm(true)
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }

  const handleBook = async (name: string, phone: string, email: string) => {
    if (!selDrop || !selDate || !pickupTime) return
    setLoading(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction:      dir,
          drop_point:     selDrop.id,
          drop_name:      selDrop.name,
          travel_date:    selDate.str,
          pickup_time:    `${String(pickupTime.h).padStart(2,'0')}:${String(pickupTime.m).padStart(2,'0')}`,
          passenger_name: name,
          phone,
          email:          email || undefined,
          extra:          selDrop.extra,
          days_ahead:     selDate.daysAhead,
          vehicle:        vehicle,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Booking failed')

      showToast(
        json.matched ? '✓ Booking confirmed — match found!' : 'Booking placed — waiting for match',
        'success'
      )
      setSuccessBooking({ booking: json.booking, matched: json.matched })
      setSelDrop(null); setSelDate(null); setPickupTime(null); setShowForm(false)
      await fetchBookings()
      await fetchWaitingOpposite()
    } catch (e: any) {
      showToast(e.message ?? 'Something went wrong', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (successBooking) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F5F5' }}>
        <Nav />
        
        <div style={{
          maxWidth: 600,
          margin: '40px auto 100px',
          padding: '0 24px',
        }}>
          <div style={{
            background: '#fff',
            border: '1.5px solid #E8E8E8',
            borderRadius: 16,
            boxShadow: '0 6px 30px rgba(0,0,0,0.06)',
            padding: '40px 32px',
            textAlign: 'center',
            animation: 'fadeUp 0.4s ease-out',
          }}>
            {/* Header Icon */}
            <div style={{
              width: 64, height: 64,
              borderRadius: '50%',
              background: '#FFF9C4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <Clock size={32} color="#F59E0B" strokeWidth={2.5} />
            </div>

            {/* Title */}
            <h1 style={{
              fontSize: 24,
              fontWeight: 800,
              color: '#111',
              letterSpacing: '-0.02em',
              marginBottom: 10,
            }}>
              Booking Received!
            </h1>

            {/* Message */}
            <div style={{
              fontSize: 15,
              color: '#555',
              lineHeight: 1.6,
              marginBottom: 20,
              padding: '0 10px',
            }}>
              <span style={{ fontWeight: 600, color: '#D97706', display: 'block', marginBottom: 8 }}>
                Your ride is under waiting list.
              </span>
              <span style={{ color: '#666', fontSize: 13 }}>
                Once confirmed, we will share all the details to you.
              </span>
            </div>

            {/* Vehicle Image */}
            <div style={{
              width: '100%',
              height: 140,
              position: 'relative',
              marginBottom: 30,
              background: '#F9FAFB',
              borderRadius: 12,
              border: '1.5px solid #E8E8E8',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Image
                src={successBooking.booking.base_fare >= 2600 ? '/premium_suv.png' : '/economy_sedan.png'}
                alt={successBooking.booking.base_fare >= 2600 ? 'Premium SUV' : 'Economy Sedan'}
                fill
                style={{ objectFit: 'contain', padding: '12px' }}
                sizes="500px"
                priority
              />
            </div>

            {/* Receipt Box */}
            <div style={{
              background: '#F9FAFB',
              border: '1px dashed #E5E7EB',
              borderRadius: 12,
              padding: '20px 24px',
              textAlign: 'left',
              marginBottom: 30,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: 10 }}>
                <span style={{ fontSize: 12, color: '#888' }}>Booking Reference</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#FFC107' }}>{successBooking.booking.booking_ref}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#888' }}>Route</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>
                  {successBooking.booking.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#888' }}>Vehicle Type</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>
                  {successBooking.booking.base_fare >= 2600 ? 'Premium SUV (7 Seater)' : 'Economy Sedan (5 Seater)'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#888' }}>
                  {successBooking.booking.direction === 'KI' ? 'Pickup point' : 'Drop point'}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{successBooking.booking.drop_name}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#888' }}>Date & Time</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>
                  {successBooking.booking.travel_date} at {successBooking.booking.pickup_time}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#888' }}>Passenger</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>
                  {successBooking.booking.passenger_name} ({successBooking.booking.phone})
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px dashed #E5E7EB',
                paddingTop: 10,
                marginTop: 4,
                alignItems: 'baseline'
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Total Fare</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>
                  ₹{successBooking.booking.total_fare.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Status notice */}
            <div style={{
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: 8,
              padding: '12px 16px',
              fontSize: 12,
              color: '#B45309',
              lineHeight: 1.5,
              marginBottom: 30,
              textAlign: 'left',
            }}>
              ⌛ <strong>Waiting List Status:</strong> We are actively matching your ride. We will share the driver and cab details via SMS/WhatsApp once confirmed.
            </div>

            {/* Back Button */}
            <button
              onClick={() => {
                setSuccessBooking(null)
              }}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: '#FFC107',
                color: '#000',
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: '-0.01em',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 14px rgba(255,193,7,0.35)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F9A825'}
              onMouseLeave={e => e.currentTarget.style.background = '#FFC107'}
            >
              Book Another Ride
            </button>
          </div>
        </div>

        <FooterTicker />
        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F5' }}>
      {/* Nav */}
      <Nav />

      {/* Step bar */}
      <StepBar current={currentStep} />

      {/* Main grid */}
      <div
        className="booking-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: 28,
          maxWidth: 1200,
          margin: '0 auto',
          padding: '28px 24px 80px',
          alignItems: 'start',
        }}
      >
        {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>

          {/* 1. Route */}
          <Section num="1." title="Select your route">
            <DirectionTabs dir={dir} onChange={handleDirChange} />
          </Section>

          {/* 2. Vehicle */}
          <Section num="2." title="Choose your vehicle" sub="Select the vehicle that best suits your journey">
            <VehicleSelector selected={vehicle} onSelect={setVehicle} />
          </Section>

          {/* 3. Drop Point */}
          <Section num="3." title={dir === 'KI' ? 'Choose your pickup point in Indore' : 'Choose your drop point in Indore'}>
            <DropList
              points={POINTS[dir]}
              selected={selDrop?.id ?? null}
              onSelect={id => setSelDrop(POINTS[dir].find(p => p.id === id) ?? null)}
            />
          </Section>

          {/* 4. Date + 5. Time vertically stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Section num="4." title="Select travel date">
              <DatePicker
                selected={selDate}
                onSelect={setSelDate}
                waitingDates={waitingOpp.map(b => b.travel_date)}
              />
            </Section>

            <Section num="5." title="Choose time slot" sub="Night rides have additional charges">
              <TimePicker value={pickupTime} onChange={setPickupTime} />
            </Section>
          </div>

          {/* 5. Passenger Details (revealed on Continue) */}
          {showForm && (
            <div ref={formRef}>
              <Section num="6." title="Passenger details">
                <BookForm
                  disabled={continueDisabled}
                  loading={loading}
                  price={price}
                  onSubmit={handleBook}
                />
              </Section>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Sticky Sidebar ───────────────────────────────── */}
        <div
          className="trip-sidebar"
          style={{ position: 'sticky', top: 88, alignSelf: 'start' }}
        >
          <TripSummary
            dir={dir}
            vehicle={vehicle}
            dropName={selDrop?.name ?? null}
            dropExtra={selDrop?.extra ?? 0}
            dateStr={selDate ? formatDate(selDate.date) : null}
            timeSlot={activeSlot}
            timeLabel={timeLabel}
            price={price}
            onContinue={handleContinue}
            continueDisabled={continueDisabled}
          />
        </div>
      </div>

      {/* Footer ticker */}
      <FooterTicker />

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────
function formatDate(d: Date): string {
  const days  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${days[d.getDay()]}`
}

function Section({
  num, title, sub, children,
}: {
  num: string; title: string; sub?: string; children: React.ReactNode
}) {
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ color: '#FFC107' }}>{num}</span>
          {title}
        </h2>
        {sub && <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{sub}</p>}
      </div>
      {children}
    </div>
  )
}
