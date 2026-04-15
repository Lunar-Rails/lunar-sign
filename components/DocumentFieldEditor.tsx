'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useFieldPlacement, usePdfDocument, usePdfPageVisibility } from '@drvillo/react-browser-e-signing'
import type { FieldType } from '@drvillo/react-browser-e-signing'
import { AlertCircle, AlertTriangle } from 'lucide-react'

import '@/lib/esigning/configure-client'
import {
  placementsFromStored,
  resolveSignerIndex,
  storedFieldsFromPlacements,
  normalizeStoredFields,
} from '@/lib/field-metadata'
import type { DocumentStatus, SignatureRequest, StoredField } from '@/lib/types'

import { TemplateFieldList } from '@/components/TemplateFieldList'
import { TemplatePdfCard } from '@/components/TemplatePdfCard'
import SignersSection from '@/components/SignersSection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ── Inline sub-components (mirrored from TemplateFieldEditor) ────────────────

const TEMPLATE_FIELD_TYPES: FieldType[] = ['signature', 'fullName', 'title', 'date', 'text']

const PALETTE_LABELS: Record<FieldType, string> = {
  signature: 'Sig',
  fullName: 'Name',
  title: 'Title',
  date: 'Date',
  text: 'Text',
}

function CompactFieldPalette({
  selected,
  onSelect,
}: {
  selected: FieldType | null
  onSelect: (t: FieldType | null) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-section-label shrink-0 mr-1">Place</span>
      {TEMPLATE_FIELD_TYPES.map((t) => {
        const isActive = selected === t
        return (
          <button
            key={t}
            type="button"
            onClick={() => onSelect(isActive ? null : t)}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-lr-xs font-display font-medium transition-all duration-150 border',
              isActive
                ? 'bg-lr-accent text-white border-lr-accent shadow-sm'
                : 'bg-lr-bg text-lr-muted border-lr-border hover:text-lr-text hover:border-lr-text/20'
            )}
          >
            {PALETTE_LABELS[t]}
          </button>
        )
      })}
    </div>
  )
}

function SignerWarnings({
  summaryFields,
  signerCount,
}: {
  summaryFields: StoredField[]
  signerCount: 1 | 2
}) {
  const warnings: string[] = []
  for (let i = 0; i < signerCount; i++) {
    const slotFields = summaryFields.filter((f) => (f.signerIndex ?? null) === i)
    const hasFields = slotFields.length > 0
    const hasSignature = slotFields.some((f) => f.type === 'signature')
    if (!hasFields) {
      warnings.push(`Signer ${i + 1} has no assigned fields`)
      continue
    }
    if (!hasSignature)
      warnings.push(`Signer ${i + 1} has no signature field`)
  }
  if (warnings.length === 0) return null
  return (
    <div className="space-y-1 pt-1">
      {warnings.map((w) => (
        <div key={w} className="flex items-center gap-1.5 text-lr-xs text-lr-warning">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>{w}</span>
        </div>
      ))}
    </div>
  )
}

/** Field types where the creator can supply a plain-text value. */
const CREATOR_INPUT_TYPES: FieldType[] = ['text', 'fullName', 'title', 'date']

// ── Main component ────────────────────────────────────────────────────────────

interface DocumentFieldEditorProps {
  documentId: string
  signers: SignatureRequest[]
  initialFieldMetadata?: StoredField[] | null
  documentStatus: DocumentStatus
}

