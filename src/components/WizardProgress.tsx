'use client'
// src/components/WizardProgress.tsx

import { ArrowLeft } from 'lucide-react'

export interface StepInfo {
  number: number
  title: string
  shortLabel: string
}

export const WIZARD_STEPS: StepInfo[] = [
  { number: 1, title: 'Route & Direction', shortLabel: 'Route' },
  { number: 2, title: 'Select Vehicle', shortLabel: 'Vehicle' },
  { number: 3, title: 'Pickup / Drop Point', shortLabel: 'Point' },
  { number: 4, title: 'Date & Pickup Time', shortLabel: 'Date/Time' },
  { number: 5, title: 'Passenger Details', shortLabel: 'Passenger' },
  { number: 6, title: 'Review & Confirm', shortLabel: 'Review' },
]

interface Props {
  currentStep: number
  onBack: () => void
  onStepClick?: (step: number) => void
  completedMaxStep: number
}

export function WizardProgress({ currentStep, onBack, onStepClick, completedMaxStep }: Props) {
  const current = WIZARD_STEPS[currentStep - 1] || WIZARD_STEPS[0]
  const progressPct = Math.round(((currentStep - 1) / (WIZARD_STEPS.length - 1)) * 100)

  return (
    <div className="w-full mb-6">
      {/* Top Header: Back Button + Step Indicator */}
      <div className="flex items-center justify-between gap-3 mb-3">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 px-3 py-2 rounded-xl transition-all min-h-[44px]"
            aria-label="Go back to previous step"
          >
            <ArrowLeft className="w-4 h-4 text-[#F5B841]" />
            <span>Back</span>
          </button>
        ) : (
          <div className="text-xs font-semibold text-[#F5B841] uppercase tracking-wider bg-[#F5B841]/10 border border-[#F5B841]/20 px-3 py-1.5 rounded-full">
            Start Booking
          </div>
        )}

        <div className="text-right">
          <span className="text-xs font-bold text-slate-400">Step {currentStep} of {WIZARD_STEPS.length}:</span>
          <span className="text-sm font-extrabold text-white ml-1.5">{current.title}</span>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-slate-700/60 relative">
        <div
          className="bg-gradient-to-r from-[#F5B841] to-[#E5A630] h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.max(12, progressPct)}%` }}
        />
      </div>

      {/* Step Dots on tablet & desktop */}
      <div className="hidden sm:flex items-center justify-between mt-2.5 px-1">
        {WIZARD_STEPS.map((s) => {
          const isActive = s.number === currentStep
          const isDone = s.number < currentStep
          const canClick = s.number <= completedMaxStep

          return (
            <button
              key={s.number}
              type="button"
              disabled={!canClick || isActive}
              onClick={() => onStepClick && onStepClick(s.number)}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-[#F5B841] font-bold'
                  : isDone
                  ? 'text-slate-300 hover:text-white cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isActive
                    ? 'bg-[#F5B841] text-slate-950 shadow-sm'
                    : isDone
                    ? 'bg-slate-700 text-slate-200'
                    : 'bg-slate-800/90 text-slate-600 border border-slate-700/50'
                }`}
              >
                {s.number}
              </div>
              <span className="hidden md:inline">{s.shortLabel}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
