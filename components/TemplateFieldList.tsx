'use client'

import type { FieldPlacement, FieldType } from '@drvillo/react-browser-e-signing'

import { SignerAssignmentControl } from '@/components/SignerAssignmentControl'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<FieldType, string> = {
  signature: 'Sig',
  fullName: 'Name',
  title: 'Title',
  date: 'Date',
  text: 'Text',
}

const SIGNER_BORDER_CLASS: Record<string, string> = {
  creator: 'border-l-lr-muted',
  s1: 'border-l-lr-accent',
  s2: 'border-l-lr-cyan',
}

function signerKey(idx: number | null): string {
  if (idx === null) return 'creator'
  if (idx === 0) return 's1'
  return 's2'
}

export interface TemplateFieldListProps {
  fields: FieldPlacement[]
  signerIndexById: Record<string, number | null>
  signerCount: 1 | 2
  onLabelChange: (input: { fieldId: string; label: string }) => void
  onSignerIndexChange: (input: { fieldId: string; signerIndex: number | null }) => void
  onRemoveField: (fieldId: string) => void
}

export function TemplateFieldList({
  fields,
  signerIndexById,
  signerCount,
  onSignerIndexChange,
}: TemplateFieldListProps) {
  if (fields.length === 0)
    return (
      <p className="text-caption text-lr-muted italic">
        Click on the PDF to place fields, then assign them below.
      </p>
    )

  return (
    <ul className="space-y-1">
      {fields.map((field) => {
        const idx = signerIndexById[field.id] ?? null
        const key = signerKey(idx)
        const label = field.label?.trim() || TYPE_LABELS[field.type]
        return (
          <li
            key={field.id}
            className={cn(
              'flex items-center gap-2 rounded-lr border border-lr-border border-l-4 bg-lr-bg px-2.5 py-1.5',
              SIGNER_BORDER_CLASS[key]
            )}
          >
            <Badge variant="outline" className="text-micro shrink-0">
              {TYPE_LABELS[field.type]}
            </Badge>
            <span className="flex-1 min-w-0 text-caption text-lr-text truncate" title={label}>
              {label}
            </span>
            <SignerAssignmentControl
              value={idx}
              onChange={(signerIndex) => onSignerIndexChange({ fieldId: field.id, signerIndex })}
              signerCount={signerCount}
            />
          </li>
        )
      })}
    </ul>
  )
}
