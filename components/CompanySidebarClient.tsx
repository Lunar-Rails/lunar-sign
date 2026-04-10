'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import clsx from 'clsx'
import { Building2, Files } from 'lucide-react'

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
    <aside className="hidden w-[220px] shrink-0 lg:block">
      <div className="lr-panel sticky top-24 p-4">
        <p className="lr-label mb-3">Workspace lanes</p>

        <nav className="space-y-2">
          <Link
            href="/dashboard"
            className={clsx('lr-sidebar-link', {
              'lr-sidebar-link-active': isDashboard && !activeCompany,
            })}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Files className="h-4 w-4 text-[var(--lr-accent-soft)]" />
              <span>All Documents</span>
            </span>
            <span className="font-display text-xs text-[var(--lr-text-muted)]">
              {totalDocumentCount}
            </span>
          </Link>

          <div className="my-4 border-t border-[rgba(193,178,255,0.12)]" />

          {companies.length === 0 && (
            <p className="px-2 py-1 text-xs text-[var(--lr-text-muted)]">
              No companies configured yet.
            </p>
          )}

          {companies.map((company) => (
            <Link
              key={company.id}
              href={`/dashboard?company=${company.slug}`}
              className={clsx('lr-sidebar-link', {
                'lr-sidebar-link-active':
                  isDashboard && activeCompany === company.slug,
              })}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Building2 className="h-4 w-4 text-[var(--lr-accent-soft)]" />
                <span className="truncate">{company.name}</span>
              </span>
              <span className="font-display text-xs text-[var(--lr-text-muted)]">
                {company.documentCount}
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  )
}
