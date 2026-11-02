'use client'

import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, RefreshCw, MessageSquareText, Activity } from 'lucide-react'
import { getAdminApiHeaders } from '@/lib/admin-api'

type ActivityData = {
  messages: { id: string; maskedPhone: string; replyUrl: string; text: string; received_at: string; booking_id: string | null }[]
  health: { lastSuccessfulSend: string | null; failedLast24Hours: number; lastWebhookReceived: string | null }
}

const formatDate = (value: string | null) => value ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'No activity yet'

export function WhatsAppOperationsPanel() {
  const [data, setData] = useState<ActivityData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const headers = await getAdminApiHeaders()
      const response = await fetch('/api/admin/whatsapp/activity', { headers, cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not load WhatsApp activity.')
      setData(result)
      setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load WhatsApp activity.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 font-extrabold text-slate-900"><Activity className="h-4 w-4 text-emerald-700" />WhatsApp operations</h2><p className="mt-1 text-xs text-slate-500">Recent customer replies and delivery health.</p></div>
      <button onClick={() => void load()} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
    {data && <>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Last successful send</p><p className="mt-1 text-sm font-bold text-slate-800">{formatDate(data.health.lastSuccessfulSend)}</p></div>
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Failed sends · last 24 hours</p><p className="mt-1 text-sm font-bold text-slate-800">{data.health.failedLast24Hours}</p></div>
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Last webhook received</p><p className="mt-1 text-sm font-bold text-slate-800">{formatDate(data.health.lastWebhookReceived)}</p></div>
      </div>
      <div><h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-900"><MessageSquareText className="h-4 w-4" />Recent inbound messages</h3>
        {data.messages.length ? <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {data.messages.map((message) => <article key={message.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><p className="text-xs font-bold text-slate-500">{message.maskedPhone} · {formatDate(message.received_at)}</p><p className="mt-1 break-words text-sm text-slate-800">{message.text || '(interactive reply)'}</p></div>
            <a href={`${message.replyUrl}?text=${encodeURIComponent('Hi, our MarutiCab team is reviewing your message.')}`} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-800">Reply on WhatsApp <ExternalLink className="h-3 w-3" /></a>
          </article>)}
        </div> : <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">No customer replies recorded yet.</p>}
      </div>
    </>}
  </section>
}
