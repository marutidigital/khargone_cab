'use client'
// src/components/booking/SectionPassenger.tsx
import { User, Phone, MapPin, Users, Plus, Minus, AlertCircle } from 'lucide-react'

export interface PassengerFormData {
  name: string
  phone: string
  passengers: number
  consent: boolean
  address: string
}

interface Props {
  maxPassengers: number
  data: PassengerFormData
  onChange: (updated: Partial<PassengerFormData>) => void
  errors: { name?: string; phone?: string; consent?: string }
}

export function SectionPassenger({ maxPassengers, data, onChange, errors }: Props) {
  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10)
    onChange({ phone: cleaned })
  }

  const incrementPax = () => {
    if (data.passengers < maxPassengers) {
      onChange({ passengers: data.passengers + 1 })
    }
  }

  const decrementPax = () => {
    if (data.passengers > 1) {
      onChange({ passengers: data.passengers - 1 })
    }
  }

  return (
    <section className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base font-black text-[#FBBF24]">6.</span>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          Passenger details
        </h2>
      </div>

      <div className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="e.g. Ramesh Sharma"
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FBBF24] min-h-[46px] ${
                errors.name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-white'
              }`}
            />
          </div>
          {errors.name && (
            <span className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.name}
            </span>
          )}
        </div>

        {/* 10-Digit WhatsApp Number */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            10-digit WhatsApp Number <span className="text-rose-500">*</span>
          </label>
          <div className="relative flex">
            <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
              +91
            </span>
            <div className="relative flex-1">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                placeholder="98260 00000"
                value={data.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                maxLength={10}
                className={`w-full pl-9 pr-4 py-3 rounded-r-xl border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FBBF24] min-h-[46px] ${
                  errors.phone ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-white'
                }`}
              />
            </div>
          </div>
          {errors.phone && (
            <span className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.phone}
            </span>
          )}
        </div>

        {/* Passengers Stepper */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <span className="text-xs font-bold text-slate-800 block">Number of Passengers</span>
            <span className="text-[11px] text-slate-500 block">
              Max {maxPassengers} passengers for this car
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={decrementPax}
              disabled={data.passengers <= 1}
              className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer"
              aria-label="Decrease passengers"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <span className="text-sm font-extrabold text-slate-900 w-5 text-center">
              {data.passengers}
            </span>

            <button
              type="button"
              onClick={incrementPax}
              disabled={data.passengers >= maxPassengers}
              className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer"
              aria-label="Increase passengers"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Optional Pickup Address / Landmark */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Exact Pickup Address / Landmark <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="e.g. Near Collectorate / Bus Stand Gate"
              value={data.address}
              onChange={(e) => onChange({ address: e.target.value })}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FBBF24] min-h-[46px]"
            />
          </div>
        </div>

        {/* WhatsApp Consent Checkbox (Required) */}
        <div className="pt-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={data.consent}
              onChange={(e) => onChange({ consent: e.target.checked })}
              className="mt-1 w-4 h-4 rounded text-amber-500 focus:ring-[#FBBF24] border-slate-300 cursor-pointer"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              I agree to be contacted on WhatsApp about this booking and receive driver details.
            </span>
          </label>
          {errors.consent && (
            <span className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium pl-6">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.consent}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