export function DocumentFieldEditor({
  documentId,
  signers,
  initialFieldMetadata,
  documentStatus,
}: DocumentFieldEditorProps) {
  const router = useRouter()
  const viewerContainerRef = useRef<HTMLDivElement | null>(null)
  const hydratedRef = useRef(false)

  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null)
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType | null>('signature')
  const [signerIndexById, setSignerIndexById] = useState<Record<string, number | null>>({})
  const [creatorFieldValues, setCreatorFieldValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
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

  // Derive StoredField[] for warnings from current placements + signerIndexById
  const summaryFields: StoredField[] = useMemo(
    () => normalizeStoredFields(storedFieldsFromPlacements({ fields, signerIndexById })),
    [fields, signerIndexById]
  )

  // Creator fields that accept a plain-text value (shown in "Your fields" panel)
  const creatorInputFields = useMemo(
    () =>
      fields.filter((f) => {
        const idx = signerIndexById[f.id] ?? null
        return idx === null && CREATOR_INPUT_TYPES.includes(f.type as FieldType)
      }),
    [fields, signerIndexById]
  )

  // Load document PDF from preview API
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
    return () => { cancelled = true }
  }, [documentId])

  // Hydrate from saved field_metadata on first load
  useEffect(() => {
    if (hydratedRef.current || !initialFieldMetadata?.length) return
    hydratedRef.current = true
    const { fields: nextFields, signerIndexById: map } = placementsFromStored(initialFieldMetadata)
    setFields(nextFields)
    setSignerIndexById(map)
    // Restore any saved creator field values
    const vals: Record<string, string> = {}
    for (const f of initialFieldMetadata) {
      if (resolveSignerIndex(f) === null && f.value) {
        vals[f.id] = f.value
      }
    }
    if (Object.keys(vals).length > 0) setCreatorFieldValues(vals)
  }, [initialFieldMetadata, setFields])

  // Keep signerIndexById in sync — new fields default to Signer 1 (index 0)
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

  // Keep creatorFieldValues clean — remove entries for deleted fields
  useEffect(() => {
    setCreatorFieldValues((prev) => {
      const next = { ...prev }
      let changed = false
      for (const id of Object.keys(next)) {
        if (!fields.some((f) => f.id === id)) {
          delete next[id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [fields])

  const handleSignerIndexChange = useCallback(
    ({ fieldId, signerIndex }: { fieldId: string; signerIndex: number | null }) => {
      setSignerIndexById((prev) => ({ ...prev, [fieldId]: signerIndex }))
    },
    []
  )

  async function handleSave() {
    setError(null)
    // Build base stored fields, then merge in creator-supplied values
    const rawFields = storedFieldsFromPlacements({ fields, signerIndexById })
    const fieldMetadata = rawFields.map((f) => {
      const idx = signerIndexById[f.id] ?? null
      if (idx !== null) return f // signer field — value filled at signing time
      const val = creatorFieldValues[f.id]
      return { ...f, value: val !== undefined ? val : '' }
    })
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
      toast.success('Fields saved')
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save fields'
      setError(msg)
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const showPdfViewer = Boolean(pdfBytes)

  return (
    <div className="flex flex-col xl:flex-row xl:items-start gap-4 xl:gap-6">
      {/* Left sticky panel — mirrors TemplateFieldEditor layout */}
      <div className="space-y-4 xl:sticky xl:top-[72px] xl:w-[380px] xl:shrink-0 xl:max-h-[calc(100dvh-88px)] xl:overflow-y-auto">

        {/* Embedded signers section — replaces the 1/2 signer toggle */}
        <SignersSection
          documentId={documentId}
          signers={signers}
          documentStatus={documentStatus}
        />

        {/* Creator fields — values the document creator fills before sending */}
        {showPdfViewer && creatorInputFields.length > 0 && (
          <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card space-y-3">
            <div>
              <h3 className="font-display text-lr-md font-semibold text-lr-text">Your fields</h3>
              <p className="text-lr-xs text-lr-muted mt-0.5">
                These will be pre-filled on the document — signers cannot edit them.
              </p>
            </div>
            <ul className="space-y-3">
              {creatorInputFields.map((field) => {
                const label = field.label?.trim() || field.type
                return (
                  <li key={field.id}>
                    <Label className="text-caption" htmlFor={`creator-field-${field.id}`}>
                      {label}
                    </Label>
                    <Input
                      id={`creator-field-${field.id}`}
                      className="mt-1 h-8 text-caption bg-lr-bg border-lr-border"
                      placeholder={`Enter ${label.toLowerCase()}`}
                      value={creatorFieldValues[field.id] ?? ''}
                      onChange={(e) =>
                        setCreatorFieldValues((prev) => ({
                          ...prev,
                          [field.id]: e.target.value,
                        }))
                      }
                    />
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Placed fields + signer assignment + warnings */}
        {showPdfViewer && (
          <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card space-y-2">
            <h3 className="font-display text-lr-md font-semibold text-lr-text">Placed fields</h3>
            <TemplateFieldList
              fields={fields}
              signerIndexById={signerIndexById}
              signerCount={signerCount}
              onLabelChange={({ fieldId, label }) => updateField(fieldId, { label })}
              onSignerIndexChange={handleSignerIndexChange}
              onRemoveField={removeField}
            />
            <SignerWarnings summaryFields={summaryFields} signerCount={signerCount} />
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 rounded-lr border-l-4 border-l-lr-error bg-lr-error-dim px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-lr-error" />
            <p className="text-lr-sm text-lr-error">{error}</p>
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={isSaving || !showPdfViewer}
          className="w-full sm:w-auto"
        >
          {isSaving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>

      {/* Right panel — interactive PDF with CompactFieldPalette strip */}
      {showPdfViewer && (
        <div className="flex-1 min-w-0">
          <TemplatePdfCard
            title="Document Preview"
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
            renderAboveViewer={() => (
              <CompactFieldPalette
                selected={selectedFieldType}
                onSelect={setSelectedFieldType}
              />
            )}
          />
        </div>
      )}
    </div>
  )
}
