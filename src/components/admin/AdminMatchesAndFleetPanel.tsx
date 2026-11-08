'use client'

import { useState, useEffect } from 'react'
import {
  Car,
  Route,
  ArrowRight,
  CheckCircle2,
  Clock,
  User,
  Plus,
  Loader2,
  RefreshCw,
  X,
  Save,
  Edit3,
  AlertCircle,
  Phone,
  Send,
} from 'lucide-react'
import { formatRs } from '@/config/pricing'
import { EditTimeModal } from '@/components/admin/EditTimeModal'
import { AssignDriverModal } from '@/components/admin/AssignDriverModal'

export function AdminMatchesAndFleetPanel() {
  const [matches, setMatches] = useState<any[]>([])
  const [waitingKI, setWaitingKI] = useState<any[]>([])
  const [waitingIK, setWaitingIK] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pairing, setPairing] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Selection state for manual pair
  const [selectedKI, setSelectedKI] = useState<string | null>(null)
  const [selectedIK, setSelectedIK] = useState<string | null>(null)

  // Modals state
  const [editingBooking, setEditingBooking] = useState<any | null>(null)
  const [assigningMatch, setAssigningMatch] = useState<any | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Add vehicle modal
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [newReg, setNewReg] = useState('')
  const [newModel, setNewModel] = useState('')

  // Add/Edit Provider modal
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [providerName, setProviderName] = useState('')
  const [providerPhone, setProviderPhone] = useState('')
  const [providerPriority, setProviderPriority] = useState(1)
  const [providerActive, setProviderActive] = useState(true)
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [mRes, vRes, dRes, pRes] = await Promise.all([
        fetch('/api/admin/matches'),
        fetch('/api/admin/vehicles'),
        fetch('/api/drivers?status=active'),
        fetch('/api/admin/providers'),
      ])
      const mData = await mRes.json()
      const vData = await vRes.json()
      const dData = await dRes.json()
      const pData = await pRes.json()

      if (mRes.ok) {
        setMatches(mData.matches || [])
        setWaitingKI(mData.waitingKI || [])
        setWaitingIK(mData.waitingIK || [])
      }
      if (vRes.ok) {
        setVehicles(vData.vehicles || [])
      }
      if (dRes.ok) {
        setDrivers(dData.drivers || [])
      }
      if (pRes.ok) {
        setProviders(pData.providers || [])
      }
    } catch (err) {
      console.error('Error fetching matches/fleet/providers:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProviderId,
          name: providerName,
          phone: providerPhone,
          priority: providerPriority,
          active: providerActive,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save provider')

      setToast({ message: 'Provider saved successfully!', type: 'success' })
      setShowAddProvider(false)
      setProviderName('')
      setProviderPhone('')
      setProviderPriority(1)
      setProviderActive(true)
      setEditingProviderId(null)
      await fetchData()
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' })
    }
  }

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('Are you sure you want to remove this provider?')) return
    try {
      const res = await fetch(`/api/admin/providers?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete provider')
      setToast({ message: 'Provider deleted.', type: 'success' })
      await fetchData()
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' })
    }
  }

  const handleRefundBooking = async (b: any) => {
    if (!confirm(`Refund booking #${b.booking_ref} (${b.passenger_name})?`)) return
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'refund', id: b.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Refund failed')
      setToast({ message: `Refund processed for #${b.booking_ref}!`, type: 'success' })
      await fetchData()
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' })
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const selectedKIBooking = waitingKI.find((b) => b.id === selectedKI) || null
  const selectedIKBooking = waitingIK.find((b) => b.id === selectedIK) || null

  const handleConfirmPair = async () => {
    if (!selectedKI || !selectedIK) return
    setPairing(true)
    try {
      const res = await fetch('/api/admin/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_out_id: selectedKI,
          booking_back_id: selectedIK,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to match bookings')

      setToast({ message: 'Rides paired successfully! WhatsApp confirmation sent to both passengers.', type: 'success' })
      setSelectedKI(null)
      setSelectedIK(null)
      setShowConfirmModal(false)
      await fetchData()
    } catch (err: any) {
      setToast({ message: err.message || 'Error pairing rides', type: 'error' })
    } finally {
      setPairing(false)
      setTimeout(() => setToast(null), 5000)
    }
  }

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newReg.trim() || !newModel.trim()) return
    try {
      const res = await fetch('/api/admin/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_number: newReg.trim(),
          vehicle_model: newModel.trim(),
          seating_capacity: 4,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add vehicle')

      setToast({ message: 'Vehicle added to MarutiCab fleet!', type: 'success' })
      setShowAddVehicle(false)
      setNewReg('')
      setNewModel('')
      await fetchData()
    } catch (err: any) {
      setToast({ message: err.message || 'Error adding vehicle', type: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold border flex items-center justify-between shadow-xs animate-in fade-in ${
            toast.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-300'
              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
          }`}
        >
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Route className="w-5 h-5 text-amber-600" />
            Match Manager & Fleet Dispatch
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pair Khargone ➔ Indore with Indore ➔ Khargone return journeys, edit schedules, and assign dedicated sedan cabs.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddVehicle(true)}
            className="flex items-center gap-1.5 bg-[#FBBF24] hover:bg-[#F59E0B] text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add Vehicle
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading matches and fleet data…</div>
      ) : (
        <div className="space-y-6">
          {/* Pair Builder Action Bar */}
          {(selectedKI || selectedIK) && (
            <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-500 block">Outward (Khargone ➔ Indore):</span>
                  <span className="font-extrabold text-slate-900">
                    {selectedKIBooking
                      ? `#${selectedKIBooking.booking_ref} · ${selectedKIBooking.passenger_name} (${String(selectedKIBooking.pickup_time).slice(0, 5)}) ✓`
                      : 'Please select a ride below'}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-500 block">Return (Indore ➔ Khargone):</span>
                  <span className="font-extrabold text-slate-900">
                    {selectedIKBooking
                      ? `#${selectedIKBooking.booking_ref} · ${selectedIKBooking.passenger_name} (${String(selectedIKBooking.pickup_time).slice(0, 5)}) ✓`
                      : 'Please select a ride below'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={!selectedKI || !selectedIK || pairing}
                onClick={() => setShowConfirmModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                {pairing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Confirm Round-Trip Match</span>
              </button>
            </div>
          )}

          {/* Quick 1-Click Banner if exactly 1 KI and 1 IK waiting */}
          {waitingKI.length === 1 && waitingIK.length === 1 && !selectedKI && !selectedIK && (
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm animate-in fade-in">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-slate-900" />
                  <span>1-Click Round Trip Available!</span>
                </div>
                <div className="text-xs font-medium mt-0.5">
                  Pair <strong>#{waitingKI[0].booking_ref} ({waitingKI[0].passenger_name})</strong> with <strong>#{waitingIK[0].booking_ref} ({waitingIK[0].passenger_name})</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedKI(waitingKI[0].id)
                  setSelectedIK(waitingIK[0].id)
                  setShowConfirmModal(true)
                }}
                className="bg-slate-950 hover:bg-slate-900 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pair Both Rides Now</span>
              </button>
            </div>
          )}

          {/* Pending Rides for Matching (2 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Outward Waiting Column */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-black text-slate-800">
                <span>1. Khargone ➔ Indore Waiting ({waitingKI.length})</span>
                <span className="text-amber-800 font-bold">₹2,200 Fare</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                {waitingKI.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">No waiting requests</div>
                ) : (
                  waitingKI.map((b) => {
                    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
                    const isPastDate = b.travel_date && b.travel_date < todayStr

                    return (
                      <div
                        key={b.id}
                        className={`p-3 text-xs space-y-1.5 transition ${
                          selectedKI === b.id ? 'bg-amber-100/70 border-l-4 border-amber-500' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between font-bold">
                            <span>#{b.booking_ref} · {b.passenger_name}</span>
                            <span className="text-amber-900">{b.travel_date} at {String(b.pickup_time).slice(0, 5)}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{b.address || b.drop_name}</p>
                        </div>

                        <div className="flex items-center justify-between pt-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500">
                              {b.cutoff_at ? `Cutoff: ${new Date(b.cutoff_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : `Adv: ₹${b.advance_paid || 500}`}
                            </span>
                            {isPastDate ? (
                              <span className="rounded-full bg-rose-100 text-rose-800 px-1.5 py-0.5 text-[9px] font-bold border border-rose-200">
                                ⏰ Date Passed
                              </span>
                            ) : b.status === 'waiting' && (b.advance_paid > 0 || b.advance_amount > 0) && new Date(b.cutoff_at || Date.now() + 86400000) > new Date() ? (
                              <span className="rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[9px] font-black border border-emerald-300">
                                🌐 Public Board: Active
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 text-slate-600 px-1.5 py-0.5 text-[9px] font-semibold border border-slate-300">
                                🔒 Private / Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons: Explicit Select, Pair with Return, Edit Time, Refund */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 flex-wrap gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setSelectedKI(selectedKI === b.id ? null : b.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                selectedKI === b.id
                                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                              }`}
                            >
                              {selectedKI === b.id ? '✓ Selected' : '◯ Select to Pair'}
                            </button>

                            {selectedIK && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedKI(b.id)
                                  setShowConfirmModal(true)
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                ⚡ Pair with Selected Return
                              </button>
                            )}

                            {isPastDate && (
                              <button
                                type="button"
                                onClick={() => handleRefundBooking(b)}
                                className="text-[10px] font-bold text-rose-800 hover:text-rose-950 bg-rose-100 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                                title="Trip date has passed without match. Refund booking."
                              >
                                💸 Refund ₹{b.advance_paid || 500}
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingBooking(b)
                            }}
                            className="text-[10px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                            <span>Edit Time</span>
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Return Waiting Column */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-black text-slate-800">
                <span>2. Indore ➔ Khargone Waiting ({waitingIK.length})</span>
                <span className="text-emerald-800 font-bold">₹1,800 Fare</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                {waitingIK.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">No waiting requests</div>
                ) : (
                  waitingIK.map((b) => {
                    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
                    const isPastDate = b.travel_date && b.travel_date < todayStr

                    return (
                      <div
                        key={b.id}
                        className={`p-3 text-xs space-y-1.5 transition ${
                          selectedIK === b.id ? 'bg-amber-100/70 border-l-4 border-amber-500' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between font-bold">
                            <span>#{b.booking_ref} · {b.passenger_name}</span>
                            <span className="text-amber-900">{b.travel_date} at {String(b.pickup_time).slice(0, 5)}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{b.address || b.drop_name}</p>
                        </div>

                        <div className="flex items-center justify-between pt-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500">
                              {b.cutoff_at ? `Cutoff: ${new Date(b.cutoff_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : `Adv: ₹${b.advance_paid || 500}`}
                            </span>
                            {isPastDate ? (
                              <span className="rounded-full bg-rose-100 text-rose-800 px-1.5 py-0.5 text-[9px] font-bold border border-rose-200">
                                ⏰ Date Passed
                              </span>
                            ) : b.status === 'waiting' && (b.advance_paid > 0 || b.advance_amount > 0) && new Date(b.cutoff_at || Date.now() + 86400000) > new Date() ? (
                              <span className="rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[9px] font-black border border-emerald-300">
                                🌐 Public Board: Active
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 text-slate-600 px-1.5 py-0.5 text-[9px] font-semibold border border-slate-300">
                                🔒 Private / Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons: Explicit Select, Pair with Outward, Edit Time, Refund */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 flex-wrap gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setSelectedIK(selectedIK === b.id ? null : b.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                selectedIK === b.id
                                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                              }`}
                            >
                              {selectedIK === b.id ? '✓ Selected' : '◯ Select to Pair'}
                            </button>

                            {selectedKI && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIK(b.id)
                                  setShowConfirmModal(true)
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                ⚡ Pair with Selected Outward
                              </button>
                            )}

                            {isPastDate && (
                              <button
                                type="button"
                                onClick={() => handleRefundBooking(b)}
                                className="text-[10px] font-bold text-rose-800 hover:text-rose-950 bg-rose-100 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                                title="Trip date has passed without match. Refund booking."
                              >
                                💸 Refund ₹{b.advance_paid || 500}
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingBooking(b)
                            }}
                            className="text-[10px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                            <span>Edit Time</span>
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Confirmed Round-Trip Matches */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-800 uppercase tracking-wide flex items-center justify-between">
              <span>Confirmed Paired Matches ({matches.length})</span>
              <span className="text-slate-500 font-normal">Each pair shares 1 dedicated sedan cab & driver</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
              {matches.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No matches confirmed yet.</div>
              ) : (
                matches.map((m) => {
                  const bOut = m.booking_out
                  const bBack = m.booking_back
                  const hasDriver = Boolean(m.driver_id || m.drivers?.name)

                  return (
                    <div key={m.id} className="p-4 text-xs space-y-3">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <span className="font-bold text-slate-900 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Match #{String(m.id).slice(0, 8)}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500 font-normal">
                            {new Date(m.confirmed_at || m.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                          </span>
                        </span>

                        <div className="flex items-center gap-2">
                          {hasDriver ? (
                            <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-xl font-bold">
                              <Car className="w-3.5 h-3.5" />
                              <span>{m.drivers?.name} ({m.drivers?.phone})</span>
                            </div>
                          ) : (
                            <span className="flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-xl font-bold animate-pulse">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Driver Pending
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setAssigningMatch(m)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-1 rounded-xl text-xs flex items-center gap-1 shadow-xs transition"
                          >
                            <Car className="w-3.5 h-3.5" />
                            <span>{hasDriver ? 'Change Driver' : 'Assign Driver & Car'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Both Trips Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span>Trip 1 (KI): #{bOut?.booking_ref || 'OUT'} · {bOut?.passenger_name}</span>
                            {bOut && (
                              <button
                                type="button"
                                onClick={() => setEditingBooking(bOut)}
                                className="text-amber-800 hover:text-amber-950 p-1 hover:bg-amber-100 rounded"
                                title="Edit Trip 1 Time"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600">
                            📅 {bOut?.travel_date} at <strong>{String(bOut?.pickup_time).slice(0, 5)}</strong> · 📞 {bOut?.phone}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            Drop: {bOut?.drop_name} · Cash to collect: ₹{Math.max(0, (bOut?.total_fare || 2200) - (bOut?.advance_paid || 500))}
                          </div>
                        </div>

                        <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-3">
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span>Trip 2 (IK): #{bBack?.booking_ref || 'BACK'} · {bBack?.passenger_name}</span>
                            {bBack && (
                              <button
                                type="button"
                                onClick={() => setEditingBooking(bBack)}
                                className="text-amber-800 hover:text-amber-950 p-1 hover:bg-amber-100 rounded"
                                title="Edit Trip 2 Time"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600">
                            📅 {bBack?.travel_date} at <strong>{String(bBack?.pickup_time).slice(0, 5)}</strong> · 📞 {bBack?.phone}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            Drop: {bBack?.drop_name} · Cash to collect: ₹{Math.max(0, (bBack?.total_fare || 1800) - (bBack?.advance_paid || 500))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Car Providers (Sequential 6 Providers Cascade) */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  Car Providers ({providers.length}/6 Sequential Dispatch Queue)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Round trip match hote hi system automatically Priority 1 se 6 tak ek-ek karke Yes/No WhatsApp bhejega.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingProviderId(null)
                  setProviderName('')
                  setProviderPhone('')
                  setProviderPriority(Math.min(6, providers.length + 1))
                  setProviderActive(true)
                  setShowAddProvider(true)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Provider</span>
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {providers.length === 0 ? (
                <div className="col-span-3 text-center py-6 text-slate-400 text-xs">
                  Koi Provider configure nahi hai. Sequential dispatch ke liye kam se kam 1–6 Providers add karein.
                </div>
              ) : (
                providers.map((p) => (
                  <div key={p.id} className="border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 space-y-1.5 relative">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                        Priority #{p.priority}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${p.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                    <div className="text-slate-600 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>+91 {p.phone}</span>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProviderId(p.id)
                          setProviderName(p.name)
                          setProviderPhone(p.phone)
                          setProviderPriority(p.priority)
                          setProviderActive(p.active)
                          setShowAddProvider(true)
                        }}
                        className="text-[11px] font-bold text-amber-700 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProvider(p.id)}
                        className="text-[11px] font-bold text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Fleet Vehicles */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-800 uppercase tracking-wide flex justify-between">
              <span>Fleet Vehicles ({vehicles.length})</span>
              <span className="text-slate-500 font-normal">Sedan Dedicated (4-seater)</span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {vehicles.map((v) => (
                <div key={v.id} className="border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 space-y-1">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{v.registration_number}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black">
                      {v.availability_status}
                    </span>
                  </div>
                  <p className="text-slate-600 font-medium">{v.vehicle_model}</p>
                  <span className="text-[10px] text-slate-400">Capacity: {v.seating_capacity} passengers</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM ROUND-TRIP MATCH REVIEW MODAL ── */}
      {showConfirmModal && selectedKIBooking && selectedIKBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Confirm Round-Trip Match Pair</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review schedule and pair outward & return rides into one dedicated cab round trip.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs space-y-1">
                <div className="flex justify-between items-center font-bold text-amber-950">
                  <span>Outward Trip: Khargone ➔ Indore</span>
                  <button
                    type="button"
                    onClick={() => setEditingBooking(selectedKIBooking)}
                    className="text-[11px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" /> Adjust Time
                  </button>
                </div>
                <div className="font-extrabold text-sm text-slate-900">
                  #{selectedKIBooking.booking_ref} · {selectedKIBooking.passenger_name}
                </div>
                <div className="text-slate-600">
                  📅 {selectedKIBooking.travel_date} at <strong>{String(selectedKIBooking.pickup_time).slice(0, 5)}</strong> · 📞 {selectedKIBooking.phone}
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs space-y-1">
                <div className="flex justify-between items-center font-bold text-emerald-950">
                  <span>Return Trip: Indore ➔ Khargone</span>
                  <button
                    type="button"
                    onClick={() => setEditingBooking(selectedIKBooking)}
                    className="text-[11px] font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" /> Adjust Time
                  </button>
                </div>
                <div className="font-extrabold text-sm text-slate-900">
                  #{selectedIKBooking.booking_ref} · {selectedIKBooking.passenger_name}
                </div>
                <div className="text-slate-600">
                  📅 {selectedIKBooking.travel_date} at <strong>{String(selectedIKBooking.pickup_time).slice(0, 5)}</strong> · 📞 {selectedIKBooking.phone}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pairing}
                onClick={handleConfirmPair}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-2.5 text-xs rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {pairing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Yes, Confirm Round-Trip Match</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT TIME MODAL ── */}
      {editingBooking && (
        <EditTimeModal
          isOpen={Boolean(editingBooking)}
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
          onSuccess={(updatedBooking?: any) => {
            setToast({ message: `Time updated successfully for #${editingBooking.booking_ref}!`, type: 'success' })
            if (updatedBooking) {
              setWaitingKI((prev) => prev.map((b) => (b.id === updatedBooking.id ? { ...b, ...updatedBooking } : b)))
              setWaitingIK((prev) => prev.map((b) => (b.id === updatedBooking.id ? { ...b, ...updatedBooking } : b)))
            }
            void fetchData()
          }}
        />
      )}

      {/* ── ASSIGN DRIVER & CAR MODAL ── */}
      {assigningMatch && (
        <AssignDriverModal
          isOpen={Boolean(assigningMatch)}
          match={assigningMatch}
          drivers={drivers}
          vehicles={vehicles}
          onClose={() => setAssigningMatch(null)}
          onSuccess={() => {
            setToast({ message: `Driver & Car assigned successfully to Match #${String(assigningMatch.id).slice(0, 8)}! WhatsApp duty sent.`, type: 'success' })
            void fetchData()
          }}
        />
      )}

      {/* ── ADD VEHICLE MODAL ── */}
      {showAddVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleAddVehicle}
            className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-black text-slate-900">Add Fleet Vehicle</h3>
              <button type="button" onClick={() => setShowAddVehicle(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Registration Number</label>
              <input
                type="text"
                placeholder="MP-10-CA-XXXX"
                required
                value={newReg}
                onChange={(e) => setNewReg(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 uppercase"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Model & Spec</label>
              <input
                type="text"
                placeholder="Maruti Suzuki Dzire VXI (AC)"
                required
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowAddVehicle(false)}
                className="px-3 py-2 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs"
              >
                Save Vehicle
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── ADD / EDIT CAR PROVIDER MODAL ── */}
      {showAddProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleSaveProvider}
            className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {editingProviderId ? 'Edit Car Provider' : 'Add Independent Car Provider'}
                </h3>
                <p className="text-[11px] text-slate-500">Priority 1 to 6 Sequential Dispatch</p>
              </div>
              <button type="button" onClick={() => setShowAddProvider(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Provider / Owner Name</label>
              <input
                type="text"
                placeholder="Santosh Travels / Kailash Patel"
                required
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">WhatsApp Mobile (10-Digit)</label>
              <input
                type="tel"
                placeholder="98260XXXXX"
                required
                maxLength={10}
                value={providerPhone}
                onChange={(e) => setProviderPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Dispatch Priority (Order)</label>
              <select
                value={providerPriority}
                onChange={(e) => setProviderPriority(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
              >
                <option value={1}>Priority #1 (Pehle isse Yes/No pucho)</option>
                <option value={2}>Priority #2 (1st ne No bola ya 1h timeout hua toh ye)</option>
                <option value={3}>Priority #3</option>
                <option value={4}>Priority #4</option>
                <option value={5}>Priority #5</option>
                <option value={6}>Priority #6 (Last provider)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="pActive"
                checked={providerActive}
                onChange={(e) => setProviderActive(e.target.checked)}
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
              />
              <label htmlFor="pActive" className="text-xs font-bold text-slate-700">
                Active (Auto-dispatch me include karein)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowAddProvider(false)}
                className="px-3 py-2 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs"
              >
                Save Provider
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
