'use client'

import type { FieldPlacement } from '@drvillo/react-browser-e-signing'

import type { StoredField } from '@/lib/types'

export interface TemplateCreatorFieldsSummaryProps {
  stored: StoredField[]
  fields: FieldPlacement[]
}

export function TemplateCreatorFieldsSummary({
  stored,
  fields,
}: TemplateCreatorFieldsSummaryProps) {
  const creator = stored.filter((s) => !s.forSigner)
  if (creator.length === 0) return null

  return (
    <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card">
      <h2 className="text-section-label mb-2">Pre-filled fields</h2>
      <ul className="space-y-2 text-body">
        {creator.map((s) => {
          const placement = fields.find((f) => f.id === s.id)
          const label = s.label?.trim() || s.type
          const value = placement?.value ?? s.value ?? ''
          if (!value) return null
          return (
            <li key={s.id}>
              <span className="font-medium text-lr-text">{label}:</span>{' '}
              <span className="text-lr-text-2">{value}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
