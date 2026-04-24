'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

interface SignerAppHeaderProps {
  subtitle?: string
  documentTitle?: string
  actions?: React.ReactNode
  onDecline?: () => void
}

export function SignerAppHeader({
  subtitle = 'Secure signing session',
  documentTitle,
  actions,
  onDecline,
}: SignerAppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 h-14 border-b border-lr-border bg-lr-bg/88 backdrop-blur-lr-header saturate-[1.2]">
      {documentTitle ? (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center truncate px-32 text-sm font-medium text-lr-text">
          {documentTitle}
        </p>
      ) : subtitle ? (
        <div className="pointer-events-none absolute inset-0 hidden sm:flex items-center justify-center">
          <div className="flex items-center gap-1.5 rounded-full border border-lr-border bg-lr-surface px-3 py-1">
            <Lock size={10} className="text-lr-muted" />
            <span className="text-kicker text-lr-muted">{subtitle}</span>
          </div>
        </div>
      ) : null}

      <div className="relative flex h-full items-center justify-between gap-4 px-6 max-w-[1280px] mx-auto w-full">
        <Link
          href="/"
          className="flex items-center gap-1 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lr-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lr-bg rounded-lr"
        >
          <span className="font-display text-lr-lg font-bold text-lr-accent">Lunar</span>
          <span className="font-display text-lr-lg font-bold text-lr-gold">Sign</span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          {onDecline && (
            <button
              type="button"
              onClick={onDecline}
              className="hidden sm:block text-caption text-lr-muted underline-offset-2 hover:text-lr-error hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lr-accent rounded transition-colors duration-lr-fast"
            >
              Decline to sign
            </button>
          )}
          {actions}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
