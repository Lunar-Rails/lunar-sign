'use client'

import type { FieldPlacement, SignerInfo } from '@drvillo/react-browser-e-signing'
import { Lock } from 'lucide-react'
import { SignerFieldsPanel } from '@/components/SignerFieldsPanel'
import { SignerDetailsBlock } from '@/components/signer/SignerDetailsBlock'
import { SignatureBlock } from '@/components/signer/SignatureBlock'
import { Button } from '@/components/ui/button'
import type { StoredField } from '@/lib/types'

export interface SigningControlsSidebarProps {
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
  /** DocuSign-style guided flow: sidebar is progress + text fields only. */
  guided?: boolean
  guideStarted?: boolean
  guidePendingCount?: number
  isGuideComplete?: boolean
  activeTextFieldId?: string | null
}

export function SigningControlsSidebar({
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
  guided = false,
  guideStarted = false,
  guidePendingCount = 0,
  isGuideComplete = false,
  activeTextFieldId = null,
}: SigningControlsSidebarProps) {
  const showTitle = templateStored
    ? templateStored.some((f) => f.type === 'title')
    : true

  return (
    <aside
      className="space-y-4 lg:sticky lg:top-6 lg:z-10 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:overscroll-y-contain lg:self-start"
      aria-label="Signing controls"
    >
      {guided ? (
        <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card">
          <p className="text-section-label mb-2">Progress</p>
          {!guideStarted ? (
            <p className="text-body text-lr-muted">
              Click <span className="font-medium text-lr-text">Start</span> on the document, then complete each
              highlighted field. Tap your signature box to open the signature window.
            </p>
          ) : isGuideComplete ? (
            <p className="text-body text-lr-success">All required fields are complete. You can submit the document.</p>
          ) : (
            <p className="text-body text-lr-muted">
              <span className="font-display font-semibold tabular-nums text-lr-text">{guidePendingCount}</span>{' '}
              field{guidePendingCount === 1 ? '' : 's'} left on the document.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card">
          <SignerDetailsBlock signerInfo={signerInfo} onSignerInfoChange={onSignerInfoChange} showTitle={showTitle} />
        </div>
      )}

      {templateStored && (
        <SignerFieldsPanel
          stored={templateStored}
          fields={fields}
          updateField={updateField}
          signerIndex={signerIndex ?? null}
          activeFieldId={activeTextFieldId}
        />
      )}

      {!guided && (
        <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card">
          <SignatureBlock displayName={displayName} onSignatureDataUrl={onSignatureDataUrl} />
        </div>
      )}

      <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card">
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-body text-lr-muted">
            {guided
              ? 'When every field is done, submit to finish signing.'
              : 'Confirm your details and signature, then sign the document.'}
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
    </aside>
  )
}
