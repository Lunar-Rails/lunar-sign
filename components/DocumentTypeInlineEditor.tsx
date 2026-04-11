'use client'

import { KeyboardEvent, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DocumentTypeNamesSchema } from '@/lib/schemas'
import { cn } from '@/lib/utils'

interface DocumentTypeInlineEditorProps {
  documentId: string
  initialTypeNames: string[]
  availableTypeNames?: string[]
  emptyLabel?: string
  isCompact?: boolean
}

function normalizeTypeName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

function parseTypeNames(value: string) {
  const parts = value.split(',').map(normalizeTypeName).filter(Boolean)
  return Array.from(
    new Map(parts.map((typeName) => [typeName.toLowerCase(), typeName])).values()
  )
}

function typeNamesAreEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  const aNormalized = a.map((v) => v.toLowerCase()).sort()
  const bNormalized = b.map((v) => v.toLowerCase()).sort()
  return aNormalized.every((v, i) => v === bNormalized[i])
}

export default function DocumentTypeInlineEditor({
  documentId,
  initialTypeNames,
  availableTypeNames = [],
  emptyLabel = 'Unassigned',
  isCompact = false,
}: DocumentTypeInlineEditorProps) {
  const router = useRouter()
  const [typeNames, setTypeNames] = useState<string[]>(initialTypeNames)
  const [isEditing, setIsEditing] = useState(false)
  const [draftValue, setDraftValue] = useState(initialTypeNames.join(', '))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSavingRef = useRef(false)

  const parsedDraftTypeNames = useMemo(() => parseTypeNames(draftValue), [draftValue])
  const selectedTypeNamesLowercase = useMemo(
    () => new Set(parsedDraftTypeNames.map((n) => n.toLowerCase())),
    [parsedDraftTypeNames]
  )

  function handleStartEditing() {
    setError(null)
    setDraftValue(typeNames.join(', '))
    setIsEditing(true)
  }

  async function handleSave() {
    if (isSavingRef.current) return

    const parsedTypeNames = parseTypeNames(draftValue)
    const validation = DocumentTypeNamesSchema.safeParse({ typeNames: parsedTypeNames })
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors
      setError(Object.values(fieldErrors)[0]?.[0] || 'Validation error')
      return
    }

    if (typeNamesAreEqual(typeNames, validation.data.typeNames)) {
      setError(null)
      setIsEditing(false)
      return
    }

    setError(null)
    setIsSaving(true)
    isSavingRef.current = true
    try {
      const response = await fetch(`/api/documents/${documentId}/types`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ typeNames: validation.data.typeNames }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to update document type')

      setTypeNames(validation.data.typeNames)
      setIsEditing(false)
      router.refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to update document type')
    } finally {
      setIsSaving(false)
      isSavingRef.current = false
    }
  }

  function handleCancel() {
    if (isSaving) return
    setError(null)
    setDraftValue(typeNames.join(', '))
    setIsEditing(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Enter') { event.preventDefault(); void handleSave(); return }
    if (event.key === 'Escape') { event.preventDefault(); handleCancel() }
  }

  function handleToggleExistingType(typeName: string) {
    const normalizedTypeName = normalizeTypeName(typeName)
    if (!normalizedTypeName) return

    const alreadySelected = selectedTypeNamesLowercase.has(normalizedTypeName.toLowerCase())
    if (alreadySelected) {
      const nextTypeNames = parsedDraftTypeNames.filter(
        (name) => name.localeCompare(normalizedTypeName, undefined, { sensitivity: 'base' }) !== 0
      )
      setDraftValue(nextTypeNames.join(', '))
      return
    }
    setDraftValue([...parsedDraftTypeNames, normalizedTypeName].join(', '))
  }

  if (isEditing) {
    return (
      <div className="space-y-1.5">
        <input
          type="text"
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => void handleSave()}
          autoFocus
          disabled={isSaving}
          className={cn(
            'rounded-lr border border-lr-border bg-lr-surface px-2 py-1 text-lr-xs text-lr-text focus:outline-none focus:border-lr-accent focus:ring-1 focus:ring-lr-accent disabled:opacity-50',
            isCompact ? 'w-52 max-w-full' : 'w-full'
          )}
          placeholder="Type names separated by commas"
        />
        {availableTypeNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {availableTypeNames.map((typeName) => {
              const isSelected = selectedTypeNamesLowercase.has(typeName.toLowerCase())
              return (
                <button
                  key={typeName}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleToggleExistingType(typeName)}
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-lr-xs font-medium transition-colors',
                    isSelected
                      ? 'bg-lr-accent text-white'
                      : 'bg-lr-surface border border-lr-border text-lr-muted hover:text-lr-text-2'
                  )}
                >
                  {typeName}
                </button>
              )
            })}
          </div>
        )}
        {error && <p className="text-lr-xs text-lr-error">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleStartEditing}
        className="w-full text-left"
        title="Click to edit document type"
      >
        {typeNames.length === 0 ? (
          <span className="text-lr-xs text-lr-muted hover:text-lr-text-2 transition-colors">{emptyLabel}</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {typeNames.map((typeName) => (
              <span
                key={typeName}
                className="inline-flex items-center rounded-full bg-lr-accent-dim px-2 py-0.5 text-lr-xs font-medium text-lr-accent hover:bg-lr-accent/15 transition-colors"
              >
                {typeName}
              </span>
            ))}
          </div>
        )}
      </button>
      {error && <p className="text-lr-xs text-lr-error">{error}</p>}
    </div>
  )
}
