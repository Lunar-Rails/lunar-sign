'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

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

function getItemClasses(isActive: boolean) {
  if (isActive)
    return 'flex items-center justify-between rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white'

  return 'flex items-center justify-between rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100'
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
    <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
      <div className="p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Companies
        </p>

        <nav className="space-y-1">
          <Link
            href="/dashboard"
            className={getItemClasses(isDashboard && !activeCompany)}
          >
            <span>All Documents</span>
            <span className="text-xs">{totalDocumentCount}</span>
          </Link>

          <div className="my-3 border-t border-gray-200" />

          {companies.length === 0 && (
            <p className="px-2 py-1 text-xs text-gray-500">
              No companies configured
            </p>
          )}

          {companies.map((company) => (
            <Link
              key={company.id}
              href={`/dashboard?company=${company.slug}`}
              className={getItemClasses(
                isDashboard && activeCompany === company.slug
              )}
            >
              <span className="truncate pr-2">{company.name}</span>
              <span className="text-xs">{company.documentCount}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  )
}
