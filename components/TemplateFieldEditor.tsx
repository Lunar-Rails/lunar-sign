'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FieldPalette, useFieldPlacement, usePdfDocument, usePdfPageVisibility } from '@drvillo/react-browser-e-signing'
import type { FieldType } from '@drvillo/react-browser-e-signing'

import { ensureESigningConfigured } from '@/lib/esigning/configure-client'
import {
  placementsFromStored,
  storedFieldsFromPlacements,
} from '@/lib/field-metadata'
import { DocumentUploadSchema, DocumentCompanyIdsSchema } from '@/lib/schemas'
import type { Company, DocumentType, StoredField } from '@/lib/types'

import { TemplateFieldList } from '@/components/TemplateFieldList'
import { TemplatePdfCard } from '@/components/TemplatePdfCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'

const TEMPLATE_FIELD_TYPES: FieldType[] = [
  'signature',
  'fullName',
  'title',
  'date',
  'text',
]

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
}: TemplateFieldEditorProps) {
  const router = useRouter()
  const viewerContainerRef = useRef<HTMLDivElement | null>(null)

  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription ?? '')
  const [documentTypeId, setDocumentTypeId] = useState<string | null>(
    initialDocumentTypeId
  )
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>(() => {
    const allowed = new Set(companies.map((c) => c.id))
    return initialCompanyIds.filter((id) => allowed.has(id))
  })
  const [file, setFile] = useState<File | null>(null)
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null)
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType | null>('signature')
  const [forSignerById, setForSignerById] = useState<Record<string, boolean>>({})
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
    setPageDimension,
    handleDocumentLoadSuccess,
    isLoading,
    errorMessage: pdfErrorMessage,
  } = usePdfDocument(pdfInput)

  const { fields, addField, updateField, removeField, setFields } = useFieldPlacement()
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

  const pdfDataForViewer = useMemo(() => {
    if (!pdfData) return null
    return pdfData.slice(0)
  }, [pdfData])

  useEffect(() => {
    ensureESigningConfigured()
  }, [])

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
    return () => {
      cancelled = true
    }
  }, [mode, templateId])

  useEffect(() => {
    if (mode !== 'edit' || hydratedRef.current || !initialStoredFields.length) return
    hydratedRef.current = true
    const { fields: nextFields, forSignerById: map } = placementsFromStored(initialStoredFields)
    setFields(nextFields)
    setForSignerById(map)
  }, [mode, initialStoredFields, setFields])

  useEffect(() => {
    setForSignerById((prev) => {
      const next = { ...prev }
      let changed = false
      for (const f of fields) {
        if (next[f.id] === undefined) {
          next[f.id] = false
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

  function handleCompanyToggle(companyId: string) {
    setSelectedCompanyIds((prev) =>
      prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId]
    )
  }

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

    const fieldMetadata = storedFieldsFromPlacements({ fields, forSignerById })
    if (fieldMetadata.length === 0) {
      setError('Place at least one field on the document')
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
        if (documentTypeId) formData.append('document_type_id', documentTypeId)
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

          <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card space-y-3">
            <h2 className="font-display text-lr-lg font-semibold text-lr-text">Template</h2>
            <div>
              <Label htmlFor="tmpl-title">Title *</Label>
              <Input
                id="tmpl-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="tmpl-desc">Description</Label>
              <Textarea
                id="tmpl-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Document type</Label>
              <Select
                value={documentTypeId ?? '__none__'}
                onValueChange={(v) => setDocumentTypeId(v === '__none__' ? null : v)}
              >
                <SelectTrigger className="mt-1 border-lr-border bg-lr-bg">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {documentTypes.map((dt) => (
                    <SelectItem key={dt.id} value={dt.id}>
                      {dt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {companies.length > 0 && (
              <div>
                <Label>Companies</Label>
                <div className="mt-1 max-h-40 space-y-2 overflow-y-auto rounded-lr border border-lr-border p-2">
                  {companies.map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-2 text-lr-sm">
                      <input
                        type="checkbox"
                        checked={selectedCompanyIds.includes(c.id)}
                        onChange={() => handleCompanyToggle(c.id)}
                        className="h-4 w-4 rounded border-lr-border accent-lr-accent"
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {showPdfViewer && (
            <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card space-y-2">
              <h3 className="font-display text-lr-md font-semibold text-lr-text">Field types</h3>
              <p className="text-lr-xs text-lr-muted">
                Select a type, then click the PDF to place it.
              </p>
              <FieldPalette
                selectedFieldType={selectedFieldType}
                onSelectFieldType={setSelectedFieldType}
                fieldTypes={TEMPLATE_FIELD_TYPES}
              />
            </div>
          )}

          {showPdfViewer && (
            <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card space-y-2">
              <h3 className="font-display text-lr-md font-semibold text-lr-text">Placed fields</h3>
              <TemplateFieldList
                fields={fields}
                forSignerById={forSignerById}
                onLabelChange={({ fieldId, label }) => updateField(fieldId, { label })}
                onForSignerChange={({ fieldId, forSigner }) =>
                  setForSignerById((prev) => ({ ...prev, [fieldId]: forSigner }))
                }
                onRemoveField={removeField}
              />
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
              isLoading={isLoading}
              pdfErrorMessage={pdfErrorMessage}
              loadError={mode === 'edit' ? pdfLoadError ?? undefined : undefined}
            />
          </div>
        )}
      </div>
    </form>
  )
}
