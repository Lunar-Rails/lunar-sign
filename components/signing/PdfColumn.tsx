'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { FieldOverlay, PdfPageNavigator, PdfViewer } from '@drvillo/react-browser-e-signing'
import type { FieldPlacement, PdfTextContent, SignatureFieldPreview, TextLine } from '@drvillo/react-browser-e-signing'
import { Maximize2, Minimize2 } from 'lucide-react'

import { FieldNavigationCta } from '@/components/signing/FieldNavigationCta'
import { useFitToWidth } from '@/hooks/useFitToWidth'
import { cn } from '@/lib/utils'

const LOAD_WATCHDOG_MS = 6000

export type PdfColumnHandle = {
  scrollFieldIntoView: (fieldId: string) => void
}

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
  fields: FieldPlacement[]
  selectedFieldType: null
  onAddField: () => void
  onUpdateField: (fieldId: string, partial: Partial<FieldPlacement>) => void
  onRemoveField: () => void
  preview: SignatureFieldPreview
  readOnly: true
  onPageTextContent?: (pageIndex: number, textContent: PdfTextContent) => void
  textLinesByPage?: Map<number, TextLine[]>
  isLoading: boolean
  pdfErrorMessage: string | null
  onPageChange: (pageIndex: number) => void
  firstPageWidthPt?: number
  /** Guided signing: edge CTA, DOM ids, field highlight, signature click. */
  guided?: boolean
  guideStarted?: boolean
  activeFieldId?: string | null
  isGuideComplete?: boolean
  onGuideStart?: () => void
  onGuideNext?: () => void
  onSignatureFieldClick?: (fieldId: string) => void
}

