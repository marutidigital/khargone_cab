'use client'
// src/components/BookingStepper.tsx
// 6-step progress indicator with amber circles, checks, and connecting lines

import { Check } from 'lucide-react'

export interface StepItem {
  id: number
  title: string
  isCompleted: boolean
  isCurrent: boolean
}

interface Props {
  currentStep: number
  completedSteps: number[] // e.g. [1, 2]
  onStepClick?: (stepNumber: number) => void
}

const STEPS = [
  { id: 1, label: 'Route' },
  { id: 2, label: 'Drop Point' },
  { id: 3, label: 'Date' },
  { id: 4, label: 'Match Deal' },
  { id: 5, label: 'Pickup Time' },
  { id: 6, label: 'Passenger' },
  { id: 7, label: 'Payment' },
]

export function BookingStepper({ currentStep, completedSteps, onStepClick }: Props) {
  const currentStepObj = STEPS.find((s) => s.id === currentStep) || STEPS[0]
  const progressPercent = Math.min(100, Math.round(((completedSteps.length + 1) / STEPS.length) * 100))

  return (
    <div className="w-full bg-white border-b border-[#E5E7EB] shadow-xs">
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
            Step {currentStep} of {STEPS.length}
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#FBBF24] transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Desktop 7-Step Stepper */}
      <div className="hidden sm:block py-3.5 px-4 overflow-x-auto no-scrollbar">
        <div className="max-w-5xl mx-auto flex items-center justify-between min-w-[540px] px-2 sm:px-6">
          {STEPS.map((step, idx) => {
            const isCompleted = completedSteps.includes(step.id)
            const isCurrent = currentStep === step.id
            const hasNext = idx < STEPS.length - 1
            const nextIsCompleted = completedSteps.includes(step.id)

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
                        nextIsCompleted ? 'bg-[#FBBF24]' : 'bg-transparent'
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
