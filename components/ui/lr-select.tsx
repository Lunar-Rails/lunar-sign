'use client'

import { useRef, useState } from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LrSelectOption {
  value: string
  label: string
}

type SingleProps = {
  mode?: 'single'
  value: string
  onChange: (value: string) => void
}

type MultiProps = {
  mode: 'multi'
  value: string[]
  onChange: (value: string[]) => void
}

type BaseProps = {
  options: LrSelectOption[]
  onOpenChange?: (open: boolean) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export type LrSelectProps = BaseProps & (SingleProps | MultiProps)

/**
 * Unified dropdown for both single and multi-select.
 * Built on Radix Popover so trigger, panel, and items share one
 * rendering path — guaranteed pixel-identical across all usages.
 *
 * Design system compliance:
 *   Trigger  — h-9 bg-lr-surface border-lr-border rounded-lr
 *   Panel    — bg-lr-bg border-lr-border rounded-lr-lg shadow-lr-dropdown
 *   Items    — px-3 py-2 text-lr-sm hover:bg-lr-surface
 */
export function LrSelect(props: LrSelectProps) {
  const { options, onOpenChange, placeholder = 'None', disabled, className } = props
  const [open, setOpen] = useState(false)
  // Ref keeps the latest value accessible inside onOpenChange closure (multi mode)
  const valueRef = useRef(props.value)
  valueRef.current = props.value

  function handleOpenChange(next: boolean) {
    setOpen(next)
    onOpenChange?.(next)
  }

  function handleSelect(optionValue: string) {
    if (props.mode === 'multi') {
      const current = props.value as string[]
      const next = current.includes(optionValue)
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue]
      props.onChange(next)
    } else {
      ;(props as SingleProps).onChange(optionValue)
      handleOpenChange(false)
    }
  }

  const displayLabel = (() => {
    if (props.mode === 'multi') {
      const selected = options.filter((o) => (props.value as string[]).includes(o.value))
      return selected.length > 0 ? selected.map((o) => o.label).join(', ') : null
    }
    return options.find((o) => o.value === (props.value as string))?.label ?? null
  })()

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-lr border border-lr-border bg-lr-surface px-3 py-2 text-lr-sm text-lr-text transition-colors duration-lr-fast',
            'focus:outline-none focus:ring-1 focus:ring-lr-accent focus:border-lr-accent',
            'data-[state=open]:border-lr-accent data-[state=open]:ring-1 data-[state=open]:ring-lr-accent',
            disabled && 'cursor-not-allowed opacity-50',
            className
          )}
        >
          <span className="line-clamp-1 text-left">
            {displayLabel ?? <span className="text-lr-muted">{placeholder}</span>}
          </span>
          <ChevronDown
            className={cn(
              'ml-1 h-4 w-4 shrink-0 opacity-50 transition-transform duration-150',
              open && 'rotate-180'
            )}
          />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className={cn(
            // Portal — no default PopoverContent base classes
            'z-50 w-auto rounded-lr-lg border border-lr-border bg-lr-bg p-0 text-lr-text shadow-lr-dropdown outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
            'origin-[--radix-popover-content-transform-origin]'
          )}
        >
          {/* inner div carries the min-width so the outer border-box doesn't shrink items */}
          <div
            role="listbox"
            aria-multiselectable={props.mode === 'multi'}
            className="max-h-64 min-w-[var(--radix-popover-trigger-width)] overflow-y-auto p-1"
          >
            {options.map((option) => {
              const isSelected =
                props.mode === 'multi'
                  ? (props.value as string[]).includes(option.value)
                  : props.value === option.value

              return (
                <button
                  key={option.value}
                  role="option"
                  type="button"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'flex w-full cursor-default select-none items-center rounded-lr px-3 py-2 text-lr-sm text-lr-text transition-colors duration-lr-fast',
                    'hover:bg-lr-surface focus:bg-lr-surface focus:outline-none',
                    isSelected && 'text-lr-text'
                  )}
                >
                  {props.mode === 'multi' ? (
                    <span className="mr-2.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-lr-border bg-lr-bg">
                      {isSelected && (
                        <Check className="h-2.5 w-2.5 text-lr-accent" strokeWidth={3} />
                      )}
                    </span>
                  ) : (
                    <span className="mr-2.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-lr-accent" strokeWidth={2.5} />
                      )}
                    </span>
                  )}
                  <span className="truncate">{option.label}</span>
                </button>
              )
            })}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
