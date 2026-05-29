'use client'
// src/app/page.tsx

import { useState, useEffect, useCallback } from 'react'
import { Nav } from '@/components/Nav'
import { DirectionTabs } from '@/components/DirectionTabs'
import { DropList } from '@/components/DropList'
import { DatePicker } from '@/components/DatePicker'
import { TimePicker } from '@/components/TimePicker'
import { PriceBox } from '@/components/PriceBox'
import { BookForm } from '@/components/BookForm'
import { BookingCards } from '@/components/BookingCards'
import { MatchPrompt } from '@/components/MatchPrompt'
import { Toast } from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { POINTS, calcPrice, isNightHour } from '@/lib/constants'
import type { Direction, DropOption, Booking } from '@/types'

export default function Home() {
  const [dir, setDir]           = useState<Direction>('KI')
  const [selDrop, setSelDrop]   = useState<DropOption | null>(null)
  const [selDate, setSelDate]   = useState<{ date: Date; str: string; daysAhead: number } | null>(null)
  const [pickupTime, setPickupTime] = useState<{ h: number; m: number } | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [waitingOpp, setWaitingOpp] = useState<Booking[]>([])
  const [toast, setToast]       = useState<{ msg: string; type?: 'success' | 'error' } | null>(null)
  const [loading, setLoading]   = useState(false)

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

  useEffect(() => { fetchBookings() }, [fetchBookings])
  useEffect(() => { fetchWaitingOpposite() }, [fetchWaitingOpposite])

  // Reset on direction change
  const handleDirChange = (d: Direction) => {
    setDir(d)
    setSelDrop(null)
    setSelDate(null)
    setPickupTime(null)
  }

  const price = selDrop && selDate && pickupTime
    ? calcPrice(
        selDrop.extra,
        selDate.daysAhead,
        isNightHour(pickupTime.h)
      )
    : null

  const matchOnDate = selDate
    ? waitingOpp.filter(b => b.travel_date === selDate.str)
    : []

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
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Booking failed')

      showToast(
        json.matched
          ? '✓ Booking confirmed — match found!'
          : 'Booking placed — waiting for match',
        'success'
      )
      // Reset form
      setSelDrop(null)
      setSelDate(null)
      setPickupTime(null)
      await fetchBookings()
      await fetchWaitingOpposite()
    } catch (e: any) {
      showToast(e.message ?? 'Something went wrong', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', paddingBottom: 80, minHeight: '100vh' }}>
      <Nav />

      <DirectionTabs dir={dir} onChange={handleDirChange} />

      {/* Match prompt */}
      {waitingOpp.length > 0 && (
        <div style={{ padding: '16px 20px 0' }}>
          <MatchPrompt
            count={waitingOpp.length}
            matchOnDate={matchOnDate.length > 0}
            dateStr={selDate?.str}
            onScrollToForm={() => {
              document.getElementById('form-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          />
        </div>
      )}

      {/* Drop point */}
      <section style={{ padding: '20px 20px 0' }}>
        <SectLabel>{dir === 'KI' ? 'Drop Point — Indore' : 'Pickup Point — Indore'}</SectLabel>
        <DropList
          points={POINTS[dir]}
          selected={selDrop?.id ?? null}
          onSelect={(id) => setSelDrop(POINTS[dir].find(p => p.id === id) ?? null)}
        />
      </section>

      {/* Date */}
      <section style={{ padding: '20px 20px 0' }}>
        <SectLabel>Travel Date</SectLabel>
        <DatePicker selected={selDate} onSelect={setSelDate} waitingDates={waitingOpp.map(b => b.travel_date)} />
      </section>

      {/* Time */}
      <section style={{ padding: '20px 20px 0' }}>
        <SectLabel>Pickup Time</SectLabel>
        <TimePicker value={pickupTime} onChange={setPickupTime} />
      </section>

      {/* Price */}
      {price && (
        <section style={{ padding: '20px 20px 0' }}>
          <PriceBox price={price} dropName={selDrop!.name} />
        </section>
      )}

      {/* Form */}
      <section style={{ padding: '20px 20px 0' }} id="form-anchor">
        <SectLabel>Your Details</SectLabel>
        <BookForm
          disabled={!selDrop || !selDate || !pickupTime}
          loading={loading}
          price={price}
          onSubmit={handleBook}
        />
      </section>

      {/* Listings */}
      <div style={{ height: 1, background: 'var(--line)', margin: '28px 0 0' }} />
      <section style={{ padding: '20px 20px 0' }}>
        <SectLabel>Bookings</SectLabel>
        <BookingCards bookings={bookings} />
      </section>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  )
}

function SectLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--muted)',
      marginBottom: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      {children}
      <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
    </div>
  )
}
