'use client'

import Link from 'next/link'
import type { DocumentType } from '@/lib/types'
import type { StoredField } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface TemplateCardProps {
  template: {
    id: string
    title: string
    description: string | null
    created_at: string
    updated_at: string
    field_metadata: unknown
    document_types: Pick<DocumentType, 'id' | 'name'> | null
  }
}

export function TemplateCard({ template }: TemplateCardProps) {
  const meta = Array.isArray(template.field_metadata)
    ? (template.field_metadata as StoredField[])
    : []
  const fieldCount = meta.length
  const signerFields = meta.filter((f) => f.forSigner).length

  return (
    <Card className="flex flex-col border-lr-border bg-lr-surface shadow-lr-card">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-card-title text-lr-text">
            <Link
              href={`/templates/${template.id}`}
              className="hover:text-lr-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lr-accent"
            >
              {template.title}
            </Link>
          </CardTitle>
          {template.document_types && (
            <Badge variant="secondary" className="shrink-0">
              {template.document_types.name}
            </Badge>
          )}
        </div>
        {template.description && (
          <p className="text-caption text-lr-muted line-clamp-2">
            {template.description}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        <dl className="grid grid-cols-2 gap-2 text-caption text-lr-muted">
          <div>
            <dt className="text-micro uppercase tracking-wider">Fields</dt>
            <dd className="text-lr-text">{fieldCount}</dd>
          </div>
          <div>
            <dt className="text-micro uppercase tracking-wider">For signer</dt>
            <dd className="text-lr-text">{signerFields}</dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t border-lr-border pt-4">
        <Button asChild size="sm" variant="secondary">
          <Link href={`/templates/${template.id}`}>View</Link>
        </Button>
        <Button asChild size="sm">
          <Link href={`/templates/${template.id}/create-document`}>
            Create document
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
