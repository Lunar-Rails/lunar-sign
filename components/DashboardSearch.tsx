'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Building2, Search, Tags } from 'lucide-react'

import { Company, Document, DocumentType } from '@/lib/types'
import DocumentTypeInlineEditor from '@/components/DocumentTypeInlineEditor'

interface DashboardDocument extends Document {
  companies: Pick<Company, 'id' | 'name' | 'slug'>[]
  types: Pick<DocumentType, 'id' | 'name'>[]
}

interface DashboardSearchProps {
  documents: DashboardDocument[]
  documentTypes: Pick<DocumentType, 'id' | 'name'>[]
}

function formatCreatedAt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getStatusBadgeStyles(status: string) {
  switch (status) {
    case 'draft':
      return 'lr-status-chip lr-status-draft'
    case 'pending':
      return 'lr-status-chip lr-status-pending'
    case 'completed':
      return 'lr-status-chip lr-status-completed'
    case 'cancelled':
      return 'lr-status-chip lr-status-cancelled'
    default:
      return 'lr-status-chip'
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
      if (prev.includes(typeId)) {
        return prev.filter((currentTypeId) => currentTypeId !== typeId)
      }
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
      <div className="py-10 text-center">
        <div className="lr-grid-card mx-auto max-w-xl p-8">
          <p className="lr-label">Empty orbit</p>
          <h3 className="font-display mt-3 text-2xl font-semibold text-white">
            No documents yet.
          </h3>
          <p className="mt-3 text-sm leading-6 text-[var(--lr-text-soft)]">
            Upload the first PDF to start the signature workflow.
          </p>
          <Link href="/upload" className="lr-button lr-button-primary mt-5">
            Upload your first document
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {documentTypes.length > 0 && (
        <div>
          <p className="lr-label mb-2">Filter by document type</p>
          <div className="flex flex-wrap gap-2">
            {documentTypes.map((type) => {
              const isSelected = selectedTypeIds.includes(type.id)
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleTypeToggle(type.id)}
                  className={isSelected ? 'lr-chip lr-chip-active' : 'lr-chip'}
                >
                  {type.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--lr-text-muted)]" />
        <input
          type="text"
          placeholder="Search documents by title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="lr-input pl-10"
        />
      </div>

      {filteredDocuments.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--lr-text-muted)]">
          No documents matching &ldquo;{searchTerm}&rdquo;.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <article key={doc.id} className="lr-grid-card flex h-full flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <span className={getStatusBadgeStyles(doc.status)}>
                  {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                </span>
                <span className="lr-label text-right">{formatCreatedAt(doc.created_at)}</span>
              </div>

              <h3 className="font-display mt-4 text-lg font-semibold text-white">
                {doc.title}
              </h3>

              <div className="mt-4 space-y-3 text-sm text-[var(--lr-text-soft)]">
                <div>
                  <p className="lr-label mb-2 flex items-center gap-1.5">
                    <Tags className="h-3.5 w-3.5" />
                    Types
                  </p>
                  <DocumentTypeInlineEditor
                    documentId={doc.id}
                    initialTypeNames={doc.types.map((type) => type.name)}
                    availableTypeNames={documentTypes.map((type) => type.name)}
                    isCompact
                  />
                </div>

                <div>
                  <p className="lr-label mb-2 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Companies
                  </p>
                  {doc.companies.length === 0 ? (
                    <span className="text-xs text-[var(--lr-text-muted)]">Unassigned</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {doc.companies.map((company) => (
                        <span key={company.id} className="lr-chip">
                          {company.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-5">
                <Link
                  href={`/documents/${doc.id}`}
                  className="lr-button lr-button-ghost w-full justify-between"
                >
                  View document
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
