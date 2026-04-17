'use client'

import { useEffect, useState, type RefObject, type ReactNode } from 'react'
import { FieldOverlay, PdfPageNavigator, PdfViewer } from '@drvillo/react-browser-e-signing'
import type { FieldPlacement, FieldType, PdfTextContent, SignatureFieldPreview, TextLine } from '@drvillo/react-browser-e-signing'

const LOAD_WATCHDOG_MS = 6000

export interface PdfColumnProps {
  viewerContainerRef: RefObject<HTMLDivElement | null>
  pdfDataForViewer: ArrayBuffer | null
  numPages: number
  scale: number
  setScale: (next: number) => void
  handleDocumentLoadSuccess: (loadedPages: number) => void
  setPageDimension: (pageIndex: number, widthPt: number, heightPt: number) => void
  pageMode: 'scroll' | 'single'
  viewerPageIndex: number
  renderToolbarExtra?: () => ReactNode
  fields: FieldPlacement[]
  selectedFieldType: FieldType | null
  onAddField: (input: {
    pageIndex: number
    type: FieldType
    xPercent: number
    yPercent: number
  }) => void
  onUpdateField: (fieldId: string, partial: Partial<FieldPlacement>) => void
  onRemoveField: (fieldId: string) => void
  preview: SignatureFieldPreview
  readOnly?: boolean
  onPageTextContent?: (pageIndex: number, textContent: PdfTextContent) => void
  textLinesByPage?: Map<number, TextLine[]>
  isLoading: boolean
  pdfErrorMessage: string | null
  onPageChange: (pageIndex: number) => void
}

export function PdfColumn({
  viewerContainerRef,
  pdfDataForViewer,
  numPages,
  scale,
  setScale,
  handleDocumentLoadSuccess,
  setPageDimension,
  pageMode,
  viewerPageIndex,
  renderToolbarExtra,
  fields,
  selectedFieldType,
  onAddField,
  onUpdateField,
  onRemoveField,
  preview,
  readOnly = false,
  onPageTextContent,
  textLinesByPage,
  isLoading,
  pdfErrorMessage,
  onPageChange,
}: PdfColumnProps) {
  const hasLoaded = numPages > 0
  const stuck = useLoadWatchdog({
    armed: !!pdfDataForViewer && !hasLoaded && !pdfErrorMessage,
    timeoutMs: LOAD_WATCHDOG_MS,
    resetKey: pdfDataForViewer,
  })

  return (
    <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-3 shadow-lr-card sm:p-4">
      <div ref={viewerContainerRef} className="h-[70vh] overflow-auto">
        <PdfViewer
          pdfData={pdfDataForViewer}
          numPages={numPages}
          scale={scale}
          onScaleChange={setScale}
          onDocumentLoadSuccess={handleDocumentLoadSuccess}
          onPageDimensions={({ pageIndex, widthPt, heightPt }) =>
            setPageDimension(pageIndex, widthPt, heightPt)
          }
          pageMode={pageMode}
          currentPageIndex={viewerPageIndex}
          onPageTextContent={onPageTextContent}
          renderToolbarContent={() => (
            <div className="flex flex-wrap items-center gap-3">
              <PdfPageNavigator
                currentPageIndex={viewerPageIndex}
                numPages={numPages}
                onPageChange={onPageChange}
              />
              {renderToolbarExtra?.()}
            </div>
          )}
          renderOverlay={(pageIndex) => (
            <FieldOverlay
              pageIndex={pageIndex}
              fields={fields}
              selectedFieldType={selectedFieldType}
              onAddField={onAddField}
              onUpdateField={onUpdateField}
              onRemoveField={onRemoveField}
              preview={preview}
              readOnly={readOnly}
              textLines={textLinesByPage?.get(pageIndex)}
            />
          )}
        />
      </div>
      {isLoading && !stuck && <p className="text-caption mt-3">Loading document preview...</p>}
      {pdfErrorMessage && <p className="text-caption mt-3 text-lr-error">{pdfErrorMessage}</p>}
      {stuck && !pdfErrorMessage && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lr border border-lr-border bg-lr-bg p-3">
          <p className="text-caption text-lr-error">
            PDF preview failed to load. This is usually a stale browser worker or service worker.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="shrink-0 rounded-lr border border-lr-border bg-lr-surface px-3 py-1.5 text-lr-sm font-medium text-lr-text hover:bg-lr-surface-2"
          >
            Reload
          </button>
        </div>
      )}
    </div>
  )
}

function useLoadWatchdog({
  armed,
  timeoutMs,
  resetKey,
}: {
  armed: boolean
  timeoutMs: number
  resetKey: unknown
}) {
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    setStuck(false)
    if (!armed) return

    const handle = window.setTimeout(() => setStuck(true), timeoutMs)
    return () => window.clearTimeout(handle)
  }, [armed, timeoutMs, resetKey])

  return stuck
}
