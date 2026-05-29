'use client'
// src/app/page.tsx

import { useState, useEffect, useCallback, useRef } from 'react'
import { Nav }               from '@/components/Nav'
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
  const formRef = useRef<HTMLDivElement>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  const fetchBookings = useCallback(async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setBookings(data as Booking[])
  }, [])

  const fetchWaitingOpposite = useCallback(async () => {
    const opp = dir === 'KI' ? 'IK' : 'KI'
    const { data } = await supabase
      .from('bookings')
      .select('id,direction,travel_date,status,booking_ref')
      .eq('direction', opp)
      .eq('status', 'waiting')
      .limit(5)
    if (data) setWaitingOpp(data as Booking[])
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
    ? (() => {
        const base   = calcPrice(selDrop.extra + vehicleExtra, selDate.daysAhead, isNightHour(pickupTime.h))
        return base
      })()
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
          extra:          selDrop.extra + vehicleExtra,
          days_ahead:     selDate.daysAhead,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Booking failed')

      showToast(
        json.matched ? '✓ Booking confirmed — match found!' : 'Booking placed — waiting for match',
        'success'
      )
      setSelDrop(null); setSelDate(null); setPickupTime(null); setShowForm(false)
      await fetchBookings()
      await fetchWaitingOpposite()
    } catch (e: any) {
      showToast(e.message ?? 'Something went wrong', 'error')
    } finally {
      setLoading(false)
    }
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* 1. Route */}
          <Section num="1." title="Select your route">
            <DirectionTabs dir={dir} onChange={handleDirChange} />
          </Section>

          {/* 2. Vehicle */}
          <Section num="2." title="Choose your vehicle" sub="Select the vehicle that best suits your journey">
            <VehicleSelector selected={vehicle} onSelect={setVehicle} />
          </Section>

          {/* 3. Drop Point */}
          <Section num="3." title={`Choose a drop point in ${dir === 'KI' ? 'Khargone' : 'Indore'}`}>
            <DropList
              points={POINTS[dir]}
              selected={selDrop?.id ?? null}
              onSelect={id => setSelDrop(POINTS[dir].find(p => p.id === id) ?? null)}
            />
          </Section>

          {/* 4. Date + Time side-by-side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
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
