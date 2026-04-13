'use client'

import type { FieldPlacement, FieldType } from '@drvillo/react-browser-e-signing'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const TYPE_LABELS: Record<FieldType, string> = {
  signature: 'Signature',
  fullName: 'Full name',
  title: 'Title',
  date: 'Date',
  text: 'Text',
}

export interface TemplateFieldListProps {
  fields: FieldPlacement[]
  forSignerById: Record<string, boolean>
  onLabelChange: (input: { fieldId: string; label: string }) => void
  onForSignerChange: (input: { fieldId: string; forSigner: boolean }) => void
  onRemoveField: (fieldId: string) => void
}

export function TemplateFieldList({
  fields,
  forSignerById,
  onLabelChange,
  onForSignerChange,
  onRemoveField,
}: TemplateFieldListProps) {
  if (fields.length === 0)
    return (
      <p className="text-lr-sm text-lr-muted">
        Place fields on the PDF using the palette, then configure labels and whether each is
        filled by the signer.
      </p>
    )

  return (
    <ul className="max-h-72 space-y-3 overflow-y-auto pr-1">
      {fields.map((field) => (
        <li
          key={field.id}
          className="rounded-lr border border-lr-border bg-lr-surface p-3 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="outline" className="text-micro">
              {TYPE_LABELS[field.type]}
            </Badge>
            <Button type="button" variant="ghost" size="sm" onClick={() => onRemoveField(field.id)}>
              Remove
            </Button>
          </div>
          <div className="mt-2 space-y-2">
            <div>
              <Label className="text-micro text-lr-muted" htmlFor={`field-label-${field.id}`}>
                Label
              </Label>
              <Input
                id={`field-label-${field.id}`}
                value={field.label ?? ''}
                onChange={(e) =>
                  onLabelChange({ fieldId: field.id, label: e.target.value })
                }
                placeholder="e.g. Company name"
                className="mt-1"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-lr-sm text-lr-text">
              <input
                type="checkbox"
                checked={forSignerById[field.id] ?? false}
                onChange={(e) =>
                  onForSignerChange({ fieldId: field.id, forSigner: e.target.checked })
                }
                className="h-4 w-4 rounded border-lr-border accent-lr-accent"
              />
              For signer
            </label>
          </div>
        </li>
      ))}
    </ul>
  )
}
