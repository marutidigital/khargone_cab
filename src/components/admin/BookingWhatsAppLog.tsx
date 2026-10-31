'use client'

import { useState } from 'react'
import { getAdminApiHeaders } from '@/lib/admin-api'

type Notice = { id: string; template: string; status: string; created_at: string; sent_at: string | null; error: string | null; recipient_type: string }

export function BookingWhatsAppLog({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Notice[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const toggle = async () => {
    if (open) { setOpen(false); return }
    setOpen(true)
    setBusy(true)
    try {
      const headers = await getAdminApiHeaders()
      const response = await fetch(`/api/admin/whatsapp/activity?booking_id=${encodeURIComponent(bookingId)}`, { headers, cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Notification log unavailable.')
      setRows(result.notifications || [])
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Notification log unavailable.') }
    finally { setBusy(false) }
  }
  const resend = async (row: Notice) => {
    if (!window.confirm(`Resend ${row.template} to this booking's customer/driver?`)) return
    setBusy(true); setMessage('')
    try {
      const headers = await getAdminApiHeaders()
      const response = await fetch('/api/admin/whatsapp/resend', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId, template: row.template }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Resend failed.')
      setMessage(result.success ? 'Resent.' : 'Message could not be sent. Check WhatsApp readiness.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Resend failed.') }
    finally { setBusy(false) }
  }
  return <div className="mt-2">
    <button type="button" onClick={() => void toggle()} className="text-xs font-semibold text-slate-600 underline">{open ? 'Hide message log' : 'Message log'}</button>
    {open && <div className="mt-2 w-64 space-y-2 rounded-lg border border-slate-200 bg-white p-2.5">
      {busy && <p className="text-xs text-slate-500">Loading…</p>}
      {message && <p role="status" className="text-xs text-slate-600">{message}</p>}
      {!busy && !rows.length && <p className="text-xs text-slate-500">No WhatsApp notifications recorded.</p>}
      {rows.map((row) => <div key={row.id} className="border-t border-slate-100 pt-2 first:border-0 first:pt-0">
        <p className="break-all text-xs font-bold text-slate-800">{row.template} · {row.recipient_type}</p>
        <p className="text-[11px] capitalize text-slate-500">{row.status} · {new Date(row.sent_at || row.created_at).toLocaleString('en-IN')}</p>
        {row.error && <p className="mt-1 text-[11px] text-rose-700">{row.error}</p>}
        <button type="button" disabled={busy} onClick={() => void resend(row)} className="mt-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-bold disabled:opacity-50">Resend</button>
      </div>)}
    </div>}
  </div>
}
