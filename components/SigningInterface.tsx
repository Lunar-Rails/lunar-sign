'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FieldOverlay,
  FieldPalette,
  PdfPageNavigator,
  PdfViewer,
  SignaturePad,
  SignaturePreview,
  SignerDetailsPanel,
  SigningComplete,
  modifyPdf,
  sha256,
  useFieldPlacement,
  usePdfDocument,
  usePdfPageVisibility,
  useSignatureRenderer,
} from '@drvillo/react-browser-e-signing'

import { ensureESigningConfigured } from '@/lib/esigning/configure-client'

import type {
  FieldType,
  SignatureStyle,
  SignerInfo,
} from '@drvillo/react-browser-e-signing'

interface SigningInterfaceProps {
  token: string
  signerName: string
  signerEmail: string
  documentTitle: string
  pdfBase64: string
}

export default function SigningInterface({
  token,
  signerName,
  signerEmail,
  documentTitle,
  pdfBase64,
}: SigningInterfaceProps) {
  const router = useRouter()
  const viewerContainerRef = useRef<HTMLDivElement | null>(null)

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
    pdfData,
    numPages,
    scale,
    setScale,
    pageDimensions,
    setPageDimension,
    handleDocumentLoadSuccess,
    isLoading,
    errorMessage: pdfErrorMessage,
  } = usePdfDocument(pdfInput)

  const { fields, addField, updateField, removeField, clearFields } = useFieldPlacement()
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

  useEffect(() => {
    ensureESigningConfigured()
  }, [])

  // Handle form submission
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

    if (!fields.length) {
      setErrorMessage('Please place at least one field on the document')
      return
    }

    setLoading(true)

    try {
      const signedPdfBytes = await modifyPdf({
        pdfBytes: new Uint8Array(pdfInput),
        fields,
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
        }),
      })

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

      // Redirect after 3 seconds
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

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-4 rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
            {documentTitle}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Signing as <strong>{displayName}</strong> ({signerEmail})
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <div ref={viewerContainerRef} className="h-[70vh] overflow-auto">
              <PdfViewer
                pdfData={pdfData}
                numPages={numPages}
                scale={scale}
                onScaleChange={setScale}
                onDocumentLoadSuccess={handleDocumentLoadSuccess}
                onPageDimensions={({ pageIndex, widthPt, heightPt }) =>
                  setPageDimension(pageIndex, widthPt, heightPt)
                }
                pageMode="scroll"
                currentPageIndex={currentPageIndex}
                renderToolbarContent={() => (
                  <div className="flex flex-wrap items-center gap-3">
                    <PdfPageNavigator
                      currentPageIndex={currentPageIndex}
                      numPages={numPages}
                      onPageChange={scrollToPage}
                    />
                    <FieldPalette
                      selectedFieldType={selectedFieldType}
                      onSelectFieldType={setSelectedFieldType}
                    />
                  </div>
                )}
                renderOverlay={(pageIndex) => (
                  <FieldOverlay
                    pageIndex={pageIndex}
                    fields={fields}
                    selectedFieldType={selectedFieldType}
                    onAddField={addField}
                    onUpdateField={updateField}
                    onRemoveField={removeField}
                    preview={fieldPreview}
                  />
                )}
              />
            </div>
            {isLoading && (
              <p className="mt-3 text-sm text-gray-500">Loading document preview...</p>
            )}
            {pdfErrorMessage && (
              <p className="mt-3 text-sm text-red-600">{pdfErrorMessage}</p>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <SignerDetailsPanel
                signerInfo={signerInfo}
                onSignerInfoChange={setSignerInfo}
              />
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <SignaturePreview
                signerName={displayName}
                style={signatureStyle}
                signatureDataUrl={activeSignatureDataUrl}
                isRendering={isRendering}
                onStyleChange={setSignatureStyle}
              />
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <SignaturePad
                onDrawn={(signatureDataUrl) => {
                  setDrawnSignatureDataUrl(signatureDataUrl)
                  setSignatureStyle({ mode: 'drawn', dataUrl: signatureDataUrl })
                }}
              />
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                <p className="text-sm text-gray-600">
                  Place required fields, confirm signer details, then submit the signed
                  document.
                </p>
                {errorMessage && (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {errorMessage}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {loading ? 'Signing...' : 'Sign Document'}
                </button>
                {completed && (
                  <p className="text-xs text-gray-500">
                    All signers completed. Redirecting to download...
                  </p>
                )}
              </form>
            </div>
          </aside>
        </div>
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
