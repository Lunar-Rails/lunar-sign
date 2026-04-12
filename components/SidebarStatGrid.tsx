import { cn } from '@/lib/utils'

export type StatColor = 'muted' | 'warning' | 'cyan' | 'accent' | 'success' | 'error'

export interface StatItem {
  label: string
  count: number
  color: StatColor
}

interface SidebarStatGridProps {
  title: string
  stats: StatItem[]
  columns?: number
}

const colorClasses: Record<StatColor, string> = {
  muted: 'text-lr-muted',
  warning: 'text-lr-warning',
  cyan: 'text-lr-cyan',
  accent: 'text-lr-accent',
  success: 'text-lr-success',
  error: 'text-lr-error',
}

export function SidebarStatGrid({ title, stats, columns }: SidebarStatGridProps) {
  const cols = columns ?? stats.length
  return (
    <div className="bg-lr-surface-2 rounded-lr p-3 space-y-2">
      <p className="text-section-label">{title}</p>
      <div
        className="grid gap-1.5 pt-0.5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {stats.map((stat) => (
          <StatChip key={stat.label} stat={stat} />
        ))}
      </div>
    </div>
  )
}

function StatChip({ stat }: { stat: StatItem }) {
  return (
    <div className="flex flex-col items-center rounded-lr border border-lr-border bg-lr-surface p-1.5">
      <span className={cn('font-display font-bold text-lr-sm', colorClasses[stat.color])}>
        {stat.count}
      </span>
      <span className="text-micro">{stat.label}</span>
    </div>
  )
}
