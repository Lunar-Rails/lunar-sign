'use client'

import { useState } from 'react'
import Link from 'next/link'

import { DeleteDocumentButton } from '@/components/DeleteDocumentButton'
import type { Document } from '@/lib/types'

interface DocumentRow extends Pick<Document, 'id' | 'title' | 'status' | 'created_at'> {}

interface TemplateDocumentsListProps {
  documents: DocumentRow[]
}

export function TemplateDocumentsList({ documents }: TemplateDocumentsListProps) {
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  const visible = documents.filter((d) => !deletedIds.has(d.id))

  if (visible.length === 0)
    return <p className="mt-4 text-lr-sm text-lr-muted">None yet.</p>

  return (
    <ul className="mt-4 divide-y divide-lr-border">
      {visible.map((doc) => (
        <li key={doc.id} className="flex items-start justify-between gap-2 py-3 first:pt-0">
          <div className="min-w-0">
            <Link
              href={`/documents/${doc.id}`}
              className="font-medium text-lr-accent hover:underline"
            >
              {doc.title}
            </Link>
            <p className="text-lr-xs text-lr-muted">
              {doc.status} · {new Date(doc.created_at).toLocaleString()}
            </p>
          </div>
          {doc.status === 'draft' && (
            <DeleteDocumentButton
              documentId={doc.id}
              documentTitle={doc.title}
              iconOnly
              onDeleted={() => setDeletedIds((prev) => new Set([...prev, doc.id]))}
            />
          )}
        </li>
      ))}
    </ul>
  )
}
