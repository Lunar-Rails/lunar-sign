'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Tags, UploadCloud, X } from 'lucide-react'

import {
  DocumentCompanyIdsSchema,
  DocumentTypeNamesSchema,
  DocumentUploadSchema,
} from '@/lib/schemas'
import { Company, DocumentType } from '@/lib/types'

interface FileUploadFormProps {
  companies: Company[]
  documentTypes: DocumentType[]
  initialCompanyIds?: string[]
}

function normalizeTypeName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

function isSameTypeName(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' }) === 0
}

export default function FileUploadForm({
  companies,
  documentTypes,
  initialCompanyIds = [],
}: FileUploadFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>(() => {
    const allowed = new Set(companies.map((c) => c.id))
    return initialCompanyIds.filter((id) => allowed.has(id))
  })
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

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      const droppedFile = droppedFiles[0]
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile)
        setError(null)
      } else {
        setError('Please drop a PDF file')
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile)
        setError(null)
      } else {
        setError('Only PDF files are supported')
      }
    }
  }

  function handleCompanyToggle(companyId: string) {
    setSelectedCompanyIds((prev) => {
      if (prev.includes(companyId)) {
        return prev.filter((id) => id !== companyId)
      }
      return [...prev, companyId]
    })
  }

  function handleAddType(rawName: string) {
    const normalized = normalizeTypeName(rawName)
    if (!normalized) return

    setSelectedTypeNames((prev) => {
      const alreadySelected = prev.some((name) => isSameTypeName(name, normalized))
      if (alreadySelected) return prev
      return [...prev, normalized]
    })
    setTypeInput('')
  }

  function handleRemoveType(typeName: string) {
    setSelectedTypeNames((prev) => prev.filter((name) => name !== typeName))
  }

  function handleTypeInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return
    if (e.key !== 'Enter') return
    e.preventDefault()
    handleAddType(typeInput)
  }

  const filteredTypeOptions = useMemo(() => {
    const normalizedInput = normalizeTypeName(typeInput).toLowerCase()
    return documentTypes
      .filter((type) => {
        const alreadySelected = selectedTypeNames.some((name) =>
          isSameTypeName(name, type.name)
        )
        if (alreadySelected) return false
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
      const errorMessage = Object.values(firstError)[0]?.[0] || 'Validation error'
      setError(errorMessage)
      return
    }

    const companyValidation = DocumentCompanyIdsSchema.safeParse({
      companyIds: selectedCompanyIds,
    })
    if (!companyValidation.success) {
      setError('Invalid company selection')
      return
    }

    const typeValidation = DocumentTypeNamesSchema.safeParse({
      typeNames: selectedTypeNames,
    })
    if (!typeValidation.success) {
      setError('Invalid document type selection')
      return
    }

    if (!file) {
      setError('Please select a PDF file')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File must be smaller than 50MB')
      return
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description || '')
      formData.append('file', file)
      typeValidation.data.typeNames.forEach((typeName) =>
        formData.append('typeNames', typeName)
      )
      selectedCompanyIds.forEach((companyId) =>
        formData.append('companyIds', companyId)
      )

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      const data = await response.json()
      router.push(`/documents/${data.data.document.id}`)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred during upload'
      )
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="title" className="lr-label block">
            Document title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="lr-input"
            placeholder="e.g., Master service agreement"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="lr-label block">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="lr-textarea min-h-[3.5rem]"
            rows={3}
            placeholder="Add short context for the signers"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)]">
        <div className="space-y-2">
          <label htmlFor="documentTypeInput" className="lr-label flex items-center gap-2">
            <Tags className="h-3.5 w-3.5" />
            Document types
          </label>
          <div className="rounded-[14px] border border-[rgba(193,178,255,0.12)] bg-[rgba(255,255,255,0.02)] p-3">
            <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-[12px] border border-[rgba(193,178,255,0.1)] bg-[rgba(7,9,18,0.34)] px-3 py-2">
              {selectedTypeNames.map((typeName) => (
                <span key={typeName} className="lr-chip pr-1">
                  {typeName}
                  <button
                    type="button"
                    onClick={() => handleRemoveType(typeName)}
                    className="ml-1 rounded-full p-0.5 text-[var(--lr-accent-soft)] hover:bg-[rgba(124,92,252,0.14)]"
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
                className="min-w-[220px] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-white outline-none placeholder:text-[rgba(201,196,225,0.42)]"
                placeholder="Type and press Enter to create a tag"
              />
            </div>
            {filteredTypeOptions.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-[12px] border border-[rgba(193,178,255,0.12)] bg-[rgba(7,9,18,0.46)]">
                {filteredTypeOptions.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleAddType(type.name)}
                    className="block w-full px-3 py-2 text-left text-sm text-[var(--lr-text-soft)] transition hover:bg-[rgba(124,92,252,0.08)] hover:text-white"
                  >
                    {type.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-[var(--lr-text-muted)]">
            Press Enter to convert typed text into a document type tag.
          </p>
        </div>

        {companies.length > 0 && (
          <div className="space-y-2">
            <label className="lr-label flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5" />
              Assign to companies
            </label>
            <div className="max-h-52 space-y-2 overflow-y-auto rounded-[14px] border border-[rgba(193,178,255,0.12)] bg-[rgba(255,255,255,0.02)] p-3">
              {companies.map((company) => {
                const isChecked = selectedCompanyIds.includes(company.id)
                return (
                  <label
                    key={company.id}
                    className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-[rgba(193,178,255,0.08)] bg-[rgba(124,92,252,0.03)] px-3 py-2 text-sm text-[var(--lr-text-soft)]"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleCompanyToggle(company.id)}
                      className="lr-checkbox h-4 w-4 rounded border-[rgba(193,178,255,0.22)] bg-transparent"
                    />
                    <span>{company.name}</span>
                  </label>
                )
              })}
            </div>
            <p className="text-xs text-[var(--lr-text-muted)]">
              A document can belong to multiple companies.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="lr-label block">PDF file *</label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`lr-dropzone relative px-6 py-12 text-center ${
            isDragging ? 'lr-dropzone-active' : ''
          }`}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <div className="flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(193,178,255,0.18)] bg-[rgba(124,92,252,0.12)] text-[var(--lr-accent-soft)]">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm text-[var(--lr-text-soft)]">
              {file ? (
                <span className="font-medium text-white">{file.name}</span>
              ) : (
                <>
                  <span className="font-medium text-white">Click to upload</span>{' '}
                  or drag and drop
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-[var(--lr-text-muted)]">PDF up to 50MB</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-[14px] border border-[rgba(255,141,151,0.3)] bg-[rgba(255,141,151,0.08)] p-4">
          <p className="text-sm text-[var(--lr-danger)]">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="lr-button lr-button-primary"
        >
          {isLoading ? 'Uploading...' : 'Upload document'}
        </button>
        <span className="text-xs text-[var(--lr-text-muted)]">
          The document opens in the detail view once the upload completes.
        </span>
      </div>
    </form>
  )
}
