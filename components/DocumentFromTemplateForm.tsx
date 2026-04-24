'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFieldPlacement, usePdfDocument, usePdfPageVisibility } from '@drvillo/react-browser-e-signing'

import '@/lib/esigning/configure-client'
import {
  hydrateForDocumentCreator,
  mergeCreatorFieldValues,
  normalizeStoredFields,
  resolveSignerIndex,
  validateCreatorFieldsComplete,
  validateSignerFieldAssignments,
} from '@/lib/field-metadata'
import { AddSignerSchema, DocumentUploadSchema } from '@/lib/schemas'
import type { StoredField, StoredFieldType } from '@/lib/types'

import { TemplatePdfCard } from '@/components/TemplatePdfCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DocumentFromTemplateFormProps {
  templateId: string
  defaultTitle: string
  defaultDescription?: string | null
  storedFields: StoredField[]
  signerCount?: 1 | 2
}

interface SignerRow {
  signer_name: string
  signer_email: string
}

const TYPE_LABELS: Record<StoredFieldType, string> = {
  signature: 'Signature',
  fullName: 'Full Name',
  title: 'Title',
  date: 'Date',
  text: 'Text',
}

const SLOT_STYLES = [
  {
    border: 'border-t-lr-accent',
    dot: 'bg-lr-accent',
    pill: 'border-lr-accent/40 text-lr-accent bg-lr-accent/5',
    label: 'Signer 1',
  },
  {
    border: 'border-t-lr-cyan',
    dot: 'bg-lr-cyan',
    pill: 'border-lr-cyan/40 text-lr-cyan bg-lr-cyan/5',
    label: 'Signer 2',
  },
]

