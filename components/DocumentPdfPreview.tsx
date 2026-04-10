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
    pageDimensions,
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

  useEffect(() => {
    const viewerContainer = viewerContainerRef.current
    const firstPageWidth = pageDimensions[0]?.widthPt

    if (!viewerContainer || !firstPageWidth) return

    function setFitToWidthScale() {
      const horizontalPaddingPx = 24
      const container = viewerContainerRef.current
      if (!container) return

      const availableWidth = container.clientWidth - horizontalPaddingPx
      if (availableWidth <= 0) return

      const computedScale = Number((availableWidth / firstPageWidth).toFixed(2))
      if (!Number.isFinite(computedScale) || computedScale <= 0) return

      const clampedScale = Math.min(2, Math.max(0.25, computedScale))
      setScale((previousScale) =>
        Math.abs(previousScale - clampedScale) < 0.01 ? previousScale : clampedScale
      )
    }

    setFitToWidthScale()

    if (typeof ResizeObserver === 'undefined') return

    const resizeObserver = new ResizeObserver(() => {
      setFitToWidthScale()
    })

    resizeObserver.observe(viewerContainer)

    return () => {
      resizeObserver.disconnect()
    }
  }, [pageDimensions, setScale])

  const isLoading = isFetching || isPdfLoading

  return (
    <div className="lr-panel p-6">
      <p className="lr-label">Presentation frame</p>
      <h2 className="font-display mt-2 text-xl font-semibold text-white">Document preview</h2>

      {errorMessage && (
        <div className="mt-4 rounded-[14px] border border-[rgba(255,141,151,0.3)] bg-[rgba(255,141,151,0.08)] p-4 text-sm text-[var(--lr-danger)]">
          {errorMessage}
        </div>
      )}

      {!errorMessage && isLoading && (
        <div className="mt-4 flex h-[640px] items-center justify-center rounded-[16px] border border-[rgba(193,178,255,0.12)] bg-[rgba(255,255,255,0.03)] text-sm text-[var(--lr-text-soft)]">
          Loading PDF preview...
        </div>
      )}

      {!errorMessage && !isLoading && pdfData && (
        <div
          ref={viewerContainerRef}
          className="mt-4 h-[640px] overflow-y-auto overflow-x-hidden rounded-[16px] border border-[rgba(193,178,255,0.12)] bg-[rgba(7,9,18,0.42)]"
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
