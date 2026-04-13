'use client'

import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveSignerIndex } from '@/lib/field-metadata'
import type { StoredField, StoredFieldType } from '@/lib/types'

const TYPE_LABELS: Record<StoredFieldType, string> = {
  signature: 'Signature',
  fullName: 'Full Name',
  title: 'Title',
  date: 'Date',
  text: 'Text',
}

interface SlotConfig {
  key: string
  label: string
  index: number | null
  dotClass: string
  pillClass: string
  borderClass: string
}

const SLOT_CONFIGS: SlotConfig[] = [
  {
    key: 'creator',
    label: 'Creator',
    index: null,
    dotClass: 'bg-lr-muted',
    pillClass: 'border-lr-border text-lr-muted bg-lr-bg',
    borderClass: 'border-l-lr-border',
  },
  {
    key: 's1',
    label: 'Signer 1',
    index: 0,
    dotClass: 'bg-lr-accent',
    pillClass: 'border-lr-accent/40 text-lr-accent bg-lr-accent/5',
    borderClass: 'border-l-lr-accent',
  },
  {
    key: 's2',
    label: 'Signer 2',
    index: 1,
    dotClass: 'bg-lr-cyan',
    pillClass: 'border-lr-cyan/40 text-lr-cyan bg-lr-cyan/5',
    borderClass: 'border-l-lr-cyan',
  },
]

export interface SignerSlotSummaryProps {
  fields: StoredField[]
  signerCount: 1 | 2
}

export function SignerSlotSummary({ fields, signerCount }: SignerSlotSummaryProps) {
  const activeSlots = SLOT_CONFIGS.filter(
    (s) => s.index === null || s.index < signerCount
  )

  return (
    <div className="space-y-2">
      {activeSlots.map((slot) => {
        const slotFields = fields.filter((f) => resolveSignerIndex(f) === slot.index)
        const hasSignatureField = slotFields.some((f) => f.type === 'signature')
        const isSignerSlot = slot.index !== null
        const showWarning = isSignerSlot && slotFields.length > 0 && !hasSignatureField

        return (
          <div
            key={slot.key}
            className={cn(
              'rounded-lr border border-lr-border border-l-4 bg-lr-bg px-3 py-2',
              slot.borderClass
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', slot.dotClass)} />
                <span className="font-display text-lr-xs font-semibold text-lr-text">
                  {slot.label}
                </span>
              </div>
              <span className="text-lr-xs text-lr-muted">
                {slotFields.length} {slotFields.length === 1 ? 'field' : 'fields'}
              </span>
            </div>

            {slotFields.length === 0 ? (
              isSignerSlot ? (
                <p className="text-lr-xs text-lr-muted italic">No fields assigned yet</p>
              ) : (
                <p className="text-lr-xs text-lr-muted italic">No creator fields</p>
              )
            ) : (
              <div className="flex flex-wrap gap-1">
                {slotFields.map((f) => (
                  <span
                    key={f.id}
                    className={cn(
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-lr-xs font-medium',
                      slot.pillClass
                    )}
                  >
                    {f.label?.trim() || TYPE_LABELS[f.type]}
                  </span>
                ))}
              </div>
            )}

            {showWarning && (
              <div className="mt-1.5 flex items-center gap-1 text-lr-xs text-lr-warning">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>No signature field — this signer won&apos;t sign</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
