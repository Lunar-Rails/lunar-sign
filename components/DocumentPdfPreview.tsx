'use client'

import {
  FieldOverlay,
  PdfPageNavigator,
  PdfViewer,
  usePdfDocument,
  usePdfPageVisibility,
} from '@drvillo/react-browser-e-signing'
import '@drvillo/react-browser-e-signing/styles.css'
import '@/lib/esigning/configure-client'

import { useEffect, useMemo, useRef, useState } from 'react'

import type { StoredField } from '@/lib/types'
import { hydrateForSigner } from '@/lib/field-metadata'

interface DocumentPdfPreviewProps {
  documentId: string
  fieldMetadata?: StoredField[] | null
}

const noopAdd = () => {}
const noopRemove = () => {}

const emptyPreview = {
  signatureDataUrl: null,
  fullName: '',
  title: '',
  dateText: '',
}

export default function DocumentPdfPreview({
  documentId,
  fieldMetadata,
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

  const fieldPlacements = useMemo(
    () => (fieldMetadata && fieldMetadata.length > 0 ? hydrateForSigner(fieldMetadata) : []),
    [fieldMetadata]
  )

  useEffect(() => {
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
    <div className="flex h-full flex-col">
      {errorMessage && (
        <div className="rounded-lr border border-lr-error/30 bg-lr-error-dim px-4 py-3 text-caption text-lr-error">
          {errorMessage}
        </div>
      )}

      {!errorMessage && isLoading && (
        <div className="flex flex-1 items-center justify-center rounded-lr border border-lr-border bg-lr-surface text-caption text-lr-muted animate-pulse">
          Loading PDF preview…
        </div>
      )}

      {!errorMessage && !isLoading && pdfData && (
        <div
          ref={viewerContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden rounded-lr border border-lr-border bg-lr-bg"
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
            renderOverlay={
              fieldPlacements.length > 0
                ? (pageIndex) => (
                    <FieldOverlay
                      pageIndex={pageIndex}
                      fields={fieldPlacements}
                      selectedFieldType={null}
                      onAddField={noopAdd}
                      onUpdateField={() => {}}
                      onRemoveField={noopRemove}
                      preview={emptyPreview}
                      readOnly
                    />
                  )
                : undefined
            }
            className="h-full"
          />
        </div>
      )}
    </div>
  )
}
