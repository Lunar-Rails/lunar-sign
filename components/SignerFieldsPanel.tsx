'use client'

import type { FieldPlacement } from '@drvillo/react-browser-e-signing'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resolveSignerIndex } from '@/lib/field-metadata'
import type { StoredField } from '@/lib/types'

export interface SignerFieldsPanelProps {
  stored: StoredField[]
  fields: FieldPlacement[]
  updateField: (fieldId: string, partial: Partial<FieldPlacement>) => void
  /** Which signer slot is active. null = legacy single-signer (show all signer text fields). */
  signerIndex?: number | null
}

export function SignerFieldsPanel({ stored, fields, updateField, signerIndex }: SignerFieldsPanelProps) {
  const textSignerFields = stored.filter((s) => {
    if (s.type !== 'text') return false
    const idx = resolveSignerIndex(s)
    if (idx === null) return false
    // When signerIndex is defined, filter to current signer only; otherwise show all signer fields
    if (signerIndex != null) return idx === signerIndex
    return true
  })

  if (textSignerFields.length === 0) return null

  return (
    <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card">
      <h2 className="text-section-label mb-3">Text to enter</h2>
      <p className="text-caption mb-3">
        Complete these fields. They will be embedded in the signed PDF.
      </p>
      <ul className="space-y-3">
        {textSignerFields.map((s) => {
          const placement = fields.find((f) => f.id === s.id)
          const label = s.label?.trim() || 'Text'
          return (
            <li key={s.id}>
              <Label className="text-caption" htmlFor={`signer-text-${s.id}`}>
                {label}
              </Label>
              <Input
                id={`signer-text-${s.id}`}
                className="mt-1"
                value={placement?.value ?? ''}
                onChange={(e) => updateField(s.id, { value: e.target.value })}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
