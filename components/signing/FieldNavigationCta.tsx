'use client'

import { ChevronRight, PenLine } from 'lucide-react'

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
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-9 gap-1 rounded-lr rounded-r-none border border-lr-border pr-2.5 pl-2"
            onClick={onNext}
          >
            <span className="text-caption font-display font-semibold text-lr-text">Next</span>
            <ChevronRight className="size-4 shrink-0 opacity-80" aria-hidden />
          </Button>
        )}
      </div>
    </div>
  )
}
