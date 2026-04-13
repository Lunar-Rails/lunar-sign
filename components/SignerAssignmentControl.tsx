'use client'

import { cn } from '@/lib/utils'

const SIGNER_DOT_CLASS: Record<string, string> = {
  creator: 'bg-lr-muted',
  s1: 'bg-lr-accent',
  s2: 'bg-lr-cyan',
}

const SIGNER_ACTIVE_CLASS: Record<string, string> = {
  creator: 'bg-lr-surface-2 text-lr-text border-lr-border',
  s1: 'bg-lr-accent text-white border-lr-accent',
  s2: 'bg-lr-cyan text-white border-lr-cyan',
}

interface Segment {
  key: string
  label: string
  value: number | null
}

const ALL_SEGMENTS: Segment[] = [
  { key: 'creator', label: 'Creator', value: null },
  { key: 's1', label: 'S1', value: 0 },
  { key: 's2', label: 'S2', value: 1 },
]

export interface SignerAssignmentControlProps {
  value: number | null
  onChange: (signerIndex: number | null) => void
  signerCount: 1 | 2
  className?: string
}

export function SignerAssignmentControl({
  value,
  onChange,
  signerCount,
  className,
}: SignerAssignmentControlProps) {
  const segments = ALL_SEGMENTS.filter(
    (s) => s.value === null || s.value < signerCount
  )

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lr border border-lr-border bg-lr-bg p-0.5 gap-0.5',
        className
      )}
      role="radiogroup"
      aria-label="Assign to"
    >
      {segments.map((seg) => {
        const isActive = value === seg.value
        return (
          <button
            key={seg.key}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(seg.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-2 py-1 text-lr-xs font-display font-medium transition-all duration-150',
              isActive
                ? SIGNER_ACTIVE_CLASS[seg.key]
                : 'text-lr-muted hover:text-lr-text hover:bg-lr-surface border border-transparent'
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 shrink-0 rounded-full',
                isActive ? 'bg-white/80' : SIGNER_DOT_CLASS[seg.key]
              )}
            />
            {seg.label}
          </button>
        )
      })}
    </div>
  )
}
