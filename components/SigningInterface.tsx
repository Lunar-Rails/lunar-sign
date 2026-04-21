'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Lock, FileX2, Printer } from 'lucide-react'
import {
  modifyPdf,
  sha256,
  useFieldPlacement,
  usePdfDocument,
  usePdfPageVisibility,
  usePdfTextLines,
} from '@drvillo/react-browser-e-signing'

import '@/lib/esigning/configure-client'

import type { SignerInfo } from '@drvillo/react-browser-e-signing'

import { IntentConfirmDialog } from '@/components/signing/IntentConfirmDialog'
import { DeclineDialog } from '@/components/signing/DeclineDialog'
import { SigningCompletePanel } from '@/components/signing/SigningCompletePanel'
import { MobileWizardShell } from '@/components/signing/MobileWizardShell'
import { PdfColumn, type PdfColumnHandle } from '@/components/signing/PdfColumn'
import { SigningControlsSidebar } from '@/components/signing/SigningControlsSidebar'
import { SignatureModal } from '@/components/signing/SignatureModal'
import { Button } from '@/components/ui/button'
import { SignerAppHeader } from '@/components/signer/SignerAppHeader'
import { SignerStepper } from '@/components/signer/SignerStepper'
import { SignerFooter } from '@/components/signer/SignerFooter'
import { SignerStateCard } from '@/components/signer/SignerStateCard'
import {
  applySignerValuesToPlacements,
  hydrateForSigner,
  parseFieldMetadataJson,
  resolveSignerIndex,
} from '@/lib/field-metadata'
import { getPendingGuideSteps } from '@/lib/signer-field-guide'
import { useNarrowSigningLayout } from '@/hooks/useSigningState'
import { useSignerFieldGuide } from '@/hooks/useSignerFieldGuide'

type MobileWizardStep = 1 | 2

interface SigningInterfaceProps {
  token: string
  signerName: string
  signerEmail: string
  documentTitle: string
  pdfBase64: string
  /** When set, fields are fixed (template-based document). */
  initialFieldsJson?: string | null
  /** Which signer slot this user belongs to. null = legacy single-signer behavior. */
  signerIndex?: number | null
  /**
   * Identifier for the PDF version this page was rendered from. Echoed back
   * to the server so it can reject stale submissions (another signer signed
   * between page load and submit). 'original' = no prior signatures.
   */
  baseVersion: string
}

