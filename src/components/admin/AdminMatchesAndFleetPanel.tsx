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
} from 'lucide-react'
import { formatRs } from '@/config/pricing'

export function AdminMatchesAndFleetPanel() {
  const [matches, setMatches] = useState<any[]>([])
  const [waitingKI, setWaitingKI] = useState<any[]>([])
  const [waitingIK, setWaitingIK] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pairing, setPairing] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Selection state for manual pair
  const [selectedKI, setSelectedKI] = useState<string | null>(null)
  const [selectedIK, setSelectedIK] = useState<string | null>(null)

  // Add vehicle modal
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [newReg, setNewReg] = useState('')
  const [newModel, setNewModel] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [mRes, vRes] = await Promise.all([
        fetch('/api/admin/matches'),
        fetch('/api/admin/vehicles'),
      ])
      const mData = await mRes.json()
      const vData = await vRes.json()
      if (mRes.ok) {
        setMatches(mData.matches || [])
        setWaitingKI(mData.waitingKI || [])
        setWaitingIK(mData.waitingIK || [])
      }
      if (vRes.ok) {
        setVehicles(vData.vehicles || [])
      }
    } catch (err) {
      console.error('Error fetching matches/fleet:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

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
      await fetchData()
    } catch (err: any) {
      setToast({ message: err.message || 'Error pairing rides', type: 'error' })
    } finally {
      setPairing(false)
      setTimeout(() => setToast(null), 4000)
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
            <Route className="w-5 h-5 text-amber-600" />
            Match Manager & Fleet Dispatch
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pair Khargone ➔ Indore with Indore ➔ Khargone return journeys and assign dedicated sedan cabs.
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
            className="flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
          <span>Loading dispatch data...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pair Builder Action Bar */}
          {(selectedKI || selectedIK) && (
            <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-500 block">Outward (Khargone ➔ Indore):</span>
                  <span className="font-extrabold text-slate-900">{selectedKI ? 'Selected ✓' : 'Please select a ride below'}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-600" />
                <div>
                  <span className="font-bold text-slate-500 block">Return (Indore ➔ Khargone):</span>
                  <span className="font-extrabold text-slate-900">{selectedIK ? 'Selected ✓' : 'Please select a ride below'}</span>
                </div>
              </div>
              <button
                type="button"
                disabled={!selectedKI || !selectedIK || pairing}
                onClick={handleConfirmPair}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                {pairing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Confirm Round-Trip Match</span>
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
                  waitingKI.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => setSelectedKI(selectedKI === b.id ? null : b.id)}
                      className={`p-3 text-xs space-y-1 cursor-pointer transition ${
                        selectedKI === b.id ? 'bg-amber-100/70 border-l-4 border-amber-500' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between font-bold">
                        <span>#{b.booking_ref} · {b.passenger_name}</span>
                        <span className="text-amber-900">{b.travel_date} at {String(b.pickup_time).slice(0, 5)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{b.address || b.drop_name}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-500">
                          {b.cutoff_at ? `Cutoff: ${new Date(b.cutoff_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : `Adv: ₹${b.advance_paid || 500}`}
                        </span>
                        {b.status === 'waiting' && (b.advance_paid > 0 || b.advance_amount > 0) && new Date(b.cutoff_at || Date.now() + 86400000) > new Date() ? (
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
                  ))
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
                  waitingIK.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => setSelectedIK(selectedIK === b.id ? null : b.id)}
                      className={`p-3 text-xs space-y-1 cursor-pointer transition ${
                        selectedIK === b.id ? 'bg-amber-100/70 border-l-4 border-amber-500' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between font-bold">
                        <span>#{b.booking_ref} · {b.passenger_name}</span>
                        <span className="text-amber-900">{b.travel_date} at {String(b.pickup_time).slice(0, 5)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{b.address || b.drop_name}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-500">
                          {b.cutoff_at ? `Cutoff: ${new Date(b.cutoff_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : `Adv: ₹${b.advance_paid || 500}`}
                        </span>
                        {b.status === 'waiting' && (b.advance_paid > 0 || b.advance_amount > 0) && new Date(b.cutoff_at || Date.now() + 86400000) > new Date() ? (
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
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Confirmed Round-Trip Matches */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-800 uppercase tracking-wide">
              Confirmed Paired Matches ({matches.length})
            </div>
            <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
              {matches.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No matches confirmed yet.</div>
              ) : (
                matches.map((m) => (
                  <div key={m.id} className="p-4 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Match #{String(m.id).slice(0, 8)}
                      </span>
                      <span className="text-slate-500">
                        {new Date(m.confirmed_at || m.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div>
                        <strong>Trip 1 (KI):</strong> #{m.booking_out?.booking_ref || 'OUT'} · {m.booking_out?.passenger_name} ({m.booking_out?.travel_date})
                      </div>
                      <div>
                        <strong>Trip 2 (IK):</strong> #{m.booking_back?.booking_ref || 'BACK'} · {m.booking_back?.passenger_name} ({m.booking_back?.travel_date})
                      </div>
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
              <span className="text-slate-500">Sedan Dedicated (4-seater)</span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {vehicles.map((v) => (
                <div key={v.id} className="border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 space-y-1">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{v.registration_number}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                      {v.availability_status}
                    </span>
                  </div>
                  <p className="text-slate-600">{v.vehicle_model}</p>
                  <span className="text-[10px] text-slate-400">Capacity: {v.seating_capacity} passengers</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
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
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
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
                className="bg-[#FBBF24] text-slate-950 font-black px-4 py-2 rounded-xl text-xs"
              >
                Add Vehicle
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
