'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Nav } from '@/components/Nav'

export default function PassengerBookingsPage() {
  const router = useRouter()

  useEffect(() => {
    const queryToken = new URLSearchParams(window.location.search).get('token')
    const token = queryToken || window.sessionStorage.getItem('maruticab_booking_token')
    if (token && /^[A-Za-z0-9_-]{30,128}$/.test(token)) {
      router.replace(`/booking/${encodeURIComponent(token)}`)
      return
    }
    router.replace('/my-rides')
  }, [router])


  return <div className="min-h-screen bg-slate-50 text-slate-900"><Nav /><main className="mx-auto max-w-xl px-4 py-10 sm:py-16">
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-800">MarutiCab passenger bookings</p>
      <h1 className="mt-2 text-2xl font-black sm:text-3xl">Manage your booking</h1>
      <p className="mt-4 text-sm text-slate-600">Opening your secure request status…</p>
    </section>
  </main></div>
}
