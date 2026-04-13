'use client'

import type { FieldPlacement, FieldType } from '@drvillo/react-browser-e-signing'

import { SignerAssignmentControl } from '@/components/SignerAssignmentControl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<FieldType, string> = {
  signature: 'Signature',
  fullName: 'Full name',
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
  onLabelChange,
  onSignerIndexChange,
  onRemoveField,
}: TemplateFieldListProps) {
  if (fields.length === 0)
    return (
      <p className="text-lr-sm text-lr-muted">
        Place fields on the PDF using the palette, then configure labels and which signer fills each one.
      </p>
    )

  return (
    <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
      {fields.map((field) => {
        const idx = signerIndexById[field.id] ?? null
        const key = signerKey(idx)
        return (
          <li
            key={field.id}
            className={cn(
              'rounded-lr border border-lr-border border-l-4 bg-lr-bg p-3 shadow-sm transition-colors',
              SIGNER_BORDER_CLASS[key]
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <Badge variant="outline" className="text-micro">
                {TYPE_LABELS[field.type]}
              </Badge>
              <Button type="button" variant="ghost" size="sm" onClick={() => onRemoveField(field.id)}>
                Remove
              </Button>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-micro text-lr-muted" htmlFor={`field-label-${field.id}`}>
                  Label
                </Label>
                <Input
                  id={`field-label-${field.id}`}
                  value={field.label ?? ''}
                  onChange={(e) => onLabelChange({ fieldId: field.id, label: e.target.value })}
                  placeholder="e.g. Company name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-micro text-lr-muted mb-1 block">Filled by</Label>
                <SignerAssignmentControl
                  value={idx}
                  onChange={(signerIndex) => onSignerIndexChange({ fieldId: field.id, signerIndex })}
                  signerCount={signerCount}
                />
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
