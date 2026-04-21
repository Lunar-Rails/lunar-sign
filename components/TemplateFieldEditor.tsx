'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFieldPlacement, usePdfDocument, usePdfPageVisibility, usePdfTextLines } from '@drvillo/react-browser-e-signing'
import type { FieldType } from '@drvillo/react-browser-e-signing'

import '@/lib/esigning/configure-client'
import {
  placementsFromStored,
  storedFieldsFromPlacements,
  normalizeStoredFields,
  validateSignerFieldAssignments,
} from '@/lib/field-metadata'
import {
  DocumentCompanyIdsSchema,
  DocumentTypeNameSchema,
  DocumentUploadSchema,
} from '@/lib/schemas'
import type { Company, DocumentType, StoredField } from '@/lib/types'
import { useTemplateEditorSidebar } from '@/lib/template-editor-sidebar-context'

import { TemplateFieldList } from '@/components/TemplateFieldList'
import { TemplatePdfCard } from '@/components/TemplatePdfCard'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AlertCircle, AlertTriangle, UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'

const TEMPLATE_FIELD_TYPES: FieldType[] = [
  'signature',
  'fullName',
  'title',
  'date',
  'text',
]

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

export interface TemplateFieldEditorProps {
  mode: 'create' | 'edit'
  templateId?: string
  companies: Company[]
  documentTypes: DocumentType[]
  initialCompanyIds?: string[]
  initialTitle?: string
  initialDescription?: string | null
  initialDocumentTypeId?: string | null
  initialStoredFields?: StoredField[]
  initialSignerCount?: number
}

