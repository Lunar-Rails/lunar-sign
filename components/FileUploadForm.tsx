'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DocumentUploadSchema } from '@/lib/schemas'

export default function FileUploadForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    // Validate form
    const validation = DocumentUploadSchema.safeParse({ title, description })
    if (!validation.success) {
      const firstError = validation.error.flatten().fieldErrors
      const errorMessage = Object.values(firstError)[0]?.[0] || 'Validation error'
      setError(errorMessage)
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700"
        >
          Document Title *
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="e.g., Contract Agreement"
        />
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700"
        >
          Description (optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          rows={3}
          placeholder="Add details about this document"
        />
      </div>

      {/* File Drop Zone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          PDF File *
        </label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-md border-2 border-dashed px-6 py-12 text-center transition-colors ${
            isDragging
              ? 'border-gray-900 bg-gray-50'
              : 'border-gray-300 bg-white hover:border-gray-400'
          }`}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <div>
            <svg
              className="mx-auto h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              {file ? (
                <span className="font-medium text-gray-900">{file.name}</span>
              ) : (
                <>
                  <span className="font-medium text-gray-900">
                    Click to upload
                  </span>{' '}
                  or drag and drop
                </>
              )}
            </p>
            <p className="text-xs text-gray-500">PDF up to 50MB</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Uploading...' : 'Upload Document'}
      </button>
    </form>
  )
}
