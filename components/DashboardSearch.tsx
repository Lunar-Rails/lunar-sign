'use client'

import { useState, useMemo } from 'react'
import { Company, Document, DocumentType } from '@/lib/types'
import Link from 'next/link'
import DocumentTypeInlineEditor from '@/components/DocumentTypeInlineEditor'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

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

type StatusVariant = 'default' | 'warning' | 'success' | 'destructive' | 'secondary'

function getStatusVariant(status: string): StatusVariant {
  switch (status) {
    case 'draft': return 'secondary'
    case 'pending': return 'warning'
    case 'completed': return 'success'
    case 'cancelled': return 'destructive'
    default: return 'secondary'
  }
}

export default function DashboardSearch({ documents, documentTypes }: DashboardSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([])

  function handleTypeToggle(typeId: string) {
    setSelectedTypeIds((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]
    )
  }

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = searchTerm
        ? doc.title.toLowerCase().includes(searchTerm.toLowerCase())
        : true
      if (!matchesSearch) return false
      if (selectedTypeIds.length === 0) return true
      return doc.types.some((type) => selectedTypeIds.includes(type.id))
    })
  }, [documents, searchTerm, selectedTypeIds])

  if (documents.length === 0) {
    return (
      <div className="py-16 text-center">
        <FileText className="mx-auto h-12 w-12 text-lr-muted" />
        <h3 className="mt-4 text-card-title">No documents yet</h3>
        <p className="text-body mt-2">Upload your first document to get started.</p>
        <Button asChild className="mt-4">
          <Link href="/upload">Upload Your First Document</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {documentTypes.length > 0 && (
        <div>
          <p className="text-section-label mb-2">Filter by type</p>
          <div className="flex flex-wrap gap-2">
            {documentTypes.map((type) => {
              const isSelected = selectedTypeIds.includes(type.id)
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleTypeToggle(type.id)}
                  className={cn(
                    'inline-flex h-6 items-center rounded-full px-2.5 text-lr-xs font-medium transition-colors duration-lr-fast',
                    isSelected
                      ? 'bg-lr-accent text-white'
                      : 'bg-transparent border border-lr-border text-lr-muted hover:border-lr-border-2 hover:text-lr-text-2'
                  )}
                >
                  {type.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lr-muted" />
        <Input
          type="text"
          placeholder="Search documents by title…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredDocuments.length === 0 ? (
        <p className="py-8 text-center text-body">
          No documents matching &ldquo;{searchTerm}&rdquo;
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Companies</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow key={doc.id} className="hover:bg-lr-surface transition-colors">
                  <TableCell className="font-medium text-lr-text">{doc.title}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(doc.status)}>
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-caption whitespace-nowrap">{formatCreatedAt(doc.created_at)}</TableCell>
                  <TableCell>
                    <DocumentTypeInlineEditor
                      documentId={doc.id}
                      initialTypeNames={doc.types.map((t) => t.name)}
                      availableTypeNames={documentTypes.map((t) => t.name)}
                      isCompact
                    />
                  </TableCell>
                  <TableCell>
                    {doc.companies.length === 0 ? (
                      <span className="text-caption">Unassigned</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {doc.companies.map((company) => (
                          <Badge key={company.id} variant="outline">{company.name}</Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/documents/${doc.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
