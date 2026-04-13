'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFieldPlacement, usePdfDocument, usePdfPageVisibility } from '@drvillo/react-browser-e-signing'

import { ensureESigningConfigured } from '@/lib/esigning/configure-client'
import {
  hydrateForDocumentCreator,
  mergeCreatorFieldValues,
  validateCreatorFieldsComplete,
} from '@/lib/field-metadata'
import { AddSignerSchema, DocumentUploadSchema } from '@/lib/schemas'
import type { StoredField } from '@/lib/types'

import { TemplatePdfCard } from '@/components/TemplatePdfCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Plus, Trash2 } from 'lucide-react'

export interface DocumentFromTemplateFormProps {
  templateId: string
  defaultTitle: string
  defaultDescription?: string | null
  storedFields: StoredField[]
}

interface SignerRow {
  signer_name: string
  signer_email: string
}

export function DocumentFromTemplateForm({
  templateId,
  defaultTitle,
  defaultDescription = '',
  storedFields,
}: DocumentFromTemplateFormProps) {
  const router = useRouter()
  const viewerContainerRef = useRef<HTMLDivElement | null>(null)

  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState(defaultDescription ?? '')
  const [signers, setSigners] = useState<SignerRow[]>([
    { signer_name: '', signer_email: '' },
  ])
  const [sendNow, setSendNow] = useState(true)
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const initialPlacements = useMemo(
    () => hydrateForDocumentCreator(storedFields),
    [storedFields]
  )

  const { fields, updateField } = useFieldPlacement({
    initialFields: initialPlacements,
  })

  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)

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
  }, [templateId])

  const creatorFields = storedFields.filter((f) => !f.forSigner)
  const signerFields = storedFields.filter((f) => f.forSigner)

  const canSubmit = useMemo(() => {
    const docVal = DocumentUploadSchema.safeParse({
      title,
      description: description || null,
    })
    if (!docVal.success) return false

    const parsedSigners = signers.map((s) => AddSignerSchema.safeParse(s))
    if (parsedSigners.some((r) => !r.success)) return false
    const validSigners = parsedSigners.flatMap((r) => (r.success ? [r.data] : []))
    if (validSigners.length === 0) return false

    const field_values: Record<string, string> = {}
    for (const f of storedFields) {
      if (f.forSigner) continue
      const placement = fields.find((p) => p.id === f.id)
      field_values[f.id] = placement?.value?.trim() ?? ''
    }
    const merged = mergeCreatorFieldValues({
      templateFields: storedFields,
      fieldValues: field_values,
    })
    return validateCreatorFieldsComplete(merged).valid
  }, [description, fields, signers, storedFields, title])

  function handleAddSigner() {
    setSigners((s) => [...s, { signer_name: '', signer_email: '' }])
  }
  function handleRemoveSigner(index: number) {
    setSigners((s) => (s.length <= 1 ? s : s.filter((_, i) => i !== index)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const docVal = DocumentUploadSchema.safeParse({
      title,
      description: description || null,
    })
    if (!docVal.success) {
      const err = docVal.error.flatten().fieldErrors
      setError(Object.values(err)[0]?.[0] || 'Validation error')
      return
    }

    const parsedSigners = signers.map((s) => AddSignerSchema.safeParse(s))
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

    const field_values: Record<string, string> = {}
    for (const f of creatorFields) {
      const placement = fields.find((p) => p.id === f.id)
      field_values[f.id] = placement?.value?.trim() ?? ''
    }

    const merged = mergeCreatorFieldValues({
      templateFields: storedFields,
      fieldValues: field_values,
    })
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

          <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card space-y-3">
            <h3 className="font-display text-lr-md font-semibold text-lr-text">Your fields</h3>
            {creatorFields.length === 0 ? (
              <p className="text-lr-sm text-lr-muted">No creator fields on this template.</p>
            ) : (
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
            )}
          </div>

          <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card space-y-2">
            <h3 className="font-display text-lr-md font-semibold text-lr-text">Signer fields</h3>
            <p className="text-lr-xs text-lr-muted">Filled by signers when they open the signing link.</p>
            {signerFields.length === 0 ? (
              <p className="text-lr-sm text-lr-muted">None.</p>
            ) : (
              <ul className="list-inside list-disc text-lr-sm text-lr-muted">
                {signerFields.map((f) => (
                  <li key={f.id}>{f.label?.trim() || f.type}</li>
                ))}
              </ul>
            )}
          </div>

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
            currentPageIndex={currentPageIndex}
            onPageChange={(i) => scrollToPage(i)}
            fields={fields}
            selectedFieldType={null}
            onAddField={() => {
              /* no-op */
            }}
            onUpdateField={updateField}
            onRemoveField={() => {
              /* no-op */
            }}
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
