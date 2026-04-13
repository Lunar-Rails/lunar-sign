'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Company, DocumentType } from '@/lib/types'
import { getTemplateReadiness, type TemplateReadiness } from '@/lib/template-readiness'
import { statusToBadgeVariant } from '@/lib/status-badge-variant'
import { LibraryListFilters } from '@/components/LibraryListFilters'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FileText } from 'lucide-react'

export interface TemplateListRow {
  id: string
  title: string
  document_type_id: string | null
  field_metadata: unknown
  created_at: string
  updated_at: string
  types: Pick<DocumentType, 'id' | 'name'>[]
  companies: Pick<Company, 'id' | 'name' | 'slug'>[]
}

interface TemplatesSearchProps {
  templates: TemplateListRow[]
  documentTypes: Pick<DocumentType, 'id' | 'name'>[]
}

function formatUpdatedAt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function readinessLabel(r: TemplateReadiness): string {
  return r.charAt(0).toUpperCase() + r.slice(1)
}

export default function TemplatesSearch({ templates, documentTypes }: TemplatesSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([])

  function handleTypeToggle(typeId: string) {
    setSelectedTypeIds((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]
    )
  }

  const filtered = useMemo(() => {
    return templates.filter((row) => {
      const matchesSearch = searchTerm
        ? row.title.toLowerCase().includes(searchTerm.toLowerCase())
        : true
      if (!matchesSearch) return false
      if (selectedTypeIds.length === 0) return true
      return row.types.some((type) => selectedTypeIds.includes(type.id))
    })
  }, [templates, searchTerm, selectedTypeIds])

  if (templates.length === 0) {
    return (
      <div className="py-16 text-center">
        <FileText className="mx-auto h-12 w-12 text-lr-muted" />
        <h3 className="mt-4 text-card-title">No templates yet</h3>
        <p className="text-body mt-2">Upload your first template to get started.</p>
        <Button asChild className="mt-4">
          <Link href="/templates/new">Upload your first template</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <LibraryListFilters
        documentTypes={documentTypes}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        selectedTypeIds={selectedTypeIds}
        onToggleType={handleTypeToggle}
        searchPlaceholder="Search templates by title…"
      />

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-body">
          No templates matching &ldquo;{searchTerm}&rdquo;
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Companies</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => {
                const readiness = getTemplateReadiness({
                  document_type_id: row.document_type_id,
                  field_metadata: row.field_metadata,
                  companyLinkCount: row.companies.length,
                })
                return (
                  <TableRow key={row.id} className="hover:bg-lr-surface transition-colors">
                    <TableCell className="font-medium text-lr-text">{row.title}</TableCell>
                    <TableCell>
                      <Badge variant={statusToBadgeVariant(readiness)}>
                        {readinessLabel(readiness)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-caption whitespace-nowrap">
                      {formatUpdatedAt(row.updated_at)}
                    </TableCell>
                    <TableCell>
                      {row.types.length === 0 ? (
                        <span className="text-caption">Unassigned</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {row.types.map((t) => (
                            <Badge key={t.id} variant="outline">
                              {t.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.companies.length === 0 ? (
                        <span className="text-caption">Unassigned</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {row.companies.map((c) => (
                            <Badge key={c.id} variant="outline">
                              {c.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/templates/${row.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
