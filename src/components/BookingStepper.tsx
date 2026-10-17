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
  { id: 2, label: 'Vehicle' },
  { id: 3, label: 'Drop Point' },
  { id: 4, label: 'Date & Time' },
  { id: 5, label: 'Passenger' },
  { id: 6, label: 'Payment' },
]

export function BookingStepper({ currentStep, completedSteps, onStepClick }: Props) {
  return (
    <div className="w-full bg-white border-b border-[#E5E7EB] py-3.5 px-4 overflow-x-auto no-scrollbar shadow-xs">
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
  )
}
