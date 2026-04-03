'use client'

import {
  PdfPageNavigator,
  PdfViewer,
  configure,
  usePdfDocument,
  usePdfPageVisibility,
} from '@drvillo/react-browser-e-signing'
import { getPdfWorkerSrc } from '@drvillo/react-browser-e-signing/worker'
import '@drvillo/react-browser-e-signing/styles.css'

import { useEffect, useRef, useState } from 'react'

interface DocumentPdfPreviewProps {
  documentId: string
}

let isPdfWorkerConfigured = false

function ensurePdfWorkerConfiguration() {
  if (isPdfWorkerConfigured) return
  configure({ pdfWorkerSrc: getPdfWorkerSrc() })
  isPdfWorkerConfigured = true
}

export default function DocumentPdfPreview({
  documentId,
}: DocumentPdfPreviewProps) {
  const [pdfInput, setPdfInput] = useState<ArrayBuffer | null>(null)
  const [isFetching, setIsFetching] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const viewerContainerRef = useRef<HTMLDivElement | null>(null)

  const {
    pdfData,
    numPages,
    scale,
    setScale,
    setPageDimension,
    handleDocumentLoadSuccess,
    isLoading: isPdfLoading,
  } = usePdfDocument(pdfInput)

  const { currentPageIndex, scrollToPage } = usePdfPageVisibility({
    containerRef: viewerContainerRef,
    numPages,
  })

  useEffect(() => {
    ensurePdfWorkerConfiguration()

    const controller = new AbortController()

    async function fetchPdfPreview() {
      setIsFetching(true)
      setErrorMessage(null)

      try {
        const response = await fetch(`/api/documents/${documentId}/preview`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!response.ok) {
          let message = 'Unable to load PDF preview'
          try {
            const body = await response.json()
            if (body?.error) message = body.error
          } catch {
            // Keep default message when body isn't JSON
          }

          throw new Error(message)
        }

        const buffer = await response.arrayBuffer()
        setPdfInput(buffer)
      } catch (error) {
        if (controller.signal.aborted) return
        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load PDF preview'
        )
      } finally {
        if (!controller.signal.aborted) setIsFetching(false)
      }
    }

    fetchPdfPreview()

    return () => {
      controller.abort()
    }
  }, [documentId])

  const isLoading = isFetching || isPdfLoading

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Document Preview</h2>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {!errorMessage && isLoading && (
        <div className="flex h-[640px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-600">
          Loading PDF preview...
        </div>
      )}

      {!errorMessage && !isLoading && pdfData && (
        <div
          ref={viewerContainerRef}
          className="h-[640px] overflow-auto rounded-lg border border-gray-200 bg-white"
        >
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
              <PdfPageNavigator
                currentPageIndex={currentPageIndex}
                numPages={numPages}
                onPageChange={scrollToPage}
              />
            )}
            className="h-full"
          />
        </div>
      )}
    </div>
  )
}
