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

export interface SigningControlsSidebarProps {
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
  fieldPaletteExtra?: ReactNode
  signerIndex?: number | null
}

export function SigningControlsSidebar({
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
  fieldPaletteExtra,
  signerIndex,
}: SigningControlsSidebarProps) {
  return (
    <aside
      className="space-y-4 lg:sticky lg:top-6 lg:z-10 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:overscroll-y-contain lg:self-start"
      aria-label="Signing controls"
    >
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

      {showFieldPalette && (
        <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card">
          <h2 className="text-section-label mb-3">Field types</h2>
          <p className="text-caption mb-3">
            Select a type, then click on the document to place it.
          </p>
          <FieldPalette
            selectedFieldType={selectedFieldType}
            onSelectFieldType={onSelectFieldType}
          />
          {fieldPaletteExtra}
        </div>
      )}

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
            {templateMode
              ? 'Confirm signer details and signature, then submit the signed document.'
              : 'Place required fields, confirm signer details, then submit the signed document.'}
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
    </aside>
  )
}