export function DocumentFromTemplateForm({
  templateId,
  defaultTitle,
  defaultDescription = '',
  storedFields,
  signerCount,
}: DocumentFromTemplateFormProps) {
  const router = useRouter()
  const viewerContainerRef = useRef<HTMLDivElement | null>(null)

  const normalized = useMemo(() => normalizeStoredFields(storedFields), [storedFields])

  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState(defaultDescription ?? '')
  const isSlotMode = (signerCount ?? 0) > 0

  // Slot mode: fixed N signer rows keyed by slot index
  const [signerSlots, setSignerSlots] = useState<SignerRow[]>(() =>
    Array.from({ length: signerCount ?? 1 }, () => ({ signer_name: '', signer_email: '' }))
  )

  // Legacy mode: dynamic signers list
  const [signers, setSigners] = useState<SignerRow[]>([{ signer_name: '', signer_email: '' }])

  const [sendNow, setSendNow] = useState(true)
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const initialPlacements = useMemo(
    () => hydrateForDocumentCreator(normalized),
    [normalized]
  )

  const { fields, updateField } = useFieldPlacement({ initialFields: initialPlacements })
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)

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
  } = usePdfDocument(pdfBytes)

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
  }, [templateId])

  const creatorFields = normalized.filter((f) => resolveSignerIndex(f) === null)

  // Fields for each slot index (for summaries)
  function signerSlotFields(slotIndex: number) {
    return normalized.filter((f) => resolveSignerIndex(f) === slotIndex)
  }

  const canSubmit = useMemo(() => {
    const docVal = DocumentUploadSchema.safeParse({ title, description: description || null })
    if (!docVal.success) return false

    const activeSigners = isSlotMode ? signerSlots : signers
    const parsedSigners = activeSigners.map((s) => AddSignerSchema.safeParse(s))
    if (parsedSigners.some((r) => !r.success)) return false
    if (parsedSigners.length === 0) return false

    const field_values: Record<string, string> = {}
    for (const f of creatorFields) {
      const placement = fields.find((p) => p.id === f.id)
      field_values[f.id] = placement?.value?.trim() ?? ''
    }
    const merged = mergeCreatorFieldValues({ templateFields: normalized, fieldValues: field_values })
    return validateCreatorFieldsComplete(merged).valid
  }, [description, fields, signerSlots, signers, normalized, title, isSlotMode, creatorFields])

  function updateSlot(index: number, patch: Partial<SignerRow>) {
    setSignerSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function handleAddSigner() {
    setSigners((s) => [...s, { signer_name: '', signer_email: '' }])
  }
  function handleRemoveSigner(index: number) {
    setSigners((s) => (s.length <= 1 ? s : s.filter((_, i) => i !== index)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const docVal = DocumentUploadSchema.safeParse({ title, description: description || null })
    if (!docVal.success) {
      const err = docVal.error.flatten().fieldErrors
      setError(Object.values(err)[0]?.[0] || 'Validation error')
      return
    }

    const activeSigners = isSlotMode ? signerSlots : signers
    const parsedSigners = activeSigners.map((s) => AddSignerSchema.safeParse(s))
    const badSigner = parsedSigners.find((r) => !r.success)
    if (badSigner && !badSigner.success) {
      const fe = badSigner.error.flatten().fieldErrors
      setError(Object.values(fe)[0]?.[0] || 'Invalid signer')
      return
    }
    const validSigners = parsedSigners.flatMap((r) => (r.success ? [r.data] : []))
    if (validSigners.length === 0) {
      setError('Add at least one signer')
      return
    }

    if (isSlotMode) {
      const signerFieldValidation = validateSignerFieldAssignments(
        normalized,
        signerSlots.length
      )
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
    }

    const field_values: Record<string, string> = {}
    for (const f of creatorFields) {
      const placement = fields.find((p) => p.id === f.id)
      field_values[f.id] = placement?.value?.trim() ?? ''
    }

    const merged = mergeCreatorFieldValues({ templateFields: normalized, fieldValues: field_values })
    const { valid, missingLabels } = validateCreatorFieldsComplete(merged)
    if (!valid) {
      setError(`Missing: ${missingLabels.join(', ')}`)
      return
    }

    setIsSubmitting(true)
    try {
      const body = {
        title: docVal.data.title,
        description: docVal.data.description ?? null,
        field_values,
        signers: validSigners,
        send_now: sendNow,
      }
      const res = await fetch(`/api/templates/${templateId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to create document')
      const docId = data.data?.document?.id as string | undefined
      if (docId) router.push(`/documents/${docId}`)
      else router.push('/documents')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-start gap-4 xl:gap-6">
        <div className="space-y-4 xl:sticky xl:top-[72px] xl:w-[380px] xl:shrink-0 xl:max-h-[calc(100dvh-88px)] xl:overflow-y-auto">
          <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card space-y-3">
            <h2 className="font-display text-lr-lg font-semibold text-lr-text">Document</h2>
            <div>
              <Label htmlFor="c-title">Title *</Label>
              <Input id="c-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="c-desc">Description</Label>
              <Textarea
                id="c-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          {creatorFields.length > 0 && (
            <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card space-y-3">
              <h3 className="font-display text-lr-md font-semibold text-lr-text">Your fields</h3>
              <ul className="space-y-3">
                {creatorFields.map((f) => (
                  <li key={f.id}>
                    <Label className="text-lr-xs text-lr-muted" htmlFor={`cv-${f.id}`}>
                      {f.label?.trim() || f.type}
                    </Label>
                    <Input
                      id={`cv-${f.id}`}
                      value={fields.find((p) => p.id === f.id)?.value ?? ''}
                      onChange={(e) => updateField(f.id, { value: e.target.value })}
                      className="mt-1"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Slot-based signers (from templates with explicit signer_count) */}
          {isSlotMode ? (
            <div className="space-y-3">
              {signerSlots.map((slot, slotIdx) => {
                const style = SLOT_STYLES[slotIdx] ?? SLOT_STYLES[0]
                const slotFields = signerSlotFields(slotIdx)
                return (
                  <div
                    key={slotIdx}
                    className={cn(
                      'rounded-lr-lg border border-lr-border border-t-4 bg-lr-surface p-4 shadow-lr-card space-y-3',
                      style.border
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', style.dot)} />
                      <h3 className="font-display text-lr-md font-semibold text-lr-text">
                        {style.label}
                      </h3>
                    </div>

                    {slotFields.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {slotFields.map((f) => (
                          <span
                            key={f.id}
                            className={cn(
                              'inline-flex items-center rounded-full border px-2 py-0.5 text-lr-xs font-medium',
                              style.pill
                            )}
                          >
                            {f.label?.trim() || TYPE_LABELS[f.type]}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="flex-1 space-y-1">
                        <Label className="text-lr-xs">Name *</Label>
                        <Input
                          value={slot.signer_name}
                          onChange={(e) => updateSlot(slotIdx, { signer_name: e.target.value })}
                          placeholder="Full name"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-lr-xs">Email *</Label>
                        <Input
                          type="email"
                          value={slot.signer_email}
                          onChange={(e) => updateSlot(slotIdx, { signer_email: e.target.value })}
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Legacy dynamic signers for templates without signer_count */
            <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-lr-md font-semibold text-lr-text">Signers *</h3>
                <Button type="button" variant="secondary" size="sm" onClick={handleAddSigner}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </div>
              <div className="space-y-3">
                {signers.map((row, index) => (
                  <div key={index} className="flex flex-col gap-2 rounded-lr border border-lr-border p-3 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-lr-xs">Name</Label>
                      <Input
                        value={row.signer_name}
                        onChange={(e) =>
                          setSigners((s) =>
                            s.map((x, i) => (i === index ? { ...x, signer_name: e.target.value } : x))
                          )
                        }
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-lr-xs">Email</Label>
                      <Input
                        type="email"
                        value={row.signer_email}
                        onChange={(e) =>
                          setSigners((s) =>
                            s.map((x, i) => (i === index ? { ...x, signer_email: e.target.value } : x))
                          )
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={signers.length <= 1}
                      onClick={() => handleRemoveSigner(index)}
                      aria-label="Remove signer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lr-lg border border-lr-border bg-lr-surface px-4 py-3">
            <label className="flex cursor-pointer items-center gap-2 text-lr-sm text-lr-text">
              <input
                type="checkbox"
                checked={sendNow}
                onChange={(e) => setSendNow(e.target.checked)}
                className="h-4 w-4 rounded border-lr-border accent-lr-accent"
              />
              Send signing emails now
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lr border-l-4 border-l-lr-error bg-lr-error-dim px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-lr-error" />
              <p className="text-lr-sm text-lr-error">{error}</p>
            </div>
          )}

          <Button type="submit" disabled={isSubmitting || !canSubmit} className="w-full sm:w-auto">
            {isSubmitting ? 'Creating…' : sendNow ? 'Create & send' : 'Create draft'}
          </Button>
        </div>

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
            firstPageWidthPt={pageDimensions[0]?.widthPt}
            currentPageIndex={currentPageIndex}
            onPageChange={(i) => scrollToPage(i)}
            fields={fields}
            selectedFieldType={null}
            onAddField={() => { /* no-op */ }}
            onUpdateField={updateField}
            onRemoveField={() => { /* no-op */ }}
            preview={fieldPreview}
            readOnly
            isLoading={isLoading}
            pdfErrorMessage={pdfErrorMessage}
            loadError={pdfLoadError ?? undefined}
          />
        </div>
      </div>
    </form>
  )
}
