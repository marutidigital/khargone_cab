'use client'

import { useState, useEffect } from 'react'
import { X, Car, User, Phone, CheckCircle2, Loader2, ArrowRight } from 'lucide-react'

interface AssignDriverModalProps {
  isOpen: boolean
  match: any
  drivers?: any[]
  vehicles?: any[]
  onClose: () => void
  onSuccess: () => void
}

export function AssignDriverModal({
  isOpen,
  match,
  drivers = [],
  vehicles = [],
  onClose,
  onSuccess,
}: AssignDriverModalProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')
  const [driverName, setDriverName] = useState<string>('')
  const [driverPhone, setDriverPhone] = useState<string>('')
  const [vehicleModel, setVehicleModel] = useState<string>('Maruti Suzuki Dzire (AC)')
  const [vehicleNumber, setVehicleNumber] = useState<string>('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (match) {
      if (match.drivers?.name) {
        setDriverName(match.drivers.name)
        setDriverPhone(match.drivers.phone || '')
      }
      if (match.vehicle_id) {
        const v = vehicles.find((item) => item.id === match.vehicle_id)
        if (v) {
          setVehicleModel(v.vehicle_model)
          setVehicleNumber(v.registration_number)
        }
      }
    }
  }, [match, vehicles])

  if (!isOpen || !match) return null

  const bOut = match.booking_out
  const bBack = match.booking_back

  const handleSelectDriver = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dId = e.target.value
    setSelectedDriverId(dId)
    if (!dId) return
    const d = drivers.find((item) => item.id === dId)
    if (d) {
      setDriverName(d.name)
      setDriverPhone(d.phone)
      if (d.vehicle_number) setVehicleNumber(d.vehicle_number)
      if (d.vehicle_model) setVehicleModel(d.vehicle_model)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/matches/assign-driver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: match.id,
          driver_name: driverName.trim(),
          driver_phone: driverPhone.trim(),
          vehicle_model: vehicleModel.trim(),
          vehicle_number: vehicleNumber.trim().toUpperCase(),
          driver_id: selectedDriverId || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to assign driver.')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error assigning driver.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
              <Car className="w-4 h-4 text-emerald-600" />
              <span>Assign Driver & Car to Both Trips</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Match #{String(match.id).slice(0, 8)} · Dedicated Round-Trip Cab Dispatch
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trips Summary */}
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs space-y-2">
          <div className="font-bold text-slate-700 flex items-center gap-2">
            <span>Trip 1 (Khargone ➔ Indore):</span>
            <span className="font-black text-slate-900">
              #{bOut?.booking_ref || 'OUT'} · {bOut?.passenger_name} ({String(bOut?.pickup_time || '').slice(0, 5)})
            </span>
          </div>
          <div className="font-bold text-slate-700 flex items-center gap-2 border-t border-slate-200 pt-1.5">
            <span>Trip 2 (Indore ➔ Khargone):</span>
            <span className="font-black text-slate-900">
              #{bBack?.booking_ref || 'BACK'} · {bBack?.passenger_name} ({String(bBack?.pickup_time || '').slice(0, 5)})
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Quick select existing driver */}
          {drivers.length > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Choose Existing Driver (or type new details below)
              </label>
              <select
                value={selectedDriverId}
                onChange={handleSelectDriver}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none cursor-pointer"
              >
                <option value="">-- Add New Driver / Type Manually --</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.phone}) {d.vehicle_number ? `· ${d.vehicle_number}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Driver Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Driver Name *</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Ramesh Kumar"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Driver WhatsApp Mobile *</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="9826012345"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Car Model & Type *</label>
              <input
                type="text"
                required
                placeholder="Maruti Suzuki Dzire VXI"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Vehicle Plate / Reg No *</label>
              <input
                type="text"
                required
                placeholder="MP 09 AB 1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none uppercase"
              />
            </div>
          </div>

          {/* WhatsApp Flow notice */}
          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-xs space-y-1.5">
            <span className="font-extrabold text-emerald-900 flex items-center gap-1.5">
              <span>⚡ Automated WhatsApp Dispatch</span>
            </span>
            <ul className="text-[11px] text-emerald-800 space-y-1 list-disc pl-4">
              <li>Driver ko dono trips ki complete details WhatsApp par send hongi with <strong>[📞 Baat Ho Gayi]</strong> button.</li>
              <li>Passenger 1 aur Passenger 2 dono ko Driver ka naam, number aur gaadi number receive ho jayega.</li>
              <li>Driver ride shuru aur drop hone par buttons se live status update karega.</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-2.5 text-xs rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Confirm & Dispatch WhatsApp Duty</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