export default function SigningInterface({
  token,
  signerName,
  signerEmail,
  documentTitle,
  pdfBase64,
  initialFieldsJson,
  signerIndex,
  baseVersion,
}: SigningInterfaceProps) {
  const router = useRouter()
  const viewerContainerRef = useRef<HTMLDivElement | null>(null)
  const pdfColumnRef = useRef<PdfColumnHandle | null>(null)
  const prevGuideStepKeyRef = useRef<string>('')

  const templateStored = useMemo(() => {
    if (!initialFieldsJson?.trim()) return null
    try {
      return parseFieldMetadataJson(initialFieldsJson)
    } catch {
      return null
    }
  }, [initialFieldsJson])

  const currentSignerIndex = signerIndex ?? null

  const placementOptions = useMemo(() => {
    if (!templateStored?.length) return {}
    return { initialFields: hydrateForSigner(templateStored, currentSignerIndex) }
  }, [templateStored, currentSignerIndex])

  const { fields, updateField, clearFields } =
    useFieldPlacement(placementOptions)

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitHash, setSubmitHash] = useState<string>('')
  const [submitFieldCount, setSubmitFieldCount] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showIntentDialog, setShowIntentDialog] = useState(false)
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [declining, setDeclining] = useState(false)
  const pendingSubmitRef = useRef<(() => Promise<void>) | null>(null)

  const [signerInfo, setSignerInfo] = useState<SignerInfo>(() => {
    const [firstName = '', ...rest] = signerName.trim().split(' ')
    return { firstName, lastName: rest.join(' '), title: '' }
  })

  const [activeSignatureDataUrl, setActiveSignatureDataUrl] = useState<string | null>(null)

  const guidedSigningEnabled = Boolean(templateStored && templateStored.length > 0)
  const guide = useSignerFieldGuide({
    fields,
    hasSignatureDataUrl: Boolean(activeSignatureDataUrl),
  })
  const [signatureModalOpen, setSignatureModalOpen] = useState(false)

  const displayName = useMemo(() => {
    const composed = `${signerInfo.firstName} ${signerInfo.lastName}`.trim()
    return composed || signerName
  }, [signerInfo.firstName, signerInfo.lastName, signerName])

  const pdfInput = useMemo(() => base64ToUint8Array({ value: pdfBase64 }), [pdfBase64])

  const {
    numPages,
    scale,
    setScale,
    pageDimensions,
    setPageDimension,
    handleDocumentLoadSuccess,
    isLoading,
    errorMessage: pdfErrorMessage,
  } = usePdfDocument(pdfInput)

  const { textLinesByPage, handlePageTextContent } = usePdfTextLines(pageDimensions)

  const { currentPageIndex, scrollToPage } = usePdfPageVisibility({
    containerRef: viewerContainerRef,
    numPages,
  })

  const fieldPreview = useMemo(
    () => ({
      signatureDataUrl: activeSignatureDataUrl,
      fullName: displayName,
      title: signerInfo.title,
      dateText: new Date().toLocaleDateString(),
    }),
    [activeSignatureDataUrl, displayName, signerInfo.title]
  )

  useEffect(() => {
    if (!templateStored?.length || !fields.length) return
    for (const s of templateStored) {
      const idx = resolveSignerIndex(s)
      const isMy = currentSignerIndex != null ? idx === currentSignerIndex : idx !== null
      if (!isMy) continue
      if (s.type === 'fullName') {
        const f = fields.find((x) => x.id === s.id)
        if (f && f.value !== displayName) updateField(s.id, { value: displayName })
      }
      if (s.type === 'title') {
        const f = fields.find((x) => x.id === s.id)
        const t = signerInfo.title ?? ''
        if (f && f.value !== t) updateField(s.id, { value: t })
      }
    }
  }, [templateStored, fields, displayName, signerInfo.title, currentSignerIndex, updateField])

  useEffect(() => {
    if (!guidedSigningEnabled || !guide.started || !guide.currentStep) return
    const key = `${guide.currentStep.kind}-${guide.currentStep.fieldId}`
    if (prevGuideStepKeyRef.current === key) return
    prevGuideStepKeyRef.current = key
    scrollToPage(guide.currentStep.pageIndex)
  }, [guidedSigningEnabled, guide.started, guide.currentStep, scrollToPage])

  const handleGuideNext = useCallback(() => {
    const pending = getPendingGuideSteps(fields, Boolean(activeSignatureDataUrl))
    if (pending.length === 0) return
    const targetId = pending.length > 1 ? pending[1].fieldId : pending[0].fieldId
    pdfColumnRef.current?.scrollFieldIntoView(targetId)
  }, [fields, activeSignatureDataUrl])

  const handleSignatureFieldClick = useCallback(() => {
    if (!guidedSigningEnabled || !guide.started) return
    const pending = getPendingGuideSteps(fields, Boolean(activeSignatureDataUrl))
    if (pending[0]?.kind !== 'signature') return
    setSignatureModalOpen(true)
  }, [guidedSigningEnabled, guide.started, fields, activeSignatureDataUrl])

  const isNarrow = useNarrowSigningLayout()
  const [mobileWizardStep, setMobileWizardStep] = useState<MobileWizardStep>(1)
  const [singlePageIndex, setSinglePageIndex] = useState(0)

  const pdfDataForViewer = useMemo(() => {
    if (!pdfInput.length) return null
    return pdfInput.slice().buffer
  }, [pdfInput, isNarrow, mobileWizardStep])

  const isScrollMode = !isNarrow
  const viewerPageIndex = isScrollMode ? currentPageIndex : singlePageIndex
  const pageMode = isScrollMode ? 'scroll' : 'single'

  useEffect(() => {
    if (numPages <= 0) { setSinglePageIndex(0); return }
    setSinglePageIndex((index) => Math.min(Math.max(0, index), Math.max(0, numPages - 1)))
  }, [numPages])

  // No pre-positioned fields — show error state
  if (templateStored !== null && templateStored.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-lr-bg">
        <SignerAppHeader />
        <main className="flex flex-1 items-center justify-center px-4">
          <SignerStateCard
            tone="muted"
            icon={FileX2}
            kicker="Configuration error"
            title="No fields to sign"
            description="This document has no fields configured. Please contact the sender."
          />
        </main>
        <SignerFooter />
      </div>
    )
  }

  const doSubmit = async () => {
    setLoading(true)
    try {
      const fieldsForPdf =
        templateStored
          ? applySignerValuesToPlacements({
              fields,
              stored: templateStored,
              currentSignerIndex,
              displayName,
              signerTitle: signerInfo.title,
              signatureDataUrl: activeSignatureDataUrl ?? '',
              dateText: fieldPreview.dateText,
            })
          : fields

      const signedPdfBytes = await modifyPdf({
        pdfBytes: new Uint8Array(pdfInput),
        fields: fieldsForPdf,
        signer: signerInfo,
        signatureDataUrl: activeSignatureDataUrl ?? undefined,
        pageDimensions,
        dateText: fieldPreview.dateText,
      })

      const documentHash = await sha256(signedPdfBytes)
      const signedPdfBase64 = uint8ArrayToBase64({ value: signedPdfBytes })

      const response = await fetch('/api/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signer_name: displayName,
          signature_data: activeSignatureDataUrl,
          signed_pdf_base64: signedPdfBase64,
          base_version: baseVersion,
        }),
      })

      if (response.status === 409) {
        setErrorMessage('Another signer just signed this document. Reloading with the latest version...')
        setLoading(false)
        setTimeout(() => router.refresh(), 1500)
        return
      }

      if (!response.ok) {
        const errorPayload = await parseJsonResponse({ response })
        throw new Error(errorPayload.error || 'Failed to sign document')
      }

      const result = await parseJsonResponse({ response })
      setSuccess(true)
      setCompleted(Boolean(result.data?.completed))
      setSubmitHash(documentHash)
      setSubmitFieldCount(fields.length)
      clearFields()

      setTimeout(() => {
        if (result.data?.completed) router.push(`/api/download/${token}`)
      }, 3000)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to sign document. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (guidedSigningEnabled) {
      const pending = getPendingGuideSteps(fields, Boolean(activeSignatureDataUrl))
      if (pending.length > 0 && !guide.started) {
        setErrorMessage('Press Start on the document to begin.')
        return
      }
      if (pending.length > 0) {
        setErrorMessage('Complete every field on the document before signing.')
        return
      }
    }

    if (!activeSignatureDataUrl) { setErrorMessage('Please provide a signature'); return }
    if (!displayName.trim()) { setErrorMessage('Please enter your full name'); return }
    if (!pdfInput.length) { setErrorMessage('Document is not loaded yet'); return }

    if (templateStored) {
      for (const s of templateStored) {
        const idx = resolveSignerIndex(s)
        const isMyField = currentSignerIndex != null ? idx === currentSignerIndex : idx !== null
        if (isMyField && s.type === 'text') {
          const f = fields.find((x) => x.id === s.id)
          if (!f?.value?.trim()) {
            setErrorMessage(`Please fill "${s.label?.trim() || 'Text field'}"`)
            return
          }
        }
      }
    }

    pendingSubmitRef.current = doSubmit
    setShowIntentDialog(true)
  }

  const handleDecline = async (reason: string) => {
    setDeclining(true)
    try {
      const res = await fetch(`/api/sign/${token}/decline`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || null }),
      })
      if (res.ok) {
        router.push(`/sign/${token}/declined`)
      } else {
        const body = await res.json().catch(() => ({}))
        setErrorMessage((body as { error?: string }).error ?? 'Failed to decline. Please try again.')
        setShowDeclineDialog(false)
      }
    } catch {
      setErrorMessage('Network error. Please try again.')
      setShowDeclineDialog(false)
    } finally {
      setDeclining(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col bg-lr-bg">
        <SignerAppHeader subtitle="Signing complete" />
        <main className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="mx-auto w-full max-w-3xl">
            <SignerStepper currentStep={3} done />
            <SigningCompletePanel
              signerName={displayName}
              fieldCount={submitFieldCount}
              signedAt={new Date().toISOString()}
              documentHash={submitHash}
              downloadUrl={`/api/download/${token}`}
              fileName={documentTitle}
              onReset={() => router.refresh()}
            />
          </div>
        </main>
        <SignerFooter />
      </div>
    )
  }

  // Initials for avatar disc
  const initials = [signerInfo.firstName[0], signerInfo.lastName[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || displayName.slice(0, 2).toUpperCase()


  const pdfColumn = (
    <PdfColumn
      ref={pdfColumnRef}
      viewerContainerRef={viewerContainerRef}
      pdfDataForViewer={pdfDataForViewer}
      numPages={numPages}
      scale={scale}
      setScale={setScale}
      handleDocumentLoadSuccess={handleDocumentLoadSuccess}
      setPageDimension={setPageDimension}
      pageMode={pageMode}
      viewerPageIndex={viewerPageIndex}
      fields={fields}
      selectedFieldType={null}
      onAddField={() => {}}
      onUpdateField={updateField}
      onRemoveField={() => {}}
      preview={fieldPreview}
      readOnly
      onPageTextContent={handlePageTextContent}
      textLinesByPage={textLinesByPage}
      isLoading={isLoading}
      pdfErrorMessage={pdfErrorMessage}
      onPageChange={(pageIndex) => {
        if (isScrollMode) scrollToPage(pageIndex)
        else setSinglePageIndex(pageIndex)
      }}
      guided={guidedSigningEnabled}
      guideStarted={guide.started}
      activeFieldId={guide.activeFieldId}
      isGuideComplete={guide.isGuideComplete}
      onGuideStart={guide.start}
      onGuideNext={handleGuideNext}
      onSignatureFieldClick={guidedSigningEnabled ? handleSignatureFieldClick : undefined}
    />
  )

  const headerToolbarActions = (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-lr-muted hover:text-lr-text"
        aria-label="Download document"
        onClick={() => {
          window.open(`/api/download/${token}`, '_blank', 'noopener,noreferrer')
        }}
      >
        <Download className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-lr-muted hover:text-lr-text"
        aria-label="Print"
        onClick={() => window.print()}
      >
        <Printer className="size-4" />
      </Button>
    </>
  )

  return (
    <>
      <IntentConfirmDialog
        open={showIntentDialog}
        onConfirm={() => {
          setShowIntentDialog(false)
          if (pendingSubmitRef.current) pendingSubmitRef.current()
        }}
        onCancel={() => {
          setShowIntentDialog(false)
          pendingSubmitRef.current = null
        }}
      />
      <DeclineDialog
        open={showDeclineDialog}
        documentTitle={documentTitle}
        declining={declining}
        onDecline={handleDecline}
        onCancel={() => setShowDeclineDialog(false)}
      />

      {guidedSigningEnabled && (
        <SignatureModal
          open={signatureModalOpen}
          onOpenChange={setSignatureModalOpen}
          displayName={displayName}
          onAccept={(url) => setActiveSignatureDataUrl(url)}
        />
      )}

      <div className="flex min-h-screen flex-col bg-lr-bg">
        <SignerAppHeader subtitle="Secure signing session" actions={headerToolbarActions} />

        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <SignerStepper currentStep={3} />

            {/* Document header card */}
            <div className="mb-4 rounded-lr-lg border border-lr-border bg-lr-surface px-5 py-4 shadow-lr-card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-kicker text-lr-accent mb-1">Signing Session</p>
                  <h1 className="text-page-title text-lr-text truncate">{documentTitle}</h1>
                  <div className="mt-3 flex flex-wrap items-center gap-6">
                    <div>
                      <p className="text-kicker text-lr-muted mb-1">Signer</p>
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lr-accent/20 font-display text-xs font-semibold text-lr-accent">
                          {initials}
                        </span>
                        <div>
                          <p className="text-body text-lr-text leading-tight">{displayName}</p>
                          <p className="text-caption text-lr-muted">{signerEmail}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-start">
                  <div className="flex items-center gap-1.5 rounded-full border border-lr-border bg-lr-surface-2 px-2.5 py-1">
                    <Lock size={10} className="text-lr-muted" />
                    <span className="text-micro text-lr-muted">Secure session</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDeclineDialog(true)}
                    aria-label="Decline to sign this document"
                    className="text-caption text-lr-muted underline-offset-2 hover:text-lr-error hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lr-accent rounded transition-colors duration-lr-fast"
                  >
                    Decline to sign
                  </button>
                </div>
              </div>
            </div>

            {isNarrow ? (
              <MobileWizardShell
                mobileWizardStep={mobileWizardStep}
                setMobileWizardStep={setMobileWizardStep}
                pdfColumn={pdfColumn}
                templateStored={templateStored}
                fields={fields}
                updateField={updateField}
                signerInfo={signerInfo}
                onSignerInfoChange={setSignerInfo}
                displayName={displayName}
                activeSignatureDataUrl={activeSignatureDataUrl}
                onSignatureDataUrl={setActiveSignatureDataUrl}
                errorMessage={errorMessage}
                loading={loading}
                completed={completed}
                onSubmit={handleSubmit}
                signerIndex={currentSignerIndex}
                guided={guidedSigningEnabled}
                guideStarted={guide.started}
                guidePendingCount={guide.pendingCount}
                isGuideComplete={guide.isGuideComplete}
                activeTextFieldId={
                  guide.currentStep?.kind === 'text' ? guide.currentStep.fieldId : null
                }
              />
            ) : (
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                {pdfColumn}
                <SigningControlsSidebar
                  templateStored={templateStored}
                  fields={fields}
                  updateField={updateField}
                  signerInfo={signerInfo}
                  onSignerInfoChange={setSignerInfo}
                  displayName={displayName}
                  activeSignatureDataUrl={activeSignatureDataUrl}
                  onSignatureDataUrl={setActiveSignatureDataUrl}
                  errorMessage={errorMessage}
                  loading={loading}
                  completed={completed}
                  onSubmit={handleSubmit}
                  signerIndex={currentSignerIndex}
                  guided={guidedSigningEnabled}
                  guideStarted={guide.started}
                  guidePendingCount={guide.pendingCount}
                  isGuideComplete={guide.isGuideComplete}
                  activeTextFieldId={
                    guide.currentStep?.kind === 'text' ? guide.currentStep.fieldId : null
                  }
                />
              </div>
            )}
          </div>
        </div>

        <SignerFooter />
      </div>
    </>
  )
}

function base64ToUint8Array({ value }: { value: string }) {
  if (typeof window === 'undefined') return new Uint8Array()
  const binaryString = window.atob(value)
  const bytes = new Uint8Array(binaryString.length)
  for (let index = 0; index < binaryString.length; index += 1)
    bytes[index] = binaryString.charCodeAt(index)
  return bytes
}

function uint8ArrayToBase64({ value }: { value: Uint8Array }) {
  if (typeof window === 'undefined') return ''
  let binaryString = ''
  for (let index = 0; index < value.length; index += 1)
    binaryString += String.fromCharCode(value[index])
  return window.btoa(binaryString)
}

async function parseJsonResponse({ response }: { response: Response }) {
  const text = await response.text()
  if (!text) return {}
  try { return JSON.parse(text) }
  catch { throw new Error('Invalid server response while signing the document') }
}
