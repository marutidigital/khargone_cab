'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { formatRs } from '@/config/pricing'

type BookingView = { booking_ref: string; mode: string; status: string; direction: string; drop_name: string; travel_date: string; pickup_time: string; passenger_count: number; passenger_name: string; phone: string; total_fare: number; advance_amount: number; balance_amount: number; cutoff_at: string | null; refund_status: string; driver: null | { name: string; phone: string; vehicle_number: string } }

export default function BookingStatusPage() {
  const { token } = useParams<{ token: string }>()
  const [booking, setBooking] = useState<BookingView | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [upgradePaymentUrl, setUpgradePaymentUrl] = useState<string | null>(null)
  const load = useCallback(async () => {
    const response = await fetch(`/api/booking/${encodeURIComponent(token)}`, { cache: 'no-store' })
    const body = await response.json()
    if (!response.ok) setError(body.error || 'Could not load booking.')
    else { setError(''); setBooking(body.booking) }
  }, [token])
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 30_000); return () => window.clearInterval(timer) }, [load])
  const decide = async (action: 'refund' | 'upgrade') => {
    setBusy(true); setError('')
    const response = await fetch(`/api/booking/${encodeURIComponent(token)}/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    const body = await response.json()
    if (!response.ok) setError(body.error || 'Could not update booking.')
    else if (action === 'upgrade' && body.paymentUrl) setUpgradePaymentUrl(body.paymentUrl)
    else await load()
    setBusy(false)
  }
  return <div className="min-h-screen bg-slate-50 text-slate-900"><Nav /><main className="mx-auto max-w-2xl px-4 py-8 sm:py-12"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-wide text-amber-800">MarutiCab booking</p><h1 className="mt-2 text-2xl font-black">Booking status</h1>{error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}{upgradePaymentUrl && <a href={upgradePaymentUrl} target="_blank" rel="noreferrer" className="mt-4 block rounded-xl bg-amber-400 px-4 py-3 text-center text-sm font-extrabold text-slate-950">Pay the upgrade difference securely</a>}{!booking ? <p className="mt-5 text-sm text-slate-600">Loading your booking…</p> : <><div className="mt-5 rounded-2xl bg-slate-50 p-4"><div className="flex justify-between gap-2"><span className="text-sm text-slate-600">Reference</span><strong>{booking.booking_ref}</strong></div><p className="mt-2 font-bold">{booking.direction === 'KI' ? 'Khargone → Indore' : 'Indore → Khargone'} · {booking.drop_name}</p><p className="mt-1 text-sm text-slate-600">{booking.travel_date} at {booking.pickup_time.slice(0, 5)} · {booking.passenger_count} passenger(s)</p><p className="mt-1 text-sm text-slate-600">WhatsApp: {booking.phone}</p><p className="mt-3 text-sm">Total {formatRs(booking.total_fare)} · Advance {formatRs(booking.advance_amount)} · Balance {formatRs(booking.balance_amount)}</p></div><div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><h2 className="font-extrabold">{booking.status === 'waiting' ? 'Waiting for match' : booking.status === 'confirmed' || booking.status === 'matched' ? 'Confirmed' : booking.status === 'no_match_decision' ? 'No match found' : booking.status === 'refunded' ? 'Advance refunded' : booking.status === 'completed' ? 'Ride completed' : booking.status === 'pending_payment' ? 'Payment verification pending' : booking.status}</h2>{booking.status === 'waiting' && <p className="mt-1 text-sm">We are looking for an opposite-direction booking compatible with your chosen time. Decision cutoff: {booking.cutoff_at ? new Date(booking.cutoff_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'shown in booking updates'}.</p>}{(booking.status === 'confirmed' || booking.status === 'matched') && <><p className="mt-1 text-sm">Your chosen pickup time is saved. The remaining balance is paid in the cab.</p>{booking.driver && <p className="mt-3 text-sm">Driver: {booking.driver.name} · {booking.driver.vehicle_number} · <a className="underline" href={`tel:${booking.driver.phone}`}>{booking.driver.phone}</a></p>}</>}{booking.status === 'no_match_decision' && <><p className="mt-1 text-sm">Choose a full advance refund or request an upgrade to a guaranteed private ride. Refunds are returned to the original payment method in 5–7 working days.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><button disabled={busy} onClick={() => void decide('refund')} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Refund {formatRs(booking.advance_amount)}</button><button disabled={busy} onClick={() => void decide('upgrade')} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold disabled:opacity-50">Request a private cab upgrade</button></div></>}</div></>}</div><Link className="mt-5 inline-block text-sm font-bold text-amber-900 underline" href="/">Back to booking</Link></main></div>
}
