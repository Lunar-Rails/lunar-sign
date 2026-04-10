'use client'

import { KeyboardEvent, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { DocumentTypeNamesSchema } from '@/lib/schemas'

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
  const aNormalized = a.map((value) => value.toLowerCase()).sort()
  const bNormalized = b.map((value) => value.toLowerCase()).sort()
  return aNormalized.every((value, index) => value === bNormalized[index])
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
    () => new Set(parsedDraftTypeNames.map((typeName) => typeName.toLowerCase())),
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
    const validation = DocumentTypeNamesSchema.safeParse({
      typeNames: parsedTypeNames,
    })
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors
      const errorMessage = Object.values(fieldErrors)[0]?.[0] || 'Validation error'
      setError(errorMessage)
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
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update document type')
      }

      setTypeNames(validation.data.typeNames)
      setIsEditing(false)
      router.refresh()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to update document type'
      )
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
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleSave()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      handleCancel()
    }
  }

  function handleToggleExistingType(typeName: string) {
    const normalizedTypeName = normalizeTypeName(typeName)
    if (!normalizedTypeName) return

    const alreadySelected = selectedTypeNamesLowercase.has(
      normalizedTypeName.toLowerCase()
    )
    if (alreadySelected) {
      const nextTypeNames = parsedDraftTypeNames.filter(
        (name) =>
          name.localeCompare(normalizedTypeName, undefined, {
            sensitivity: 'base',
          }) !== 0
      )
      setDraftValue(nextTypeNames.join(', '))
      return
    }

    setDraftValue([...parsedDraftTypeNames, normalizedTypeName].join(', '))
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        <input
          type="text"
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            void handleSave()
          }}
          autoFocus
          disabled={isSaving}
          className={`lr-input py-2 text-xs ${isCompact ? 'w-52 max-w-full' : 'w-full'}`}
          placeholder="Type names separated by commas"
        />
        {availableTypeNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {availableTypeNames.map((typeName) => {
              const isSelected = selectedTypeNamesLowercase.has(
                typeName.toLowerCase()
              )
              return (
                <button
                  key={typeName}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleToggleExistingType(typeName)}
                  className={isSelected ? 'lr-chip lr-chip-active' : 'lr-chip'}
                >
                  {typeName}
                </button>
              )
            })}
          </div>
        )}
        {error && <p className="text-xs text-[var(--lr-danger)]">{error}</p>}
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
          <span className="text-xs text-[var(--lr-text-muted)] hover:text-white">
            {emptyLabel}
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {typeNames.map((typeName) => (
              <span key={typeName} className="lr-chip">
                {typeName}
              </span>
            ))}
          </div>
        )}
      </button>
      {error && <p className="text-xs text-[var(--lr-danger)]">{error}</p>}
    </div>
  )
}