export const PdfColumn = forwardRef<PdfColumnHandle, PdfColumnProps>(function PdfColumn(
  {
    viewerContainerRef,
    pdfDataForViewer,
    numPages,
    scale,
    setScale,
    handleDocumentLoadSuccess,
    setPageDimension,
    pageMode,
    viewerPageIndex,
    fields,
    onUpdateField,
    preview,
    onPageTextContent,
    textLinesByPage,
    isLoading,
    pdfErrorMessage,
    onPageChange,
    firstPageWidthPt,
    guided = false,
    guideStarted = false,
    activeFieldId = null,
    isGuideComplete = false,
    onGuideStart,
    onGuideNext,
    onSignatureFieldClick,
  },
  ref
) {
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [ctaOffsetPx, setCtaOffsetPx] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(false)

  const hasLoaded = numPages > 0

  useFitToWidth(viewerContainerRef, firstPageWidthPt, setScale)

  const stuck = useLoadWatchdog({
    armed: !!pdfDataForViewer && !hasLoaded && !pdfErrorMessage,
    timeoutMs: LOAD_WATCHDOG_MS,
    resetKey: pdfDataForViewer,
  })

  const updateCtaPosition = useCallback(() => {
    if (!guided || !guideStarted || !activeFieldId || !viewerContainerRef.current || !cardRef.current) {
      if (guided && !guideStarted) setCtaOffsetPx(null)
      return
    }
    const el = viewerContainerRef.current.querySelector(`[data-field-id="${activeFieldId}"]`)
    if (!el) {
      setCtaOffsetPx(null)
      return
    }
    const fieldRect = el.getBoundingClientRect()
    const cardRect = cardRef.current.getBoundingClientRect()

    const rawTop = fieldRect.top - cardRect.top + fieldRect.height / 2

    const CTA_MARGIN = 24
    if (expanded) {
      const vpVisibleTop = Math.max(0, -cardRect.top) + CTA_MARGIN
      const vpVisibleBottom = Math.min(cardRect.height, window.innerHeight - cardRect.top) - CTA_MARGIN
      setCtaOffsetPx(Math.max(vpVisibleTop, Math.min(vpVisibleBottom, rawTop)))
    } else {
      const viewerRect = viewerContainerRef.current.getBoundingClientRect()
      const visibleTop = viewerRect.top - cardRect.top + CTA_MARGIN
      const visibleBottom = viewerRect.bottom - cardRect.top - CTA_MARGIN
      setCtaOffsetPx(Math.max(visibleTop, Math.min(visibleBottom, rawTop)))
    }
  }, [guided, guideStarted, activeFieldId, viewerContainerRef, expanded])

  useImperativeHandle(
    ref,
    () => ({
      scrollFieldIntoView: (fieldId: string) => {
        const root = viewerContainerRef.current
        if (!root) return
        const el = root.querySelector(`[data-field-id="${fieldId}"]`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      },
    }),
    [viewerContainerRef]
  )

  useLayoutEffect(() => {
    updateCtaPosition()
  }, [updateCtaPosition, fields, numPages, viewerPageIndex, scale])

  useEffect(() => {
    if (!guided) return
    const el = viewerContainerRef.current
    if (!el) return
    el.addEventListener('scroll', updateCtaPosition, { passive: true })
    window.addEventListener('resize', updateCtaPosition)
    window.addEventListener('scroll', updateCtaPosition, { passive: true })
    return () => {
      el.removeEventListener('scroll', updateCtaPosition)
      window.removeEventListener('resize', updateCtaPosition)
      window.removeEventListener('scroll', updateCtaPosition)
    }
  }, [guided, updateCtaPosition, viewerContainerRef])

  useLayoutEffect(() => {
    const container = viewerContainerRef.current
    if (!container) return
    const pages = container.querySelectorAll('[data-slot="pdf-viewer-page"]')
    pages.forEach((pageEl, pageIndex) => {
      const overlay = pageEl.querySelector('[data-slot="field-overlay"]')
      if (!overlay) return
      const nodes = overlay.querySelectorAll('[data-slot="signature-field"]')
      const pageFields = fields.filter((f) => f.pageIndex === pageIndex)
      nodes.forEach((node, i) => {
        const f = pageFields[i]
        if (!f || !(node instanceof HTMLElement)) return
        node.setAttribute('data-field-id', f.id)
        const isActive = Boolean(activeFieldId && f.id === activeFieldId)
        node.setAttribute('data-active', isActive ? 'true' : 'false')
      })
    })
  }, [fields, numPages, activeFieldId, viewerContainerRef])

  useEffect(() => {
    if (!guided || !onSignatureFieldClick) return
    const el = viewerContainerRef.current
    if (!el) return
    const handler = (event: MouseEvent) => {
      const t = event.target as HTMLElement | null
      if (!t) return
      const slot = t.closest('[data-slot="signature-field"]')
      if (!slot || !(slot instanceof HTMLElement)) return
      if (slot.getAttribute('data-field-type') !== 'signature') return
      const id = slot.getAttribute('data-field-id')
      if (!id) return
      event.preventDefault()
      event.stopPropagation()
      onSignatureFieldClick(id)
    }
    el.addEventListener('click', handler, true)
    return () => el.removeEventListener('click', handler, true)
  }, [guided, onSignatureFieldClick, viewerContainerRef, fields])

  return (
    <div
      ref={cardRef}
      data-expanded={expanded ? 'true' : 'false'}
      className="relative rounded-lr-lg border border-lr-border bg-lr-surface p-3 shadow-lr-card sm:p-4"
    >
      {guided && onGuideStart && onGuideNext && (
        <FieldNavigationCta
          started={guideStarted}
          isGuideComplete={isGuideComplete}
          ctaOffsetPx={ctaOffsetPx}
          onStart={onGuideStart}
          onNext={onGuideNext}
        />
      )}
      <div
        ref={viewerContainerRef}
        className={cn(
          expanded ? 'overflow-visible' : 'h-[70vh] overflow-auto',
          guided && 'pl-2 sm:pl-3'
        )}
      >
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
            <PdfPageNavigator
              currentPageIndex={viewerPageIndex}
              numPages={numPages}
              onPageChange={onPageChange}
            />
          )}
          renderOverlay={(pageIndex) => (
            <FieldOverlay
              pageIndex={pageIndex}
              fields={fields}
              selectedFieldType={null}
              onAddField={() => {}}
              onUpdateField={onUpdateField}
              onRemoveField={() => {}}
              preview={preview}
              readOnly
              textLines={textLinesByPage?.get(pageIndex)}
            />
          )}
        />
      </div>
      {isLoading && !stuck && <p className="text-caption mt-3 text-lr-muted">Loading document preview…</p>}
      {pdfErrorMessage && <p className="text-caption mt-3 text-lr-error">{pdfErrorMessage}</p>}
      {stuck && !pdfErrorMessage && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lr border border-lr-border bg-lr-bg p-3">
          <p className="text-caption text-lr-error">
            PDF preview failed to load. This is usually a stale browser worker or service worker.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="shrink-0 rounded-lr border border-lr-border bg-lr-surface px-3 py-1.5 text-caption font-medium text-lr-text hover:bg-lr-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lr-accent"
          >
            Reload
          </button>
        </div>
      )}
      {hasLoaded && (
        <div className="mt-3 flex justify-center border-t border-lr-border pt-3">
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
      )}
    </div>
  )
})

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
