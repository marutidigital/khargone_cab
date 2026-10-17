'use client'
// src/components/StickyBottomBar.tsx

import { ArrowRight, Loader2, Check } from 'lucide-react'
import { formatRs, PRICING_CONFIG } from '@/config/pricing'

interface Props {
  currentStep: number
  totalSteps: number
  totalFare: number
  advanceDeposit: number
  canContinue: boolean
  isLoading?: boolean
  onContinue: () => void
}

export function StickyBottomBar({
  currentStep,
  totalSteps,
  totalFare,
  advanceDeposit,
  canContinue,
  isLoading,
  onContinue,
}: Props) {
  if (isFinalStep) return null

  let buttonLabel = 'Continue'
  if (currentStep === 1) buttonLabel = 'Continue to Vehicle'
  else if (currentStep === 2) buttonLabel = 'Continue to Location'
  else if (currentStep === 3) buttonLabel = 'Continue to Date & Time'
  else if (currentStep === 4) buttonLabel = 'Continue to Passenger'
  else if (currentStep === 5) buttonLabel = 'Review & Confirm'

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B1220]/95 backdrop-blur-md border-t border-slate-800 p-3 sm:py-3.5 sm:px-6 shadow-2xl">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Live Price & Deposit */}
        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {formatRs(totalFare)}
            </span>
            <span className="text-xs text-[#F5B841] font-semibold">
              ({formatRs(advanceDeposit)} token)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 truncate">
            Step {currentStep} of {totalSteps} · Fixed All-Inclusive Fare
          </span>
        </div>

        {/* Right: Big Tap Target Continue Button (Min 48px height) */}
        <button
          type="button"
          disabled={!canContinue || isLoading}
          onClick={onContinue}
          className={`flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 rounded-2xl font-extrabold text-sm sm:text-base tracking-tight transition-all duration-200 min-h-[48px] flex-shrink-0 shadow-lg ${
            canContinue && !isLoading
              ? 'bg-[#F5B841] hover:bg-[#E5A630] text-slate-950 shadow-[#F5B841]/25 active:scale-98 cursor-pointer'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed shadow-none'
          }`}
          aria-label={buttonLabel}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span>{buttonLabel}</span>
              {!isFinalStep ? (
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <Check className="w-4 h-4 stroke-[3]" />
              )}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
