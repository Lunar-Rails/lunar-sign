'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const adminLinks = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/users', label: 'Users', exact: false },
  { href: '/admin/companies', label: 'Companies', exact: false },
  { href: '/admin/documents', label: 'Documents', exact: false },
  { href: '/admin/audit-log', label: 'Audit Log', exact: false },
]

export function AdminTabNav() {
  const pathname = usePathname()

  return (
    <div className="border-b border-lr-border bg-lr-surface/50">
      <div className="max-w-lr-app mx-auto px-6 lg:px-8">
        <div className="flex items-end gap-0">
          {adminLinks.map((link) => {
            const isActive = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'inline-flex h-11 items-center px-4 text-lr-sm font-medium transition-all duration-lr-fast border-b-2',
                  isActive
                    ? 'border-lr-accent text-lr-text bg-gradient-to-b from-lr-accent-dim to-transparent'
                    : 'border-transparent text-lr-muted hover:text-lr-text-2 hover:border-lr-border-2'
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
