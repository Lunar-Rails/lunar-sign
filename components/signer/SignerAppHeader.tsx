'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

interface SignerAppHeaderProps {
  subtitle?: string
  actions?: React.ReactNode
}

export function SignerAppHeader({ subtitle = 'Secure signing session', actions }: SignerAppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 h-14 border-b border-lr-border bg-lr-bg/88 backdrop-blur-lr-header saturate-[1.2]">
      <div className="flex h-full items-center justify-between px-6 max-w-[1280px] mx-auto w-full">
        <Link
          href="/"
          className="flex items-center gap-1 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lr-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lr-bg rounded-lr"
        >
          <span className="font-display text-lr-lg font-bold text-lr-accent">Lunar</span>
          <span className="font-display text-lr-lg font-bold text-lr-gold">Sign</span>
        </Link>

        {subtitle && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-lr-border bg-lr-surface px-3 py-1">
            <Lock size={10} className="text-lr-muted" />
            <span className="text-kicker text-lr-muted">{subtitle}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {actions}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
