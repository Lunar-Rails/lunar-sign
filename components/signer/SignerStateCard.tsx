import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'success' | 'error' | 'warning' | 'muted'

const toneConfig: Record<Tone, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'bg-lr-success/10',
    border: 'border-lr-success/20',
    icon: 'text-lr-success',
  },
  error: {
    bg: 'bg-lr-error/10',
    border: 'border-lr-error/20',
    icon: 'text-lr-error',
  },
  warning: {
    bg: 'bg-lr-warning/10',
    border: 'border-lr-warning/20',
    icon: 'text-lr-warning',
  },
  muted: {
    bg: 'bg-lr-surface-2',
    border: 'border-lr-border',
    icon: 'text-lr-muted',
  },
}

interface SignerStateCardProps {
  tone: Tone
  icon: LucideIcon
  kicker?: string
  title: string
  description: string
  children?: React.ReactNode
}

export function SignerStateCard({
  tone,
  icon: Icon,
  kicker,
  title,
  description,
  children,
}: SignerStateCardProps) {
  const { bg, border, icon } = toneConfig[tone]

  return (
    <div className="w-full max-w-md rounded-lr-lg border border-lr-border bg-lr-surface p-8 text-center shadow-lr-card">
      <div
        className={cn(
          'mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border',
          bg,
          border
        )}
      >
        <Icon size={24} className={icon} />
      </div>

      {kicker && <p className="text-kicker text-lr-muted mb-2">{kicker}</p>}

      <h1 className="text-page-title text-lr-text">{title}</h1>

      <p className="mt-3 text-body text-lr-muted">{description}</p>

      {children && <div className="mt-6">{children}</div>}
    </div>
  )
}
