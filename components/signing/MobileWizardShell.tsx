'use client'

import type { ReactNode } from 'react'
import { FieldPalette, SignaturePad, SignaturePreview, SignerDetailsPanel } from '@drvillo/react-browser-e-signing'
import type {
  FieldPlacement,
  FieldType,
  SignatureStyle,
  SignerInfo,
} from '@drvillo/react-browser-e-signing'

import { SignerFieldsPanel } from '@/components/SignerFieldsPanel'
import { TemplateCreatorFieldsSummary } from '@/components/signing/TemplateCreatorFieldsSummary'
import type { StoredField } from '@/lib/types'

export type MobileWizardStep = 1 | 2 | 3

export interface MobileWizardShellProps {
  mobileWizardStep: MobileWizardStep
  setMobileWizardStep: (step: MobileWizardStep) => void
  pdfColumn: ReactNode
  templateMode: boolean
  templateStored: StoredField[] | null
  fields: FieldPlacement[]
  updateField: (fieldId: string, partial: Partial<FieldPlacement>) => void
  signerInfo: SignerInfo
  onSignerInfoChange: (next: SignerInfo) => void
  showFieldPalette: boolean
  selectedFieldType: FieldType | null
  onSelectFieldType: (t: FieldType | null) => void
  displayName: string
  signatureStyle: SignatureStyle
  activeSignatureDataUrl: string | null
  isRendering: boolean
  onSignatureStyleChange: (next: SignatureStyle) => void
  onDrawnSignature: (dataUrl: string) => void
  errorMessage: string | null
  loading: boolean
  completed: boolean
  onSubmit: (e: React.FormEvent) => void
  primaryNavButtonClass: string
  secondaryNavButtonClass: string
  signerIndex?: number | null
}

const STEPS = [
  { step: 1 as const, label: 'Details' },
  { step: 2 as const, label: 'Fields' },
  { step: 3 as const, label: 'Sign' },
] as const

export function MobileWizardShell({
  mobileWizardStep,
  setMobileWizardStep,
  pdfColumn,
  templateMode,
  templateStored,
  fields,
  updateField,
  signerInfo,
  onSignerInfoChange,
  showFieldPalette,
  selectedFieldType,
  onSelectFieldType,
  displayName,
  signatureStyle,
  activeSignatureDataUrl,
  isRendering,
  onSignatureStyleChange,
  onDrawnSignature,
  errorMessage,
  loading,
  completed,
  onSubmit,
  primaryNavButtonClass,
  secondaryNavButtonClass,
  signerIndex,
}: MobileWizardShellProps) {
  return (
    <>
      <nav className="mb-4" aria-label="Signing steps">
        <ol className="flex list-none items-start justify-between gap-2 text-caption">
          {STEPS.map(({ step, label }) => {
            const isActive = mobileWizardStep === step
            const isComplete = mobileWizardStep > step
            return (
              <li key={step} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-lr-sm font-semibold ${
                    isActive
                      ? 'bg-lr-accent text-white'
                      : isComplete
                        ? 'bg-lr-accent-dim text-lr-accent'
                        : 'bg-lr-surface-2 text-lr-muted'
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {step}
                </span>
                <span className="max-w-[5.5rem] text-center leading-tight">{label}</span>
              </li>
            )
          })}
        </ol>
      </nav>

      {mobileWizardStep === 1 && (
        <div className="space-y-4">
          <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card">
            <SignerDetailsPanel signerInfo={signerInfo} onSignerInfoChange={onSignerInfoChange} />
          </div>
          {templateMode && templateStored && (
            <TemplateCreatorFieldsSummary stored={templateStored} fields={fields} />
          )}
          {templateMode && templateStored && (
            <SignerFieldsPanel
              stored={templateStored}
              fields={fields}
              updateField={updateField}
              signerIndex={signerIndex ?? null}
            />
          )}
          <button
            type="button"
            className={primaryNavButtonClass}
            onClick={() => setMobileWizardStep(2)}
          >
            Continue to field placement
          </button>
        </div>
      )}

      {mobileWizardStep === 2 && (
        <div className="space-y-4">
          {pdfColumn}
          {showFieldPalette && (
            <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card">
              <h2 className="text-section-label mb-2">Field types</h2>
              <FieldPalette
                selectedFieldType={selectedFieldType}
                onSelectFieldType={onSelectFieldType}
              />
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <button
              type="button"
              className={`${secondaryNavButtonClass} sm:max-w-xs`}
              onClick={() => setMobileWizardStep(1)}
            >
              Back
            </button>
            <button
              type="button"
              className={`${primaryNavButtonClass} sm:max-w-xs`}
              onClick={() => setMobileWizardStep(3)}
            >
              Continue to sign
            </button>
          </div>
        </div>
      )}

      {mobileWizardStep === 3 && (
        <div className="space-y-4">
          <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card">
            <SignaturePreview
              signerName={displayName}
              style={signatureStyle}
              signatureDataUrl={activeSignatureDataUrl}
              isRendering={isRendering}
              onStyleChange={onSignatureStyleChange}
            />
          </div>
          <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card">
            <SignaturePad onDrawn={onDrawnSignature} />
          </div>
          <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card">
            <form onSubmit={onSubmit} className="space-y-6">
              <p className="text-body">
                Review your signature and submit the signed document.
              </p>
              {errorMessage && (
                <p className="rounded-lr border border-lr-error/30 bg-lr-error-dim px-3 py-2 text-caption text-lr-error">
                  {errorMessage}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lr bg-lr-accent px-4 py-2 text-lr-sm font-medium text-white hover:bg-lr-accent-hover disabled:cursor-not-allowed disabled:bg-lr-surface-2"
              >
                {loading ? 'Signing...' : 'Sign Document'}
              </button>
              {completed && (
                <p className="text-caption">
                  All signers completed. Redirecting to download...
                </p>
              )}
            </form>
          </div>
          <button
            type="button"
            className={secondaryNavButtonClass}
            onClick={() => setMobileWizardStep(2)}
          >
            Back to field placement
          </button>
        </div>
      )}
    </>
  )
}
