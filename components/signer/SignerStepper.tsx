import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { step: 1, label: 'Consent' },
  { step: 2, label: 'Verify' },
  { step: 3, label: 'Sign' },
] as const

interface SignerStepperProps {
  currentStep: 1 | 2 | 3
  done?: boolean
}

export function SignerStepper({ currentStep, done = false }: SignerStepperProps) {
  return (
    <nav aria-label="Signing steps" className="mb-6">
      <ol className="flex items-center justify-center gap-0">
        {STEPS.map(({ step, label }, i) => {
          const isActive = currentStep === step && !done
          const isComplete = done || currentStep > step

          return (
            <li key={step} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  aria-current={isActive ? 'step' : undefined}
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-xs font-semibold transition-all duration-lr-fast',
                    isComplete
                      ? 'bg-lr-accent text-white'
                      : isActive
                        ? 'bg-lr-accent text-white ring-2 ring-lr-accent/30 ring-offset-2 ring-offset-lr-bg'
                        : 'bg-lr-surface-2 text-lr-muted border border-lr-border'
                  )}
                >
                  {isComplete ? <Check size={12} strokeWidth={2.5} /> : step}
                </span>
                <span
                  className={cn(
                    'text-micro',
                    isActive ? 'text-lr-text' : isComplete ? 'text-lr-accent' : 'text-lr-muted'
                  )}
                >
                  {label}
                </span>
              </div>

              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'mb-5 mx-2 h-px w-10 transition-all duration-lr-fast',
                    currentStep > step || done ? 'bg-lr-accent/40' : 'bg-lr-border'
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
