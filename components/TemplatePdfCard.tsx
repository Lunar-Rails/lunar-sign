'use client'

import type { RefObject, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FieldOverlay,
  PdfPageNavigator,
  PdfViewer,
  usePdfDocument,
  usePdfPageVisibility,
} from '@drvillo/react-browser-e-signing'
import type {
  FieldPlacement,
  FieldType,
  SignatureFieldPreview,
} from '@drvillo/react-browser-e-signing'

import { ensureESigningConfigured } from '@/lib/esigning/configure-client'
import { hydrateForSigner } from '@/lib/field-metadata'
import type { StoredField } from '@/lib/types'

const noopAdd = () => {
  /* placement disabled */
}
const noopRemove = () => {
  /* removal disabled */
}

export interface TemplatePdfCardProps {
  /** Card header title (matches document detail "Document Preview" token) */
  title?: string
  viewerContainerRef: RefObject<HTMLDivElement | null>
  pdfDataForViewer: ArrayBuffer | null
  numPages: number
  scale: number
  setScale: (next: number) => void
  handleDocumentLoadSuccess: (loadedPages: number) => void
  setPageDimension: (pageIndex: number, widthPt: number, heightPt: number) => void
  currentPageIndex: number
  onPageChange: (pageIndex: number) => void
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
  isLoading: boolean
  pdfErrorMessage: string | null
  loadError?: string | null
  renderToolbarExtra?: () => ReactNode
  className?: string
}

export function TemplatePdfCard({
  title = 'PDF preview',
  viewerContainerRef,
  pdfDataForViewer,
  numPages,
  scale,
  setScale,
  handleDocumentLoadSuccess,
  setPageDimension,
  currentPageIndex,
  onPageChange,
  fields,
  selectedFieldType,
  onAddField,
  onUpdateField,
  onRemoveField,
  preview,
  readOnly = false,
  isLoading,
  pdfErrorMessage,
  loadError = null,
  renderToolbarExtra,
  className,
}: TemplatePdfCardProps) {
  const rootClass = className
    ? `rounded-lr-lg border border-lr-border bg-lr-surface shadow-lr-card overflow-hidden ${className}`
    : 'rounded-lr-lg border border-lr-border bg-lr-surface shadow-lr-card overflow-hidden'

  return (
    <div className={rootClass}>
      <div className="border-b border-lr-border px-4 py-3">
        <h2 className="text-card-title">{title}</h2>
      </div>
      {loadError && (
        <div className="border-b border-lr-border px-4 py-2">
          <p className="text-lr-sm text-lr-error">{loadError}</p>
        </div>
      )}
      <div className="h-[640px] xl:h-[720px] p-4">
        <div ref={viewerContainerRef} className="h-full overflow-auto">
          <PdfViewer
            pdfData={pdfDataForViewer}
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
                onAddField={readOnly ? noopAdd : onAddField}
                onUpdateField={onUpdateField}
                onRemoveField={readOnly ? noopRemove : onRemoveField}
                preview={preview}
                readOnly={readOnly}
              />
            )}
          />
        </div>
      </div>
      {isLoading && <p className="px-4 pb-3 text-caption text-lr-muted">Loading PDF…</p>}
      {pdfErrorMessage && (
        <p className="px-4 pb-3 text-caption text-lr-error">{pdfErrorMessage}</p>
      )}
    </div>
  )
}

export interface TemplatePdfPreviewByTemplateIdProps {
  templateId: string
  /** When set, field boxes are drawn on the PDF (same as edit view, read-only). */
  fieldMetadata?: StoredField[] | null
  title?: string
  className?: string
}

/**
 * Read-only PDF card for template detail: loads bytes from preview API and reuses TemplatePdfCard.
 */
export function TemplatePdfPreviewByTemplateId({
  templateId,
  fieldMetadata,
  title = 'PDF preview',
  className,
}: TemplatePdfPreviewByTemplateIdProps) {
  const viewerContainerRef = useRef<HTMLDivElement | null>(null)
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const pdfInput = pdfBytes
  const {
    pdfData,
    numPages,
    scale,
    setScale,
    setPageDimension,
    handleDocumentLoadSuccess,
    isLoading,
    errorMessage: pdfErrorMessage,
  } = usePdfDocument(pdfInput)

  const { currentPageIndex, scrollToPage } = usePdfPageVisibility({
    containerRef: viewerContainerRef,
    numPages,
  })

  const fieldPreview = useMemo(
    () => ({
      signatureDataUrl: null,
      fullName: '',
      title: '',
      dateText: '',
    }),
    []
  )

  const fieldPlacements = useMemo(
    () =>
      fieldMetadata && fieldMetadata.length > 0 ? hydrateForSigner(fieldMetadata) : [],
    [fieldMetadata]
  )

  const pdfDataForViewer = useMemo(() => {
    if (!pdfData) return null
    return pdfData.slice(0)
  }, [pdfData])

  useEffect(() => {
    ensureESigningConfigured()
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/templates/${templateId}/preview`)
        if (!res.ok) {
          if (!cancelled) setLoadError('Could not load template PDF')
          return
        }
        const buf = await res.arrayBuffer()
        if (cancelled) return
        setPdfBytes(new Uint8Array(buf))
        setLoadError(null)
      } catch {
        if (!cancelled) setLoadError('Could not load template PDF')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [templateId])

  return (
    <TemplatePdfCard
      title={title}
      className={className}
      viewerContainerRef={viewerContainerRef}
      pdfDataForViewer={pdfDataForViewer}
      numPages={numPages}
      scale={scale}
      setScale={setScale}
      handleDocumentLoadSuccess={handleDocumentLoadSuccess}
      setPageDimension={setPageDimension}
      currentPageIndex={currentPageIndex}
      onPageChange={(i) => scrollToPage(i)}
      fields={fieldPlacements}
      selectedFieldType={null}
      onAddField={noopAdd}
      onUpdateField={() => {}}
      onRemoveField={noopRemove}
      preview={fieldPreview}
      readOnly
      isLoading={isLoading}
      pdfErrorMessage={pdfErrorMessage}
      loadError={loadError}
    />
  )
}
