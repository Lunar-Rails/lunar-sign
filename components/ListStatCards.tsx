const statCards = [
  { label: 'Total', key: 'total', color: 'text-lr-text' },
  { label: 'Draft', key: 'draft', color: 'text-lr-muted' },
  { label: 'Pending', key: 'pending', color: 'text-lr-warning' },
  { label: 'Completed', key: 'completed', color: 'text-lr-cyan' },
] as const

export interface ListStatCounts {
  total: number
  draft: number
  pending: number
  completed: number
}

export function ListStatCards({ stats }: { stats: ListStatCounts }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {statCards.map(({ label, key, color }) => (
        <div
          key={key}
          className="rounded-lr-lg border border-lr-border bg-lr-surface p-5 shadow-lr-card"
        >
          <p className="text-section-label">{label}</p>
          <p className={`mt-2 font-display text-lr-3xl font-bold ${color}`}>{stats[key]}</p>
        </div>
      ))}
    </div>
  )
}
