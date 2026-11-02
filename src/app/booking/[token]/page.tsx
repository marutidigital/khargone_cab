'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { formatRs } from '@/config/pricing'

type BookingView = { booking_ref: string; mode: string; status: string; direction: string; drop_name: string; travel_date: string; pickup_time: string; passenger_count: number; passenger_name: string; phone: string; total_fare: number; advance_amount: number; advance_paid: number; balance_amount: number; cutoff_at: string | null; refund_status: string; driver: null | { name: string; phone: string; vehicle_number: string } }

export default function BookingStatusPage() {
  const { token } = useParams<{ token: string }>()
  const [booking, setBooking] = useState<BookingView | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [upgradePaymentUrl, setUpgradePaymentUrl] = useState<string | null>(null)
  const load = useCallback(async () => {
    const response = await fetch(`/api/booking/${encodeURIComponent(token)}`, { cache: 'no-store' })
    const body = await response.json()
    if (!response.ok) setError(body.error || 'Could not load booking.')
    else { setError(''); setBooking(body.booking) }
  }, [token])
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 30_000); return () => window.clearInterval(timer) }, [load])
  const decide = async (action: 'cancel' | 'refund' | 'upgrade') => {
    if (action === 'cancel' && !window.confirm(booking?.advance_paid ? 'Cancel this unconfirmed ride? Any paid advance will be refunded.' : 'Cancel this ride request? No payment has been taken.')) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(`/api/booking/${encodeURIComponent(token)}/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
      const body = await response.json()
      if (!response.ok) setError(body.error || 'Could not update booking.')
      else if (action === 'upgrade' && body.paymentUrl) setUpgradePaymentUrl(body.paymentUrl)
      else {
        if (action === 'cancel') setNotice(body.refundProcessed ? 'Your ride request is cancelled.' : 'Your ride request is cancelled. Any advance paid on an older booking will be refunded.')
        await load()
      }
    } catch {
      setError('Could not update booking. Please try again.')
    } finally { setBusy(false) }
  }
  return <div className="min-h-screen bg-slate-50 text-slate-900"><Nav /><main className="mx-auto max-w-2xl px-4 py-8 sm:py-12"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-wide text-amber-800">MarutiCab booking</p><h1 className="mt-2 text-2xl font-black">Booking status</h1>{error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}{notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}{upgradePaymentUrl && <a href={upgradePaymentUrl} target="_blank" rel="noreferrer" className="mt-4 block rounded-xl bg-amber-400 px-4 py-3 text-center text-sm font-extrabold text-slate-950">Pay the upgrade difference securely</a>}{!booking ? <p className="mt-5 text-sm text-slate-600">Loading your booking…</p> : <><div className="mt-5 rounded-2xl bg-slate-50 p-4"><div className="flex justify-between gap-2"><span className="text-sm text-slate-600">Reference</span><strong>{booking.booking_ref}</strong></div><p className="mt-2 font-bold">{booking.direction === 'KI' ? 'Khargone → Indore' : 'Indore → Khargone'} · {booking.drop_name}</p><p className="mt-1 text-sm text-slate-600">{booking.travel_date} at {booking.pickup_time.slice(0, 5)} · {booking.passenger_count} passenger(s)</p><p className="mt-1 text-sm text-slate-600">WhatsApp: {booking.phone}</p><p className="mt-3 text-sm">Total fare {formatRs(booking.total_fare)} · Pay in cab {formatRs(booking.balance_amount)}</p></div><div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><h2 className="font-extrabold">{booking.status === 'waiting' ? 'Waiting for match' : booking.status === 'confirmed' || booking.status === 'matched' ? 'Confirmed' : booking.status === 'no_match_decision' ? 'No match found' : booking.status === 'cancelled' ? 'Booking cancelled' : booking.status === 'refunded' ? 'Advance refunded' : booking.status === 'completed' ? 'Ride completed' : booking.status === 'pending_payment' ? 'Payment verification pending' : booking.status}</h2>{booking.status === 'waiting' && <p className="mt-1 text-sm">We are looking for an opposite-direction booking compatible with your chosen time. Decision cutoff: {booking.cutoff_at ? new Date(booking.cutoff_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'shown in booking updates'}.</p>}{(booking.status === 'confirmed' || booking.status === 'matched') && <><p className="mt-1 text-sm">Your chosen pickup time is saved. Pay the full fare in the cab.</p>{booking.driver && <p className="mt-3 text-sm">Driver: {booking.driver.name} · {booking.driver.vehicle_number} · <a className="underline" href={`tel:${booking.driver.phone}`}>{booking.driver.phone}</a></p>}</>}{booking.status === 'cancelled' && <p className="mt-1 text-sm">{booking.refund_status === 'processed' ? 'Your advance refund is complete. It will appear in your original payment method.' : ['failed', 'pending', 'processing'].includes(booking.refund_status) ? 'Your cancellation is recorded and any paid advance refund is being checked.' : 'Your booking is cancelled. No payment was taken.'}</p>}{booking.status === 'no_match_decision' && (booking.advance_paid > 0 ? <><p className="mt-1 text-sm">No compatible return ride was found. Choose a full advance refund or request a private cab upgrade.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><button disabled={busy} onClick={() => void decide('refund')} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Refund {formatRs(booking.advance_paid)}</button><button disabled={busy} onClick={() => void decide('upgrade')} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold disabled:opacity-50">Request a private cab upgrade</button></div></> : <p className="mt-1 text-sm">No compatible return ride was found before the cutoff. No payment was taken. Contact MarutiCab if you would like to ask about another option.</p>)}{(booking.status === 'waiting' || booking.status === 'no_match_decision') && <div className="mt-4 border-t border-amber-200 pt-4"><p className="text-sm text-slate-700">You can cancel before this ride is confirmed. {booking.advance_paid > 0 ? `Your ${formatRs(booking.advance_paid)} advance will be refunded.` : 'No advance payment was collected.'}</p><button disabled={busy} onClick={() => void decide('cancel')} className="mt-3 min-h-11 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800 hover:bg-rose-50 disabled:opacity-50">{busy ? 'Cancelling…' : 'Cancel booking'}</button></div>}</div></>}</div><Link className="mt-5 inline-block text-sm font-bold text-amber-900 underline" href="/">Back to booking</Link></main></div>
}
