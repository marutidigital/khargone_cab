'use client'

import { useState, useEffect } from 'react'
import {
  Sliders,
  History,
  Clock,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit2,
  Save,
  X,
  FileText,
} from 'lucide-react'

interface BookingRule {
  id: string
  rule_code: string
  rule_name: string
  min_hours_before_departure: number
  max_hours_before_departure: number | null
  matching_deadline_hours: number
  advance_amount: number
  refund_enabled: boolean
  auto_cancel_on_no_match: boolean
  active: boolean
  priority: number
  timezone: string
  description: string
  customer_message: string
  updated_at: string
}

interface RuleVersion {
  id: string
  rule_id: string
  version_number: number
  previous_values: any
  new_values: any
  changed_by: string
  change_reason: string
  created_at: string
}

export function AdminBookingRulesPanel() {
  const [rules, setRules] = useState<BookingRule[]>([])
  const [versions, setVersions] = useState<RuleVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRule, setEditingRule] = useState<BookingRule | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [activeTab, setActiveTab] = useState<'rules' | 'history'>('rules')

  const fetchRules = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/rules')
      const data = await res.json()
      if (res.ok) {
        setRules(data.rules || [])
        setVersions(data.versions || [])
      }
    } catch (err) {
      console.error('Failed to load rules:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchRules()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRule) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRule.id,
          matching_deadline_hours: Number(editingRule.matching_deadline_hours),
          advance_amount: Number(editingRule.advance_amount),
          active: editingRule.active,
          customer_message: editingRule.customer_message,
          description: editingRule.description,
          change_reason: 'Updated via Admin Dashboard',
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to update rule')

      setToast({ message: `Rule ${editingRule.rule_code} updated successfully! New version logged.`, type: 'success' })
      setEditingRule(null)
      await fetchRules()
    } catch (err: any) {
      setToast({ message: err.message || 'Error updating rule', type: 'error' })
    } finally {
      setSaving(false)
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
          <button onClick={() => setToast(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-600" />
            Dynamic Booking Rules & Cutoffs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rules governing matching deadlines, advance collection, and automatic cancellation.
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'rules' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
            }`}
          >
            Active Rules ({rules.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Version History ({versions.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
          <span>Loading booking rules from Supabase...</span>
        </div>
      ) : activeTab === 'rules' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`rounded-2xl border p-5 transition bg-white shadow-xs flex flex-col justify-between ${
                rule.active ? 'border-slate-200' : 'border-slate-300 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {rule.rule_code}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      rule.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {rule.active ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-900">{rule.rule_name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{rule.description}</p>

                <div className="mt-4 space-y-2 text-xs border-t border-slate-100 pt-3">
                  <div className="flex justify-between text-slate-600">
                    <span>Lead time window:</span>
                    <strong className="text-slate-900">
                      {rule.min_hours_before_departure}h to {rule.max_hours_before_departure ? `${rule.max_hours_before_departure}h` : 'Unlimited'}
                    </strong>
                  </div>
                  <div className="flex justify-between text-amber-900 bg-amber-50/80 p-2 rounded-xl">
                    <span className="flex items-center gap-1 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> Cutoff Deadline:
                    </span>
                    <strong className="font-black">Departure − {rule.matching_deadline_hours} Hours</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Advance Required:</span>
                    <strong className="text-slate-900">₹{rule.advance_amount}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Auto-refund on no match:</span>
                    <strong className="text-emerald-700">Enabled (100% Full)</strong>
                  </div>
                </div>

                <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-700 block mb-0.5">Customer Message:</span>
                  <p className="italic leading-relaxed">{rule.customer_message}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRule(rule)}
                  className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-black text-white font-bold py-2 px-3 rounded-xl text-xs transition cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Rule Parameters
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Version History View */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
            Audit Log: Historical Rule Version Changes (Existing bookings preserve snapshot)
          </div>
          <div className="divide-y divide-slate-100">
            {versions.map((ver) => (
              <div key={ver.id} className="p-4 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">
                    Rule Version #{ver.version_number} · Changed by: <span className="text-amber-800">{ver.changed_by}</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(ver.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </span>
                </div>
                <p className="text-slate-600">Reason: {ver.change_reason}</p>
                <div className="bg-slate-50 p-2 rounded text-[11px] font-mono text-slate-700 overflow-x-auto">
                  {JSON.stringify(ver.new_values, null, 2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-black text-slate-900">
                Edit Rule: {editingRule.rule_name} ({editingRule.rule_code})
              </h3>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Matching Deadline (Hours before departure)
              </label>
              <input
                type="number"
                min={1}
                max={72}
                required
                value={editingRule.matching_deadline_hours}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, matching_deadline_hours: Number(e.target.value) })
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-400">
                E.g. 6 hours for same-day; 24 hours for advance bookings.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Advance Amount (₹)
              </label>
              <input
                type="number"
                min={1}
                required
                value={editingRule.advance_amount}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, advance_amount: Number(e.target.value) })
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Customer Facing Explanation
              </label>
              <textarea
                rows={3}
                required
                value={editingRule.customer_message}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, customer_message: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="rule-active"
                checked={editingRule.active}
                onChange={(e) => setEditingRule({ ...editingRule, active: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500"
              />
              <label htmlFor="rule-active" className="text-xs font-bold text-slate-800">
                Rule is Active & Enforced
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 bg-[#FBBF24] hover:bg-[#F59E0B] text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow-xs"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save & Log Version</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
