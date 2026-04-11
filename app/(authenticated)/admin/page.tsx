import { ArrowLeft, Building2, ClipboardList, FileText, Users } from 'lucide-react'
import { getServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const quickLinks = [
  {
    href: '/admin/users',
    icon: Users,
    label: 'Manage Users',
    description: 'View and manage user roles',
    iconClass: 'text-lr-accent bg-lr-accent-dim',
  },
  {
    href: '/admin/companies',
    icon: Building2,
    label: 'Companies',
    description: 'Manage companies and members',
    iconClass: 'text-lr-gold bg-lr-gold-dim',
  },
  {
    href: '/admin/documents',
    icon: FileText,
    label: 'All Documents',
    description: 'View all documents across system',
    iconClass: 'text-lr-success bg-lr-success-dim',
  },
  {
    href: '/admin/audit-log',
    icon: ClipboardList,
    label: 'Audit Log',
    description: 'View system audit trail',
    iconClass: 'text-lr-cyan bg-lr-cyan-dim',
  },
  {
    href: '/dashboard',
    icon: ArrowLeft,
    label: 'Back to Dashboard',
    description: 'Return to main dashboard',
    iconClass: 'text-lr-muted bg-lr-surface-2',
  },
]

export default async function AdminDashboardPage() {
  const serviceClient = getServiceClient()

  const { count: userCount } = await serviceClient
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const { count: documentCount } = await serviceClient
    .from('documents')
    .select('*', { count: 'exact', head: true })

  const { data: documentsByStatusRaw } = await serviceClient
    .from('documents')
    .select('status')

  const documentsByStatus = (documentsByStatusRaw ?? []) as { status: string }[]

  const statusCounts = {
    completed: documentsByStatus.filter((d) => d.status === 'completed').length,
    pending: documentsByStatus.filter((d) => d.status === 'pending').length,
  }

  const stats = [
    { label: 'Total Users', value: userCount || 0 },
    { label: 'Total Documents', value: documentCount || 0 },
    { label: 'Completed', value: statusCounts.completed },
    { label: 'Pending', value: statusCounts.pending },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-lr-3xl font-bold text-lr-text">Admin Dashboard</h1>
        <p className="mt-1 text-lr-sm text-lr-muted">Overview of system statistics and activity.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lr-lg border border-lr-border bg-lr-surface p-5 shadow-lr-card">
            <p className="font-display text-lr-xs uppercase tracking-wider text-lr-muted">{stat.label}</p>
            <p className="mt-2 font-display text-lr-3xl font-bold text-lr-text">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-5 shadow-lr-card">
        <h2 className="mb-4 font-display text-lr-xl font-semibold text-lr-text">Admin Sections</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {quickLinks.map(({ href, icon: Icon, label, description, iconClass }) => (
            <a
              key={href}
              href={href}
              className="flex flex-col items-center rounded-lr-lg border border-lr-border p-4 text-center transition-all duration-lr-fast hover:bg-lr-surface hover:border-lr-border-2 hover:-translate-y-px hover:shadow-lr-card"
            >
              <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-lr-lg ${iconClass}`}>
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </div>
              <div className="font-display text-lr-sm font-semibold text-lr-text">{label}</div>
              <div className="mt-1 text-lr-xs text-lr-muted">{description}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
