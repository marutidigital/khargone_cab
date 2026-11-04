'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { Nav } from '@/components/Nav'
import { PRICING_CONFIG } from '@/config/pricing'

export default function PassengerBookingsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const queryToken = new URLSearchParams(window.location.search).get('token')
    const token = queryToken || window.sessionStorage.getItem('maruticab_booking_token')
    if (token && /^[A-Za-z0-9_-]{30,128}$/.test(token)) {
      router.replace(`/booking/${encodeURIComponent(token)}`)
      return
    }
    router.replace('/my-rides')
  }, [router])

  const whatsapp = `https://wa.me/917282316090?text=${encodeURIComponent('Hi MarutiCab, I need help opening my booking.')}`

  return <div className="min-h-screen bg-slate-50 text-slate-900"><Nav /><main className="mx-auto max-w-xl px-4 py-10 sm:py-16">
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-800">MarutiCab passenger bookings</p>
      <h1 className="mt-2 text-2xl font-black sm:text-3xl">Manage your booking</h1>
      {!ready ? <p className="mt-4 text-sm text-slate-600">Opening your secure booking…</p> : <>
        <p className="mt-3 text-sm leading-6 text-slate-600">Use the private booking link sent after checkout to view your trip or request cancellation. For your privacy, bookings can only be opened with that secure link.</p>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Cancellation rule</strong><p className="mt-1">You can cancel while the Match Deal ride is waiting for confirmation. No online advance is collected. Once the ride is confirmed, online cancellation is unavailable.</p></div>
        <a href={whatsapp} target="_blank" rel="noreferrer" className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white"><MessageCircle className="h-4 w-4" />Need your booking link? Contact support</a>
        <button type="button" onClick={() => router.push('/')} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">Book a ride <ArrowRight className="h-4 w-4" /></button>
      </>}
    </section>
  </main></div>
}
