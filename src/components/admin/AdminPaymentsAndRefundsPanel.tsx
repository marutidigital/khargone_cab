'use client'

import { useState, useEffect } from 'react'
import {
  CreditCard,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock3,
  Loader2,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react'
import { formatRs } from '@/config/pricing'

export function AdminPaymentsAndRefundsPanel() {
  const [payments, setPayments] = useState<any[]>([])
  const [refunds, setRefunds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/payments-refunds')
      const data = await res.json()
      if (res.ok) {
        setPayments(data.payments || [])
        setRefunds(data.refunds || [])
      }
    } catch (err) {
      console.error('Failed to load payments & refunds:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const handleRetryRefund = async (refundId: string) => {
    setRetryingId(refundId)
    try {
      const res = await fetch('/api/admin/payments-refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refund_id: refundId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Refund retry failed')

      setToast({ message: 'Refund re-submitted successfully to Razorpay!', type: 'success' })
      await fetchData()
    } catch (err: any) {
      setToast({ message: err.message || 'Refund retry failed', type: 'error' })
    } finally {
      setRetryingId(null)
      setTimeout(() => setToast(null), 4000)
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`p-3 rounded-xl text-xs font-bold border flex items-center justify-between ${
            toast.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-300'
              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-600" />
            Razorpay Payments & Refunds Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of online advance payments (₹500) and automatic/manual refunds.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
          <span>Loading payment ledgers from Supabase...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Captured Advance Payments */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Verified Payments ({payments.length})
              </span>
              <span className="text-[10px] text-slate-500">₹500 Advance</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {payments.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No captured payments found.</div>
              ) : (
                payments.map((p) => (
                  <div key={p.id} className="p-4 text-xs space-y-1 hover:bg-slate-50/60 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded">
                          #{p.bookings?.booking_ref || 'BOOKING'}
                        </span>
                        <span className="ml-2 font-bold text-slate-800">
                          {p.bookings?.passenger_name || 'Passenger'} ({p.bookings?.phone})
                        </span>
                      </div>
                      <strong className="text-emerald-700 text-sm font-black">
                        +{formatRs(p.amount)}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono pt-1">
                      <span>Payment ID: {p.provider_payment_id || 'N/A'}</span>
                      <span>
                        {new Date(p.verified_at || p.created_at).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 2. Refunds Ledger */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                Refunds Ledger ({refunds.length})
              </span>
              <span className="text-[10px] text-slate-500">Auto & Manual</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {refunds.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No refunds recorded.</div>
              ) : (
                refunds.map((r) => {
                  const isFailed = r.refund_status === 'failed'
                  const isProcessed = r.refund_status === 'processed'
                  return (
                    <div key={r.id} className="p-4 text-xs space-y-2 hover:bg-slate-50/60 transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                            #{r.bookings?.booking_ref || 'BOOKING'}
                          </span>
                          <span className="ml-2 font-bold text-slate-800">
                            {r.bookings?.passenger_name || 'Passenger'}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isProcessed
                              ? 'bg-emerald-100 text-emerald-800'
                              : isFailed
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {r.refund_status}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-slate-600">
                        <span>Refund Amount: <strong className="text-rose-700">₹{r.amount}</strong></span>
                        <span className="font-mono text-[10px] text-slate-400">
                          ID: {r.provider_refund_id || r.idempotency_key}
                        </span>
                      </div>

                      {r.failure_reason && (
                        <div className="bg-rose-50 border border-rose-200 p-2 rounded-lg text-[11px] text-rose-800 flex items-center justify-between">
                          <span className="truncate max-w-[240px]">Error: {r.failure_reason}</span>
                          <button
                            type="button"
                            disabled={retryingId === r.id}
                            onClick={() => handleRetryRefund(r.id)}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2 py-1 rounded text-[10px] shrink-0 transition"
                          >
                            {retryingId === r.id ? 'Retrying…' : 'Retry Refund'}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
