'use client'

import { PenLine } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface FieldNavigationCtaProps {
  started: boolean
  isGuideComplete: boolean
  /** Vertical position inside the PDF card (px from top). Null = center vertically. */
  ctaOffsetPx: number | null
  onStart: () => void
  onNext: () => void
  className?: string
}

export function FieldNavigationCta({
  started,
  isGuideComplete,
  ctaOffsetPx,
  onStart,
  onNext,
  className,
}: FieldNavigationCtaProps) {
  if (isGuideComplete) return null

  const topStyle =
    ctaOffsetPx != null
      ? { top: ctaOffsetPx, transform: 'translateY(-50%)' }
      : { top: '42%', transform: 'translateY(-50%)' }

  return (
    <div
      className={cn('pointer-events-none absolute left-0 z-30 flex w-0 justify-start', className)}
      style={topStyle}
      aria-hidden={false}
    >
      <div className="pointer-events-auto -translate-x-1 sm:-translate-x-2">
        {!started ? (
          <Button
            type="button"
            size="sm"
            className="h-9 gap-1.5 rounded-lr rounded-r-none border border-lr-accent/40 pr-3 pl-2 shadow-lr-glow-accent"
            onClick={onStart}
          >
            <PenLine className="size-4 shrink-0" aria-hidden />
            <span className="font-display text-caption font-semibold text-white">Start</span>
          </Button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="group relative flex h-9 items-center pl-2.5 pr-4 font-display text-caption font-semibold text-white shadow-lr-glow-accent transition-all duration-lr-fast hover:-translate-y-px active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lr-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lr-bg"
            style={{
              background: 'var(--lr-accent)',
              clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 0 0)',
            }}
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
