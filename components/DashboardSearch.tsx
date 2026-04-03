'use client'

import { useState, useMemo } from 'react'
import { Company, Document, DocumentType } from '@/lib/types'
import Link from 'next/link'
import DocumentTypeInlineEditor from '@/components/DocumentTypeInlineEditor'

interface DashboardDocument extends Document {
  companies: Pick<Company, 'id' | 'name' | 'slug'>[]
  types: Pick<DocumentType, 'id' | 'name'>[]
}

interface DashboardSearchProps {
  documents: DashboardDocument[]
  documentTypes: Pick<DocumentType, 'id' | 'name'>[]
}

/** Fixed locale + options so SSR (Node) and the browser produce the same string — avoids hydration mismatch. */
function formatCreatedAt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function getStatusBadgeStyles(status: string) {
  switch (status) {
    case 'draft':
      return 'inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800'
    case 'pending':
      return 'inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800'
    case 'completed':
      return 'inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800'
    case 'cancelled':
      return 'inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800'
    default:
      return ''
  }
}

export default function DashboardSearch({
  documents,
  documentTypes,
}: DashboardSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([])

  function handleTypeToggle(typeId: string) {
    setSelectedTypeIds((prev) => {
      if (prev.includes(typeId))
        return prev.filter((currentTypeId) => currentTypeId !== typeId)
      return [...prev, typeId]
    })
  }

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearchTerm = searchTerm
        ? doc.title.toLowerCase().includes(searchTerm.toLowerCase())
        : true
      if (!matchesSearchTerm) return false

      if (selectedTypeIds.length === 0) return true
      return doc.types.some((type) => selectedTypeIds.includes(type.id))
    })
  }, [documents, searchTerm, selectedTypeIds])

  if (documents.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">No documents yet.</p>
        <Link
          href="/upload"
          className="mt-2 inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Upload Your First Document
        </Link>
      </div>
    )
  }

  return (
    <div>
      {documentTypes.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Filter by type
          </p>
          <div className="flex flex-wrap gap-2">
            {documentTypes.map((type) => {
              const isSelected = selectedTypeIds.includes(type.id)
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleTypeToggle(type.id)}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <input
        type="text"
        placeholder="Search documents by title..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
      />

      {filteredDocuments.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          No documents matching &ldquo;{searchTerm}&rdquo;
        </p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-3 text-left text-xs font-medium text-gray-500">
                Title
              </th>
              <th className="py-3 text-left text-xs font-medium text-gray-500">
                Status
              </th>
              <th className="py-3 text-left text-xs font-medium text-gray-500">
                Created
              </th>
              <th className="py-3 text-left text-xs font-medium text-gray-500">
                Type
              </th>
              <th className="py-3 text-left text-xs font-medium text-gray-500">
                Companies
              </th>
              <th className="py-3 text-left text-xs font-medium text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredDocuments.map((doc) => (
              <tr key={doc.id} className="border-b border-gray-100">
                <td className="py-4 text-sm text-gray-900">{doc.title}</td>
                <td className="py-4 text-sm">
                  <span className={getStatusBadgeStyles(doc.status)}>
                    {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                  </span>
                </td>
                <td className="py-4 text-sm text-gray-600">
                  {formatCreatedAt(doc.created_at)}
                </td>
                <td className="py-4 text-sm text-gray-600">
                  <DocumentTypeInlineEditor
                    documentId={doc.id}
                    initialTypeNames={doc.types.map((type) => type.name)}
                    availableTypeNames={documentTypes.map((type) => type.name)}
                    isCompact
                  />
                </td>
                <td className="py-4 text-sm text-gray-600">
                  {doc.companies.length === 0 ? (
                    <span className="text-xs text-gray-500">Unassigned</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {doc.companies.map((company) => (
                        <span
                          key={company.id}
                          className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                        >
                          {company.name}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-4 text-sm">
                  <Link
                    href={`/documents/${doc.id}`}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
