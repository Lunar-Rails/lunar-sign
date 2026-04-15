'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  FieldPalette,
  useFieldPlacement,
  usePdfDocument,
  usePdfPageVisibility,
} from '@drvillo/react-browser-e-signing'
import type { FieldType } from '@drvillo/react-browser-e-signing'
import { Loader2, Save } from 'lucide-react'

import { ensureESigningConfigured } from '@/lib/esigning/configure-client'
import { placementsFromStored, storedFieldsFromPlacements } from '@/lib/field-metadata'
import type { SignatureRequest, StoredField } from '@/lib/types'

import { TemplateFieldList } from '@/components/TemplateFieldList'
import { TemplatePdfCard } from '@/components/TemplatePdfCard'
import { Button } from '@/components/ui/button'

const FIELD_TYPES: FieldType[] = ['signature', 'fullName', 'title', 'date', 'text']

const SIGNER_DOT_CLASS: Record<number, string> = {
  0: 'bg-lr-accent',
  1: 'bg-lr-cyan',
}

interface DocumentFieldEditorProps {
  documentId: string
  signers: SignatureRequest[]
  initialFieldMetadata?: StoredField[] | null
}

export function DocumentFieldEditor({
  documentId,
  signers,
  initialFieldMetadata,
}: DocumentFieldEditorProps) {
  const viewerContainerRef = useRef<HTMLDivElement | null>(null)
  const hydratedRef = useRef(false)

  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null)
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType | null>('signature')
  const [signerIndexById, setSignerIndexById] = useState<Record<string, number | null>>({})
  const [isSaving, setIsSaving] = useState(false)

  const signerCount: 1 | 2 = signers.length >= 2 ? 2 : 1

  const { fields, addField, updateField, removeField, setFields } = useFieldPlacement()

  const {
    pdfData,
    numPages,
    scale,
    setScale,
    setPageDimension,
    handleDocumentLoadSuccess,
    isLoading,
    errorMessage: pdfErrorMessage,
  } = usePdfDocument(pdfBytes)

  const { currentPageIndex, scrollToPage } = usePdfPageVisibility({
    containerRef: viewerContainerRef,
    numPages,
  })

  const fieldPreview = useMemo(
    () => ({ signatureDataUrl: null, fullName: '', title: '', dateText: '' }),
    []
  )

  const pdfDataForViewer = useMemo(
    () => (pdfData ? pdfData.slice(0) : null),
    [pdfData]
  )

  useEffect(() => {
    ensureESigningConfigured()
  }, [])

  // Load document PDF
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}/preview`, { cache: 'no-store' })
        if (!res.ok) {
          if (!cancelled) setPdfLoadError('Could not load document PDF')
          return
        }
        const buf = await res.arrayBuffer()
        if (cancelled) return
        setPdfBytes(new Uint8Array(buf))
      } catch {
        if (!cancelled) setPdfLoadError('Could not load document PDF')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [documentId])

  // Hydrate from saved field_metadata on first load
  useEffect(() => {
    if (hydratedRef.current || !initialFieldMetadata?.length) return
    hydratedRef.current = true
    const { fields: nextFields, signerIndexById: map } = placementsFromStored(initialFieldMetadata)
    setFields(nextFields)
    setSignerIndexById(map)
  }, [initialFieldMetadata, setFields])

  // Keep signerIndexById in sync with placed fields; default new fields to Signer 1 (index 0)
  useEffect(() => {
    setSignerIndexById((prev) => {
      const next = { ...prev }
      let changed = false
      for (const f of fields) {
        if (!(f.id in next)) {
          next[f.id] = 0
          changed = true
        }
      }
      for (const id of Object.keys(next)) {
        if (!fields.some((fl) => fl.id === id)) {
          delete next[id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [fields])

  async function handleSave() {
    const fieldMetadata = storedFieldsFromPlacements({ fields, signerIndexById })
    setIsSaving(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/fields`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field_metadata: fieldMetadata }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || 'Failed to save fields')
      }
      toast.success(
        fieldMetadata.length === 0
          ? 'Fields cleared'
          : `${fieldMetadata.length} field${fieldMetadata.length === 1 ? '' : 's'} saved`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save fields')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col xl:flex-row xl:items-start gap-4 xl:gap-6">
      {/* Left control panel */}
      <div className="space-y-4 xl:sticky xl:top-[72px] xl:w-[380px] xl:shrink-0 xl:max-h-[calc(100dvh-88px)] xl:overflow-y-auto">

        {/* Signer legend */}
        <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card space-y-2">
          <h3 className="font-display text-lr-md font-semibold text-lr-text">Signers</h3>
          <p className="text-lr-xs text-lr-muted">
            Assign each field to the correct signer below.
          </p>
          <ul className="space-y-1.5">
            {signers.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2 text-lr-sm">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${SIGNER_DOT_CLASS[i] ?? 'bg-lr-muted'}`}
                />
                <span className="font-medium text-lr-text">{s.signer_name}</span>
                <span className="truncate text-lr-muted">{s.signer_email}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Field type palette */}
        {pdfBytes && (
          <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card space-y-2">
            <h3 className="font-display text-lr-md font-semibold text-lr-text">Field types</h3>
            <p className="text-lr-xs text-lr-muted">
              Select a type, then click anywhere on the PDF to place it.
            </p>
            <FieldPalette
              selectedFieldType={selectedFieldType}
              onSelectFieldType={setSelectedFieldType}
              fieldTypes={FIELD_TYPES}
            />
          </div>
        )}

        {/* Placed fields list */}
        {pdfBytes && (
          <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card space-y-3">
            <h3 className="font-display text-lr-md font-semibold text-lr-text">Placed fields</h3>
            <TemplateFieldList
              fields={fields}
              signerIndexById={signerIndexById}
              signerCount={signerCount}
              onLabelChange={({ fieldId, label }) => updateField(fieldId, { label })}
              onSignerIndexChange={({ fieldId, signerIndex }) =>
                setSignerIndexById((prev) => ({ ...prev, [fieldId]: signerIndex }))
              }
              onRemoveField={removeField}
            />
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={isSaving || !pdfBytes}
          className="w-full sm:w-auto"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? 'Saving…' : 'Save fields'}
        </Button>
      </div>

      {/* Right: interactive PDF canvas */}
      <div className="flex-1 min-w-0">
        <TemplatePdfCard
          title="Place signature fields"
          viewerContainerRef={viewerContainerRef}
          pdfDataForViewer={pdfDataForViewer}
          numPages={numPages}
          scale={scale}
          setScale={setScale}
          handleDocumentLoadSuccess={handleDocumentLoadSuccess}
          setPageDimension={setPageDimension}
          currentPageIndex={currentPageIndex}
          onPageChange={(i) => scrollToPage(i)}
          fields={fields}
          selectedFieldType={selectedFieldType}
          onAddField={addField}
          onUpdateField={updateField}
          onRemoveField={removeField}
          preview={fieldPreview}
          isLoading={isLoading}
          pdfErrorMessage={pdfErrorMessage}
          loadError={pdfLoadError}
        />
      </div>
    </div>
  )
}
