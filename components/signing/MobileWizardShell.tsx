'use client'

import type { ReactNode } from 'react'
import type { FieldPlacement, SignerInfo } from '@drvillo/react-browser-e-signing'
import { SignerFieldsPanel } from '@/components/SignerFieldsPanel'
import { SignerDetailsBlock } from '@/components/signer/SignerDetailsBlock'
import { SignatureBlock } from '@/components/signer/SignatureBlock'
import { Button } from '@/components/ui/button'
import { Lock, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StoredField } from '@/lib/types'

export type MobileWizardStep = 1 | 2

export interface MobileWizardShellProps {
  mobileWizardStep: MobileWizardStep
  setMobileWizardStep: (step: MobileWizardStep) => void
  pdfColumn: ReactNode
  templateStored: StoredField[] | null
  fields: FieldPlacement[]
  updateField: (fieldId: string, partial: Partial<FieldPlacement>) => void
  signerInfo: SignerInfo
  onSignerInfoChange: (next: SignerInfo) => void
  displayName: string
  activeSignatureDataUrl: string | null
  onSignatureDataUrl: (dataUrl: string | null) => void
  errorMessage: string | null
  loading: boolean
  completed: boolean
  onSubmit: (e: React.FormEvent) => void
  signerIndex?: number | null
}

const STEPS = [
  { step: 1 as const, label: 'Details' },
  { step: 2 as const, label: 'Sign' },
] as const

export function MobileWizardShell({
  mobileWizardStep,
  setMobileWizardStep,
  pdfColumn,
  templateStored,
  fields,
  updateField,
  signerInfo,
  onSignerInfoChange,
  displayName,
  activeSignatureDataUrl: _activeSignatureDataUrl,
  onSignatureDataUrl,
  errorMessage,
  loading,
  completed,
  onSubmit,
  signerIndex,
}: MobileWizardShellProps) {
  const showTitle = templateStored
    ? templateStored.some((f) => f.type === 'title')
    : true

  return (
    <>
      {/* Step indicator */}
      <nav className="mb-4" aria-label="Signing steps">
        <ol className="flex list-none items-start justify-center gap-6 text-caption">
          {STEPS.map(({ step, label }) => {
            const isActive = mobileWizardStep === step
            const isComplete = mobileWizardStep > step
            return (
              <li key={step} className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold transition-all duration-lr-fast',
                    isActive
                      ? 'bg-lr-accent text-white ring-2 ring-lr-accent/30 ring-offset-2 ring-offset-lr-bg'
                      : isComplete
                        ? 'bg-lr-accent text-white'
                        : 'bg-lr-surface-2 text-lr-muted border border-lr-border'
                  )}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isComplete ? <Check size={14} strokeWidth={2.5} /> : step}
                </span>
                <span className={cn('text-micro', isActive ? 'text-lr-text' : isComplete ? 'text-lr-accent' : 'text-lr-muted')}>
                  {label}
                </span>
              </li>
            )
          })}
        </ol>
      </nav>

      {/* Step 1: Details + document */}
      {mobileWizardStep === 1 && (
        <div className="space-y-4">
          {pdfColumn}

          <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card">
            <SignerDetailsBlock signerInfo={signerInfo} onSignerInfoChange={onSignerInfoChange} showTitle={showTitle} />
          </div>

          {templateStored && (
            <SignerFieldsPanel
              stored={templateStored}
              fields={fields}
              updateField={updateField}
              signerIndex={signerIndex ?? null}
            />
          )}

          <Button
            type="button"
            className="w-full"
            onClick={() => setMobileWizardStep(2)}
          >
            Continue to sign
          </Button>
        </div>
      )}

      {/* Step 2: Signature + submit */}
      {mobileWizardStep === 2 && (
        <div className="space-y-4">
          <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card">
            <SignatureBlock displayName={displayName} onSignatureDataUrl={onSignatureDataUrl} />
          </div>

          <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card">
            <form onSubmit={onSubmit} className="space-y-4">
              <p className="text-body text-lr-muted">
                Review your signature and submit the signed document.
              </p>
              {errorMessage && (
                <p className="rounded-lr border border-lr-error/30 bg-lr-error/10 px-3 py-2 text-caption text-lr-error">
                  {errorMessage}
                </p>
              )}
              <Button type="submit" disabled={loading} className="w-full gap-2">
                <Lock size={14} />
                {loading ? 'Signing…' : 'Sign Document'}
              </Button>
              {completed && (
                <p className="text-caption text-lr-muted text-center">
                  All signers completed. Redirecting to download…
                </p>
              )}
            </form>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => setMobileWizardStep(1)}
          >
            Back to details
          </Button>
        </div>
      )}
    </>
  )
}
