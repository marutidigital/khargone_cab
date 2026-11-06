'use client'

import { useState } from 'react'
import { X, Clock, Calendar, Loader2, CheckCircle2 } from 'lucide-react'

interface EditTimeModalProps {
  isOpen: boolean
  booking: any
  onClose: () => void
  onSuccess: (updatedBooking?: any) => void
}

export function EditTimeModal({ isOpen, booking, onClose, onSuccess }: EditTimeModalProps) {
  const [pickupTime, setPickupTime] = useState<string>(
    String(booking?.pickup_time || '12:00').slice(0, 5)
  )
  const [travelDate, setTravelDate] = useState<string>(
    String(booking?.travel_date || new Date().toISOString().slice(0, 10))
  )
  const [notifyCustomer, setNotifyCustomer] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !booking) return null

  const routeLabel = booking.direction === 'KI' ? 'Khargone ➔ Indore' : 'Indore ➔ Khargone'

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/bookings/update-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.id,
          pickup_time: pickupTime,
          travel_date: travelDate,
          notify_customer: notifyCustomer,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update schedule.')
      }

      onSuccess(data.booking)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error updating time.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Edit Pickup Time & Schedule</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              #{booking.booking_ref} · {booking.passenger_name} ({routeLabel})
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

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Travel Date</label>
              <input
                type="date"
                required
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Pickup Time (24h)</label>
              <input
                type="time"
                required
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-2xl text-xs space-y-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="notifyCustomerCheckbox"
                checked={notifyCustomer}
                onChange={(e) => setNotifyCustomer(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
              />
              <label htmlFor="notifyCustomerCheckbox" className="font-bold text-slate-800 cursor-pointer">
                Send WhatsApp notification to passenger ({booking.phone})
              </label>
            </div>
            <p className="text-[11px] text-slate-600 pl-6">
              Passenger ko WhatsApp par naye pickup time ka message turant bhej diya jayega.
            </p>
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
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-5 py-2 text-xs rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Save & Update Time</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
