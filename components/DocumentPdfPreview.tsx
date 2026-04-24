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
import { Maximize2, Minimize2 } from 'lucide-react'
import { useFitToWidth } from '@/hooks/useFitToWidth'

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
  const [expanded, setExpanded] = useState(false)
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

  useFitToWidth(viewerContainerRef, pageDimensions[0]?.widthPt, setScale, { paddingPx: 24 })

  const isLoading = isFetching || isPdfLoading

  return (
    <div className="flex flex-col">
      {errorMessage && (
        <div className="rounded-lr border border-lr-error/30 bg-lr-error-dim px-4 py-3 text-caption text-lr-error">
          {errorMessage}
        </div>
      )}

      {!errorMessage && isLoading && (
        <div className="flex h-[640px] items-center justify-center rounded-lr border border-lr-border bg-lr-surface text-caption text-lr-muted animate-pulse xl:h-[720px]">
          Loading PDF preview…
        </div>
      )}

      {!errorMessage && !isLoading && pdfData && (
        <>
          <div
            ref={viewerContainerRef}
            className={
              expanded
                ? 'overflow-x-hidden overflow-y-visible rounded-lr border border-lr-border bg-lr-bg'
                : 'h-[640px] overflow-y-auto overflow-x-hidden rounded-lr border border-lr-border bg-lr-bg xl:h-[720px]'
            }
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
            />
          </div>
          <div className="flex justify-center border-t border-lr-border py-3">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1.5 rounded-lr border border-lr-border bg-lr-bg px-3 py-1.5 text-caption font-medium text-lr-muted transition-colors hover:border-lr-accent hover:text-lr-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lr-accent"
            >
              {expanded ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" />
                  Collapse
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" />
                  Expand full document
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
