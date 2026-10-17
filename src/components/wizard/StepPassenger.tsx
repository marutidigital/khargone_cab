'use client'
// src/components/wizard/StepPassenger.tsx

import { useState } from 'react'
import { User, Phone, Mail, Users, CheckSquare, Square, ShieldCheck, AlertCircle } from 'lucide-react'
import type { VehicleType } from '@/types'
import { PRICING_CONFIG } from '@/config/pricing'

export interface PassengerInfo {
  name: string
  phone: string
  email: string
  passengers: number
  consent: boolean
}

interface Props {
  vehicle: VehicleType
  initialData: PassengerInfo
  onSave: (data: PassengerInfo) => void
  onNext: () => void
}

export function StepPassenger({ vehicle, initialData, onSave, onNext }: Props) {
  const [name, setName] = useState(initialData.name)
  const [phone, setPhone] = useState(initialData.phone)
  const [email, setEmail] = useState(initialData.email)
  const [passengers, setPassengers] = useState(initialData.passengers || 1)
  const [consent, setConsent] = useState(initialData.consent ?? true)

  const [errors, setErrors] = useState<{ name?: string; phone?: string; consent?: string }>({})

  const maxPassengers = vehicle === 'suv' ? 6 : 4

  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10)
    setPhone(cleaned)
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }))
  }

  const handleNameChange = (val: string) => {
    setName(val)
    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
  }

  const validate = () => {
    const errs: typeof errors = {}
    if (!name.trim()) errs.name = 'Please enter your full name'
    if (!/^[6-9]\d{9}$/.test(phone)) errs.phone = 'Please enter a valid 10-digit mobile number'
    if (!consent) errs.consent = 'Consent is required to send ride updates on WhatsApp'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleProceed = () => {
    if (!validate()) return
    onSave({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      passengers,
      consent,
    })
    onNext()
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <User className="w-6 h-6 text-[#F5B841]" />
          Passenger & Contact Details
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Your driver will contact you at this number 30 minutes before arrival.
        </p>
      </div>

      <div className="space-y-4">
        {/* Full Name */}
        <div>
          <label htmlFor="passenger-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Full Name *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-5 h-5" />
            </div>
            <input
              id="passenger-name"
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Avadh Bajaj"
              className={`w-full pl-11 pr-4 py-3.5 text-base text-slate-900 bg-white border-2 rounded-xl focus:outline-none transition-colors min-h-[48px] ${
                errors.name
                  ? 'border-rose-400 focus:border-rose-500'
                  : 'border-slate-200 focus:border-[#F5B841]'
              }`}
            />
          </div>
          {errors.name && (
            <p className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.name}
            </p>
          )}
        </div>

        {/* Mobile / WhatsApp Number */}
        <div>
          <label htmlFor="passenger-phone" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            WhatsApp Mobile Number *
          </label>
          <div className="relative flex">
            <div className="inline-flex items-center px-3.5 bg-slate-100 border-2 border-r-0 border-slate-200 rounded-l-xl text-slate-600 font-bold text-base min-h-[48px]">
              +91
            </div>
            <input
              id="passenger-phone"
              type="tel"
              inputMode="numeric"
              required
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="10-digit number"
              className={`w-full px-3.5 py-3.5 text-base text-slate-900 bg-white border-2 rounded-r-xl focus:outline-none transition-colors min-h-[48px] ${
                errors.phone
                  ? 'border-rose-400 focus:border-rose-500'
                  : 'border-slate-200 focus:border-[#F5B841]'
              }`}
            />
          </div>
          {errors.phone ? (
            <p className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.phone}
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 mt-1">
              We send the driver contact and Rs 500 UPI payment link to this WhatsApp.
            </p>
          )}
        </div>

        {/* Number of Passengers */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Number of Passengers ({vehicle === 'suv' ? 'Max 6' : 'Max 4'})
          </label>
          <div className="flex gap-2">
            {Array.from({ length: maxPassengers }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setPassengers(num)}
                aria-pressed={passengers === num}
                className={`flex-1 py-2.5 rounded-xl border-2 font-bold text-sm min-h-[48px] transition-all ${
                  passengers === num
                    ? 'border-[#F5B841] bg-amber-50 text-slate-950 ring-2 ring-[#F5B841]/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Email Address (Optional) */}
        <div>
          <label htmlFor="passenger-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Email Address <span className="text-slate-400 font-normal lowercase">(optional for invoice)</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-5 h-5" />
            </div>
            <input
              id="passenger-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full pl-11 pr-4 py-3.5 text-base text-slate-900 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#F5B841] transition-colors min-h-[48px]"
            />
          </div>
        </div>

        {/* Consent Checkbox */}
        <div className="pt-2">
          <label
            className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
              consent
                ? 'bg-amber-50/50 border-amber-300'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked)
                if (errors.consent) setErrors((prev) => ({ ...prev, consent: undefined }))
              }}
              className="sr-only"
            />
            <div className="mt-0.5 flex-shrink-0 text-[#F5B841]">
              {consent ? (
                <CheckSquare className="w-5 h-5 fill-[#F5B841] text-slate-950" />
              ) : (
                <Square className="w-5 h-5 text-slate-300" />
              )}
            </div>
            <span className="text-xs sm:text-sm text-slate-800 leading-snug">
              I agree to be contacted on WhatsApp about this booking.
              <span className="block text-[11px] text-slate-500 mt-0.5">
                Hanscab never spams or shares your number with third parties.
              </span>
            </span>
          </label>
          {errors.consent && (
            <p className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.consent}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
