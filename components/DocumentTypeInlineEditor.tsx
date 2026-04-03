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

  const parsedDraftTypeNames = useMemo(
    () => parseTypeNames(draftValue),
    [draftValue]
  )
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
      if (!response.ok)
        throw new Error(payload.error || 'Failed to update document type')

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
      <div className="space-y-1">
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
          className={`rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:cursor-not-allowed disabled:bg-gray-50 ${
            isCompact ? 'w-52 max-w-full' : 'w-full'
          }`}
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
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {typeName}
                </button>
              )
            })}
          </div>
        )}
        {error && <p className="text-xs text-red-700">{error}</p>}
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
          <span className="text-xs text-gray-500 hover:text-gray-700">{emptyLabel}</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {typeNames.map((typeName) => (
              <span
                key={typeName}
                className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
              >
                {typeName}
              </span>
            ))}
          </div>
        )}
      </button>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  )
}
