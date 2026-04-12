import { Building2, ClipboardList, FileText, Users } from 'lucide-react'
import Link from 'next/link'

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
]

export default async function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker mb-1">System Overview</p>
        <h1 className="text-page-title">Admin Dashboard</h1>
        <p className="text-body mt-1">Overview of system statistics and activity.</p>
      </div>

      {/* Navigation Cards */}
      <div>
        <h2 className="text-card-title mb-4">Admin Sections</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map(({ href, icon: Icon, label, description, iconClass }) => (
            <Link
              key={href}
              href={href}
              className="flex items-start gap-3 rounded-lr-lg border border-lr-border bg-lr-surface p-4 transition-colors duration-lr-fast hover:border-lr-border-2 hover:bg-lr-surface-2"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lr ${iconClass}`}>
                <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-card-title">{label}</p>
                <p className="text-caption mt-0.5">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
