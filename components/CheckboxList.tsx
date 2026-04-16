'use client'

import { cn } from '@/lib/utils'

export interface CheckboxListOption {
  id: string
  label: string
}

interface CheckboxListProps {
  options: CheckboxListOption[]
  selectedIds: string[]
  onChange: (id: string) => void
  disabled?: boolean
  /**
   * "menu"  — rows have horizontal padding and a hover background.
   *           Use inside floating dropdown panels.
   * "flat"  — no padding, no hover. Use inside bordered containers
   *           or sidebar widget sections.
   */
  variant?: 'menu' | 'flat'
  className?: string
}

export function CheckboxList({
  options,
  selectedIds,
  onChange,
  disabled,
  variant = 'flat',
  className,
}: CheckboxListProps) {
  return (
    <div className={cn(variant === 'flat' ? 'space-y-1.5' : 'space-y-0.5', className)}>
      {options.map((option) => (
        <label
          key={option.id}
          className={cn(
            'flex cursor-pointer items-center gap-2 text-lr-text',
            disabled && 'cursor-not-allowed opacity-60',
            variant === 'menu'
              ? 'rounded-lr px-3 py-1.5 text-lr-sm transition-colors hover:bg-lr-surface-2'
              : 'py-0.5 text-caption'
          )}
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(option.id)}
            onChange={() => onChange(option.id)}
            disabled={disabled}
            className="h-3.5 w-3.5 shrink-0 rounded border-lr-border accent-lr-accent"
          />
          <span className="truncate">{option.label}</span>
        </label>
      ))}
    </div>
  )
}