export function TemplateFieldEditor({
  mode,
  templateId,
  companies,
  documentTypes,
  initialCompanyIds = [],
  initialTitle = '',
  initialDescription = '',
  initialDocumentTypeId = null,
  initialStoredFields = [],
  initialSignerCount = 1,
}: TemplateFieldEditorProps) {
  const router = useRouter()
  const viewerContainerRef = useRef<HTMLDivElement | null>(null)

  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription ?? '')
  const [documentTypeId, setDocumentTypeId] = useState<string | null>(initialDocumentTypeId)
  const [newDocumentTypeName, setNewDocumentTypeName] = useState('')
  const [signerCount, setSignerCount] = useState<1 | 2>(
    initialSignerCount >= 2 ? 2 : 1
  )
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>(() => {
    const allowed = new Set(companies.map((c) => c.id))
    return initialCompanyIds.filter((id) => allowed.has(id))
  })
  const [file, setFile] = useState<File | null>(null)
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null)
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType | null>('signature')
  const [signerIndexById, setSignerIndexById] = useState<Record<string, number | null>>({})
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const hydratedRef = useRef(false)

  const pdfInput = useMemo(() => {
    if (mode === 'create' && file) return file
    if (mode === 'edit' && pdfBytes?.length) return pdfBytes
    return null
  }, [mode, file, pdfBytes])

  const {
    pdfData,
    numPages,
    scale,
    setScale,
    pageDimensions,
    setPageDimension,
    handleDocumentLoadSuccess,
    isLoading,
    errorMessage: pdfErrorMessage,
  } = usePdfDocument(pdfInput)

  const { textLinesByPage, handlePageTextContent } = usePdfTextLines(pageDimensions)

  const { fields, addField, updateField, removeField, setFields } = useFieldPlacement()
  const { currentPageIndex, scrollToPage } = usePdfPageVisibility({
    containerRef: viewerContainerRef,
    numPages,
  })

  const fieldPreview = useMemo(
    () => ({ signatureDataUrl: null, fullName: '', title: '', dateText: '' }),
    []
  )

  const pdfDataForViewer = useMemo(() => {
    if (!pdfData) return null
    return pdfData.slice(0)
  }, [pdfData])

  useEffect(() => {
    if (mode !== 'edit' || !templateId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/templates/${templateId}/preview`)
        if (!res.ok) {
          if (!cancelled) setPdfLoadError('Could not load template PDF')
          return
        }
        const buf = await res.arrayBuffer()
        if (cancelled) return
        setPdfBytes(new Uint8Array(buf))
        setPdfLoadError(null)
      } catch {
        if (!cancelled) setPdfLoadError('Could not load template PDF')
      }
    })()
    return () => { cancelled = true }
  }, [mode, templateId])

  useEffect(() => {
    if (mode !== 'edit' || hydratedRef.current || !initialStoredFields.length) return
    hydratedRef.current = true
    const { fields: nextFields, signerIndexById: map } = placementsFromStored(initialStoredFields)
    setFields(nextFields)
    setSignerIndexById(map)
  }, [mode, initialStoredFields, setFields])

  // Keep signerIndexById in sync with placed fields (new fields default to null = creator)
  useEffect(() => {
    setSignerIndexById((prev) => {
      const next = { ...prev }
      let changed = false
      for (const f of fields) {
        if (!(f.id in next)) {
          next[f.id] = null
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

  function handleSignerCountChange(next: 1 | 2) {
    if (next === signerCount) return
    if (next === 1) {
      const hasS2Fields = Object.values(signerIndexById).some((idx) => idx === 1)
      if (hasS2Fields) {
        const confirmed = window.confirm(
          'Changing to 1 signer will reset all Signer 2 fields to Signer 1. Continue?'
        )
        if (!confirmed) return
        setSignerIndexById((prev) => {
          const updated: Record<string, number | null> = {}
          for (const [id, idx] of Object.entries(prev)) {
            updated[id] = idx === 1 ? 0 : idx
          }
          return updated
        })
      }
    }
    setSignerCount(next)
  }

  const handleCompanyToggle = useCallback((companyId: string) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId]
    )
  }, [])

  const { setData: setSidebarData } = useTemplateEditorSidebar()

  useEffect(() => {
    setSidebarData({
      editorMode: mode,
      title,
      setTitle,
      description,
      setDescription,
      documentTypeId,
      setDocumentTypeId,
      newDocumentTypeName,
      setNewDocumentTypeName,
      documentTypes,
      companies,
      selectedCompanyIds,
      onCompanyToggle: handleCompanyToggle,
    })
  }, [
    mode,
    title,
    description,
    documentTypeId,
    newDocumentTypeName,
    selectedCompanyIds,
    documentTypes,
    companies,
    handleCompanyToggle,
    setSidebarData,
  ])

  useEffect(() => {
    return () => setSidebarData(null)
  }, [setSidebarData])

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (mode === 'create') setIsDragging(true)
  }
  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
  }
  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    if (mode !== 'create') return
    const dropped = e.dataTransfer.files[0]
    if (dropped?.type === 'application/pdf') {
      setFile(dropped)
      setError(null)
    } else setError('Please drop a PDF file')
  }
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (mode !== 'create') return
    const selected = e.target.files?.[0]
    if (selected?.type === 'application/pdf') {
      setFile(selected)
      setError(null)
    } else if (selected) setError('Only PDF files are supported')
  }

  // Derive StoredField[] for the summary panel from current placements + signerIndexById
  const summaryFields: StoredField[] = useMemo(
    () =>
      normalizeStoredFields(
        storedFieldsFromPlacements({ fields, signerIndexById })
      ),
    [fields, signerIndexById]
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const titleValidation = DocumentUploadSchema.safeParse({
      title,
      description: description || null,
    })
    if (!titleValidation.success) {
      const err = titleValidation.error.flatten().fieldErrors
      setError(Object.values(err)[0]?.[0] || 'Validation error')
      return
    }

    const companyValidation = DocumentCompanyIdsSchema.safeParse({
      companyIds: selectedCompanyIds,
    })
    if (!companyValidation.success) {
      setError('Invalid company selection')
      return
    }

    if (mode === 'create' && !file) {
      setError('Please select a PDF file')
      return
    }

    if (mode === 'create' && documentTypes.length === 0) {
      const trimmed = newDocumentTypeName.trim()
      if (trimmed) {
        const nameCheck = DocumentTypeNameSchema.safeParse(trimmed)
        if (!nameCheck.success) {
          setError(
            nameCheck.error.issues[0]?.message ?? 'Invalid document type name'
          )
          return
        }
      }
    }

    const fieldMetadata = storedFieldsFromPlacements({ fields, signerIndexById })
    if (fieldMetadata.length === 0) {
      setError('Place at least one field on the document')
      return
    }

    const signerFieldValidation = validateSignerFieldAssignments(fieldMetadata, signerCount)
    if (!signerFieldValidation.valid) {
      const labels = signerFieldValidation.missingSignerIndexes.map(
        (index) => `Signer ${index + 1}`
      )
      setError(
        labels.length === 1
          ? `${labels[0]} needs at least one assigned field`
          : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]} need at least one assigned field`
      )
      return
    }

    setIsSaving(true)
    try {
      if (mode === 'create' && file) {
        const formData = new FormData()
        formData.append('title', titleValidation.data.title)
        formData.append('description', titleValidation.data.description ?? '')
        formData.append('file', file)
        formData.append('field_metadata', JSON.stringify(fieldMetadata))
        formData.append('signer_count', String(signerCount))
        if (documentTypes.length === 0) {
          const trimmed = newDocumentTypeName.trim()
          if (trimmed) formData.append('document_type_name', trimmed)
        } else if (documentTypeId) {
          formData.append('document_type_id', documentTypeId)
        }
        companyValidation.data.companyIds.forEach((id) => formData.append('companyIds', id))

        const res = await fetch('/api/templates', { method: 'POST', body: formData })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Failed to save template')
        const id = data.data?.template?.id as string | undefined
        if (id) router.push(`/templates/${id}`)
        else router.push('/templates')
        return
      }

      if (mode === 'edit' && templateId) {
        const res = await fetch(`/api/templates/${templateId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: titleValidation.data.title,
            description: titleValidation.data.description ?? null,
            document_type_id: documentTypeId,
            field_metadata: fieldMetadata,
            companyIds: companyValidation.data.companyIds,
            signer_count: signerCount,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Failed to update template')
        router.push(`/templates/${templateId}`)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  const showPdfViewer = mode === 'edit' ? pdfBytes && pdfBytes.length > 0 : Boolean(file)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-start gap-4 xl:gap-6">
        <div className="space-y-4 xl:sticky xl:top-[72px] xl:w-[380px] xl:shrink-0 xl:max-h-[calc(100dvh-88px)] xl:overflow-y-auto">
          {mode === 'create' && !file && (
            <div>
              <Label>PDF *</Label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'relative mt-1.5 rounded-lr-lg border-2 border-dashed px-6 py-12 text-center transition-colors',
                  isDragging
                    ? 'border-lr-accent bg-lr-accent-dim'
                    : 'border-lr-border bg-lr-surface hover:border-lr-border-2'
                )}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <UploadCloud className="mx-auto h-8 w-8 text-lr-muted" />
                <p className="mt-2 text-lr-sm text-lr-muted">
                  <span className="font-medium text-lr-accent">Click or drop</span> a PDF
                </p>
              </div>
            </div>
          )}

          <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card">
            <Label className="mb-2 block">Number of signers</Label>
            <div className="inline-flex items-center rounded-lr border border-lr-border bg-lr-bg p-0.5 gap-0.5">
              {([1, 2] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleSignerCountChange(n)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-lr-xs font-display font-medium transition-all duration-150',
                    signerCount === n
                      ? 'bg-lr-surface-2 text-lr-text border border-lr-border shadow-sm'
                      : 'text-lr-muted hover:text-lr-text hover:bg-lr-surface border border-transparent'
                  )}
                >
                  {n === 1 ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-lr-accent" />
                      1 signer
                    </>
                  ) : (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-lr-accent" />
                      <span className="h-1.5 w-1.5 -ml-0.5 rounded-full bg-lr-cyan" />
                      2 signers
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          {showPdfViewer && (
            <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card space-y-2">
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
              <SignerWarnings summaryFields={summaryFields} signerCount={signerCount} />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lr border-l-4 border-l-lr-error bg-lr-error-dim px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-lr-error" />
              <p className="text-lr-sm text-lr-error">{error}</p>
            </div>
          )}

          <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? 'Saving…' : mode === 'create' ? 'Create template' : 'Save changes'}
          </Button>
        </div>

        {showPdfViewer && (
          <div className="flex-1 min-w-0">
            <TemplatePdfCard
              title="PDF preview"
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
              onPageTextContent={handlePageTextContent}
              textLinesByPage={textLinesByPage}
              isLoading={isLoading}
              pdfErrorMessage={pdfErrorMessage}
              loadError={mode === 'edit' ? pdfLoadError ?? undefined : undefined}
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
    </form>
  )
}
