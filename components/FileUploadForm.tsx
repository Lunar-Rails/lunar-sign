'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DocumentTypeNamesSchema,
  DocumentUploadSchema,
} from '@/lib/schemas'
import { DocumentType } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AlertCircle, UploadCloud, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadFormProps {
  documentTypes: DocumentType[]
}

function normalizeTypeName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

function isSameTypeName(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' }) === 0
}

export default function FileUploadForm({ documentTypes }: FileUploadFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [selectedTypeNames, setSelectedTypeNames] = useState<string[]>([])
  const [typeInput, setTypeInput] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile?.type === 'application/pdf') {
      setFile(droppedFile)
      setError(null)
    } else {
      setError('Please drop a PDF file')
    }
  }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected?.type === 'application/pdf') {
      setFile(selected)
      setError(null)
    } else if (selected) {
      setError('Only PDF files are supported')
    }
  }

  function handleAddType(rawName: string) {
    const normalized = normalizeTypeName(rawName)
    if (!normalized) return
    setSelectedTypeNames((prev) => {
      if (prev.some((name) => isSameTypeName(name, normalized))) return prev
      return [...prev, normalized]
    })
    setTypeInput('')
  }

  function handleRemoveType(typeName: string) {
    setSelectedTypeNames((prev) => prev.filter((name) => name !== typeName))
  }

  function handleTypeInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing || e.key !== 'Enter') return
    e.preventDefault()
    handleAddType(typeInput)
  }

  const filteredTypeOptions = useMemo(() => {
    const normalizedInput = normalizeTypeName(typeInput).toLowerCase()
    return documentTypes
      .filter((type) => {
        if (selectedTypeNames.some((name) => isSameTypeName(name, type.name))) return false
        if (!normalizedInput) return true
        return type.name.toLowerCase().includes(normalizedInput)
      })
      .slice(0, 8)
  }, [documentTypes, selectedTypeNames, typeInput])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const validation = DocumentUploadSchema.safeParse({ title, description })
    if (!validation.success) {
      const firstError = validation.error.flatten().fieldErrors
      setError(Object.values(firstError)[0]?.[0] || 'Validation error')
      return
    }

    const typeValidation = DocumentTypeNamesSchema.safeParse({ typeNames: selectedTypeNames })
    if (!typeValidation.success) { setError('Invalid document type selection'); return }

    if (!file) { setError('Please select a PDF file'); return }
    if (file.size > 50 * 1024 * 1024) { setError('File must be smaller than 50MB'); return }

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description || '')
      formData.append('file', file)
      typeValidation.data.typeNames.forEach((typeName) => formData.append('typeNames', typeName))

      const response = await fetch('/api/documents/upload', { method: 'POST', body: formData })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      const data = await response.json()
      router.push(`/documents/${data.data.document.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during upload')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <Label htmlFor="title">Document Title *</Label>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Service Agreement"
        />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description <span className="normal-case text-lr-muted">(optional)</span></Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Add details about this document"
        />
      </div>

      {/* Document Types */}
      <div>
        <Label htmlFor="documentTypeInput">Document Types</Label>
        <div className="mt-1.5 rounded-lr border border-lr-border bg-lr-surface p-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lr border border-lr-border-2 bg-lr-glass px-2 py-1.5 min-h-[36px]">
            {selectedTypeNames.map((typeName) => (
              <span
                key={typeName}
                className="inline-flex items-center gap-1 rounded-full bg-lr-accent-dim px-2.5 py-0.5 text-lr-xs font-medium text-lr-accent"
              >
                {typeName}
                <button
                  type="button"
                  onClick={() => handleRemoveType(typeName)}
                  className="rounded-full p-0.5 hover:bg-lr-accent/20"
                  aria-label={`Remove ${typeName}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              id="documentTypeInput"
              type="text"
              value={typeInput}
              onChange={(e) => setTypeInput(e.target.value)}
              onKeyDown={handleTypeInputKeyDown}
              className="min-w-[200px] flex-1 border-0 bg-transparent px-1 py-0.5 text-lr-sm text-lr-text placeholder:text-lr-muted focus:outline-none"
              placeholder="Type and press Enter to add a tag"
            />
          </div>
          {filteredTypeOptions.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-lr border border-lr-border bg-lr-bg">
              {filteredTypeOptions.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleAddType(type.name)}
                  className="block w-full px-3 py-2 text-left text-lr-sm text-lr-text-2 hover:bg-lr-surface hover:text-lr-text"
                >
                  {type.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="mt-1 text-lr-xs text-lr-muted">
          Press Enter to convert typed text into a document type tag.
        </p>
      </div>

      {/* File Drop Zone */}
      <div>
        <Label>PDF File *</Label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative mt-1.5 rounded-lr-lg border-2 border-dashed px-6 py-12 text-center transition-colors duration-lr-fast',
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
            {file ? (
              <span className="font-medium text-lr-text">{file.name}</span>
            ) : (
              <>
                <span className="font-medium text-lr-accent">Click to upload</span> or drag and drop
              </>
            )}
          </p>
          <p className="text-lr-xs text-lr-muted">PDF up to 50MB</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lr border-l-4 border-l-lr-error bg-lr-error-dim px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-lr-error" />
          <p className="text-lr-sm text-lr-error">{error}</p>
        </div>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Uploading…' : 'Upload Document'}
      </Button>
    </form>
  )
}
