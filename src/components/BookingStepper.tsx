'use client'
// src/components/BookingStepper.tsx
// 4-step modern app progress indicator with amber badges, checkmarks, and responsive mobile bar

import { Check } from 'lucide-react'

export interface StepItem {
  id: number
  title: string
  isCompleted: boolean
  isCurrent: boolean
}

interface Props {
  currentStep: number
  completedSteps: number[]
  onStepClick?: (stepNumber: number) => void
  steps?: { id: number; label: string }[]
}

const DEFAULT_STEPS = [
  { id: 1, label: 'Route & Drop' },
  { id: 2, label: 'Date & Time' },
  { id: 3, label: 'Passenger' },
  { id: 4, label: 'Confirm' },
]

export function BookingStepper({ currentStep, completedSteps, onStepClick, steps = DEFAULT_STEPS }: Props) {
  const currentStepObj = steps.find((s) => s.id === currentStep) || steps[0]
  const progressPercent = Math.min(100, Math.round((currentStep / steps.length) * 100))

  return (
    <div className="w-full bg-white border-b border-[#E5E7EB] sticky top-14 sm:top-16 z-40 shadow-xs">
      {/* Mobile App-Style Stepper: Clean progress bar & indicator */}
      <div className="sm:hidden px-4 py-2.5">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FBBF24] text-[11px] font-black text-slate-950">
              {currentStep}
            </span>
            <span className="text-xs font-black text-slate-900 tracking-tight">
              {currentStepObj.label}
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            Step {currentStep} of {steps.length}
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#FBBF24] transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* 4 Quick Step Pills for Mobile */}
        <div className="grid grid-cols-4 gap-1.5 mt-2">
          {steps.map((step) => {
            const isCompleted = completedSteps.includes(step.id)
            const isCurrent = currentStep === step.id
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepClick && onStepClick(step.id)}
                className={`py-1 px-1 rounded-lg text-[10px] font-bold text-center truncate transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-[#FBBF24] text-slate-950 shadow-xs'
                    : isCompleted
                    ? 'bg-amber-100/70 text-amber-900'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {step.id}. {step.label.split(' ')[0]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Desktop 4-Step Stepper */}
      <div className="hidden sm:block py-3 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-2 sm:px-6">
          {steps.map((step, idx) => {
            const isCompleted = completedSteps.includes(step.id)
            const isCurrent = currentStep === step.id
            const hasNext = idx < steps.length - 1
            const nextIsCompleted = completedSteps.includes(step.id + 1)

            return (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                {/* Step Circle & Label */}
                <button
                  type="button"
                  onClick={() => onStepClick && onStepClick(step.id)}
                  className="flex items-center gap-2 group focus:outline-none cursor-pointer"
                >
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      isCompleted
                        ? 'bg-[#FBBF24] text-slate-950 shadow-xs'
                        : isCurrent
                        ? 'bg-[#FBBF24] text-slate-950 ring-4 ring-[#FBBF24]/20 shadow-xs font-black'
                        : 'border-2 border-slate-300 text-slate-400 bg-white'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </div>

                  <span
                    className={`text-xs font-semibold whitespace-nowrap transition-colors ${
                      isCompleted || isCurrent ? 'text-slate-900 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </button>

                {/* Connecting Line */}
                {hasNext && (
                  <div className="flex-1 mx-3 sm:mx-4 h-0.5 relative bg-slate-200">
                    <div
                      className={`h-full transition-all duration-300 ${
                        nextIsCompleted || isCompleted ? 'bg-[#FBBF24]' : 'bg-transparent'
                      }`}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
