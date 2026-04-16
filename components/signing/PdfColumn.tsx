'use client'

import type { RefObject } from 'react'
import type { ReactNode } from 'react'
import { FieldOverlay, PdfPageNavigator, PdfViewer } from '@drvillo/react-browser-e-signing'
import type { FieldPlacement, FieldType, PdfTextContent, SignatureFieldPreview, TextLine } from '@drvillo/react-browser-e-signing'

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
      {isLoading && <p className="text-caption mt-3">Loading document preview...</p>}
      {pdfErrorMessage && <p className="text-caption mt-3 text-lr-error">{pdfErrorMessage}</p>}
    </div>
  )
}
