'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FieldPalette,
  SigningComplete,
  modifyPdf,
  sha256,
  useFieldPlacement,
  usePdfDocument,
  usePdfPageVisibility,
  usePdfTextLines,
  useSignatureRenderer,
} from '@drvillo/react-browser-e-signing'

import '@/lib/esigning/configure-client'

import type { FieldType, SignatureStyle, SignerInfo } from '@drvillo/react-browser-e-signing'

import { MobileWizardShell } from '@/components/signing/MobileWizardShell'
import { PdfColumn } from '@/components/signing/PdfColumn'
import { SigningControlsSidebar } from '@/components/signing/SigningControlsSidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  applySignerValuesToPlacements,
  hydrateForSigner,
  parseFieldMetadataJson,
  resolveSignerIndex,
} from '@/lib/field-metadata'
import { useNarrowSigningLayout } from '@/hooks/useSigningState'

type MobileWizardStep = 1 | 2 | 3

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

  const templateStored = useMemo(() => {
    if (!initialFieldsJson?.trim()) return null
    try {
      return parseFieldMetadataJson(initialFieldsJson)
    } catch {
      return null
    }
  }, [initialFieldsJson])

  const templateMode = Boolean(templateStored && templateStored.length > 0)

  const currentSignerIndex = signerIndex ?? null

  const placementOptions = useMemo(() => {
    if (!templateStored?.length) return {}
    return { initialFields: hydrateForSigner(templateStored, currentSignerIndex) }
  }, [templateStored, currentSignerIndex])

  const { fields, addField, updateField, removeField, clearFields } =
    useFieldPlacement(placementOptions)

  const [selectedFieldType, setSelectedFieldType] = useState<FieldType | null>('signature')
  const [signatureStyle, setSignatureStyle] = useState<SignatureStyle>({
    mode: 'typed',
    fontFamily: 'Caveat',
  })
  const [drawnSignatureDataUrl, setDrawnSignatureDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitHash, setSubmitHash] = useState<string>('')
  const [submitFieldCount, setSubmitFieldCount] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [signerInfo, setSignerInfo] = useState<SignerInfo>(() => {
    const [firstName = '', ...rest] = signerName.trim().split(' ')
    return {
      firstName,
      lastName: rest.join(' '),
      title: '',
    }
  })

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

  const displayName = useMemo(() => {
    const composed = `${signerInfo.firstName} ${signerInfo.lastName}`.trim()
    return composed || signerName
  }, [signerInfo.firstName, signerInfo.lastName, signerName])

  const { signatureDataUrl: typedSignatureDataUrl, isRendering } = useSignatureRenderer({
    signerName: displayName,
    style: signatureStyle,
  })

  const activeSignatureDataUrl =
    signatureStyle.mode === 'drawn'
      ? signatureStyle.dataUrl || drawnSignatureDataUrl
      : typedSignatureDataUrl

  const fieldPreview = useMemo(
    () => ({
      signatureDataUrl: activeSignatureDataUrl,
      fullName: displayName,
      title: signerInfo.title,
      dateText: new Date().toLocaleDateString(),
    }),
    [activeSignatureDataUrl, displayName, signerInfo.title]
  )

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
    if (numPages <= 0) {
      setSinglePageIndex(0)
      return
    }
    setSinglePageIndex((index) => Math.min(Math.max(0, index), Math.max(0, numPages - 1)))
  }, [numPages])

  const showFieldPalette = !templateMode

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!activeSignatureDataUrl) {
      setErrorMessage('Please provide a signature')
      return
    }

    if (!displayName.trim()) {
      setErrorMessage('Please enter your full name')
      return
    }

    if (!pdfInput.length) {
      setErrorMessage('Document is not loaded yet')
      return
    }

    if (!templateMode && !fields.length) {
      setErrorMessage('Please place at least one field on the document')
      return
    }

    if (templateMode && templateStored) {
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

    setLoading(true)

    try {
      const fieldsForPdf =
        templateMode && templateStored
          ? applySignerValuesToPlacements({
              fields,
              stored: templateStored,
              currentSignerIndex,
              displayName,
              signerTitle: signerInfo.title,
              signatureDataUrl: activeSignatureDataUrl,
              dateText: fieldPreview.dateText,
            })
          : fields

      const signedPdfBytes = await modifyPdf({
        pdfBytes: new Uint8Array(pdfInput),
        fields: fieldsForPdf,
        signer: signerInfo,
        signatureDataUrl: activeSignatureDataUrl,
        pageDimensions,
        dateText: fieldPreview.dateText,
      })

      const documentHash = await sha256(signedPdfBytes)
      const signedPdfBase64 = uint8ArrayToBase64({ value: signedPdfBytes })

      const response = await fetch('/api/signatures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          signer_name: displayName,
          signature_data: activeSignatureDataUrl,
          signed_pdf_base64: signedPdfBase64,
          base_version: baseVersion,
        }),
      })

      if (response.status === 409) {
        // Another signer committed a signature between our page load and submit.
        // Refresh the RSC page so we re-render with the current latest_signed_pdf_path
        // and a fresh baseVersion; the signer then re-signs on top of the new state.
        setErrorMessage(
          'Another signer just signed this document. Reloading with the latest version...'
        )
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
        if (result.data?.completed) {
          router.push(`/api/download/${token}`)
        }
      }, 3000)
    } catch (error) {
      console.error('Signing error:', error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to sign document. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-10">
        <SigningComplete
          signerName={displayName}
          fieldCount={submitFieldCount}
          signedAt={new Date().toISOString()}
          documentHash={submitHash}
          downloadUrl={`/api/download/${token}`}
          fileName={documentTitle}
          onReset={() => router.refresh()}
        />
      </div>
    )
  }

  const secondaryNavButtonClass =
    'w-full rounded-lr border border-lr-border bg-lr-surface px-4 py-2.5 text-lr-sm font-medium text-lr-text hover:bg-lr-surface-2'
  const primaryNavButtonClass =
    'w-full rounded-lr bg-lr-accent px-4 py-2.5 text-lr-sm font-medium text-white hover:bg-lr-accent-hover'

  const pdfColumn = (
    <PdfColumn
      viewerContainerRef={viewerContainerRef}
      pdfDataForViewer={pdfDataForViewer}
      numPages={numPages}
      scale={scale}
      setScale={setScale}
      handleDocumentLoadSuccess={handleDocumentLoadSuccess}
      setPageDimension={setPageDimension}
      pageMode={pageMode}
      viewerPageIndex={viewerPageIndex}
      renderToolbarExtra={() =>
        isNarrow && showFieldPalette ? (
          <FieldPalette
            selectedFieldType={selectedFieldType}
            onSelectFieldType={setSelectedFieldType}
          />
        ) : null
      }
      fields={fields}
      selectedFieldType={selectedFieldType}
      onAddField={(input) => {
        addField(input)
      }}
      onUpdateField={updateField}
      onRemoveField={removeField}
      preview={fieldPreview}
      readOnly={templateMode}
      onPageTextContent={handlePageTextContent}
      textLinesByPage={textLinesByPage}
      isLoading={isLoading}
      pdfErrorMessage={pdfErrorMessage}
      onPageChange={(pageIndex) => {
        if (isScrollMode) scrollToPage(pageIndex)
        else setSinglePageIndex(pageIndex)
      }}
    />
  )

  return (
    <div className="relative min-h-screen bg-lr-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-4 rounded-lr-lg border border-lr-border bg-lr-surface px-5 py-4 shadow-lr-card">
          <h1 className="text-page-title sm:text-2xl">{documentTitle}</h1>
          <p className="text-body mt-1">
            Signing as <strong>{displayName}</strong> ({signerEmail})
          </p>
        </div>

        {isNarrow ? (
          <MobileWizardShell
            mobileWizardStep={mobileWizardStep}
            setMobileWizardStep={setMobileWizardStep}
            pdfColumn={pdfColumn}
            templateMode={templateMode}
            templateStored={templateStored}
            fields={fields}
            updateField={updateField}
            signerInfo={signerInfo}
            onSignerInfoChange={setSignerInfo}
            showFieldPalette={showFieldPalette}
            selectedFieldType={selectedFieldType}
            onSelectFieldType={setSelectedFieldType}
            displayName={displayName}
            signatureStyle={signatureStyle}
            activeSignatureDataUrl={activeSignatureDataUrl}
            isRendering={isRendering}
            onSignatureStyleChange={setSignatureStyle}
            onDrawnSignature={(signatureDataUrl) => {
              setDrawnSignatureDataUrl(signatureDataUrl)
              setSignatureStyle({ mode: 'drawn', dataUrl: signatureDataUrl })
            }}
            errorMessage={errorMessage}
            loading={loading}
            completed={completed}
            onSubmit={handleSubmit}
            primaryNavButtonClass={primaryNavButtonClass}
            secondaryNavButtonClass={secondaryNavButtonClass}
            signerIndex={currentSignerIndex}
          />
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            {pdfColumn}
            <SigningControlsSidebar
              templateMode={templateMode}
              templateStored={templateStored}
              fields={fields}
              updateField={updateField}
              signerInfo={signerInfo}
              onSignerInfoChange={setSignerInfo}
              showFieldPalette={showFieldPalette}
              selectedFieldType={selectedFieldType}
              onSelectFieldType={setSelectedFieldType}
              displayName={displayName}
              signatureStyle={signatureStyle}
              activeSignatureDataUrl={activeSignatureDataUrl}
              isRendering={isRendering}
              onSignatureStyleChange={setSignatureStyle}
              onDrawnSignature={(signatureDataUrl) => {
                setDrawnSignatureDataUrl(signatureDataUrl)
                setSignatureStyle({ mode: 'drawn', dataUrl: signatureDataUrl })
              }}
              errorMessage={errorMessage}
              loading={loading}
              completed={completed}
              onSubmit={handleSubmit}
              signerIndex={currentSignerIndex}
            />
          </div>
        )}
      </div>
    </div>
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

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Invalid server response while signing the document')
  }
}
