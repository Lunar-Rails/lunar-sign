'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface CompanySidebarItem {
  id: string
  name: string
  slug: string
  documentCount: number
}

interface CompanySidebarClientProps {
  companies: CompanySidebarItem[]
  totalDocumentCount: number
}

export default function CompanySidebarClient({
  companies,
  totalDocumentCount,
}: CompanySidebarClientProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeCompany = searchParams.get('company')
  const isDashboard = pathname === '/dashboard'

  return (
    <aside className="hidden w-[220px] shrink-0 border-r border-lr-border bg-lr-bg sticky top-14 h-[calc(100vh-56px)] overflow-y-auto lg:block">
      <div className="p-4">
        <p className="mb-3 font-display text-lr-xs uppercase tracking-wider text-lr-muted">
          Companies
        </p>

        <nav className="space-y-0.5">
          <SidebarLink
            href="/dashboard"
            isActive={isDashboard && !activeCompany}
            count={totalDocumentCount}
          >
            All Documents
          </SidebarLink>

          <div className="my-3 h-px bg-lr-border" />

          {companies.length === 0 && (
            <p className="px-3 py-1 text-lr-xs text-lr-muted">
              No companies configured
            </p>
          )}

          {companies.map((company) => (
            <SidebarLink
              key={company.id}
              href={`/dashboard?company=${company.slug}`}
              isActive={isDashboard && activeCompany === company.slug}
              count={company.documentCount}
            >
              {company.name}
            </SidebarLink>
          ))}
        </nav>
      </div>
    </aside>
  )
}

function SidebarLink({
  href,
  isActive,
  count,
  children,
}: {
  href: string
  isActive: boolean
  count: number
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center justify-between rounded-lr px-3 py-2 text-lr-sm transition-colors duration-lr-fast',
        isActive
          ? 'bg-lr-accent-dim text-lr-accent border-l-2 border-lr-accent pl-[10px]'
          : 'text-lr-text-2 hover:bg-lr-surface hover:text-lr-text'
      )}
    >
      <span className="truncate pr-2">{children}</span>
      <span className="shrink-0 text-lr-xs text-lr-muted">{count}</span>
    </Link>
  )
}
