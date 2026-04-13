'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

export interface SidebarNavItem {
  href: string
  kicker: string
  label: string
  count: number
}

export interface SidebarNavGroup {
  title: string
  items: SidebarNavItem[]
}

interface SidebarNavProps {
  overviewItem: SidebarNavItem
  groups?: SidebarNavGroup[]
}

export function SidebarNav({ overviewItem, groups = [] }: SidebarNavProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeCompany = searchParams.get('company')
  const isDocumentsIndex = pathname === '/documents'

  function isActive(item: SidebarNavItem): boolean {
    if (item.href === '/documents') return isDocumentsIndex && !activeCompany
    const url = new URL(item.href, 'http://x')
    if (url.pathname !== '/documents') return false
    const company = url.searchParams.get('company')
    return isDocumentsIndex && activeCompany === company
  }

  return (
    <div className="space-y-0.5">
      <p className="text-section-label px-3 pb-1">Overview</p>
      <NavItem item={overviewItem} active={isActive(overviewItem)} />

      {groups.map((group) => (
        <div key={group.title}>
          <div className="pt-1 pb-0.5 px-3">
            <p className="text-section-label">{group.title}</p>
          </div>
          {group.items.map((item) => (
            <NavItem key={item.href} item={item} active={isActive(item)} />
          ))}
        </div>
      ))}
    </div>
  )
}

function NavItem({ item, active }: { item: SidebarNavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center justify-between rounded-lr px-3 py-1.5 transition-colors duration-lr-fast group',
        active
          ? 'bg-gradient-to-br from-lr-accent to-lr-accent-hover text-white'
          : 'hover:bg-lr-surface-2'
      )}
    >
      <div className="flex flex-col min-w-0">
        <span className={cn('text-section-label truncate', active && 'text-white/70')}>
          {item.kicker}
        </span>
        <span
          className={cn(
            'text-item-label truncate',
            active ? 'text-white' : 'text-lr-text-2 group-hover:text-lr-text'
          )}
        >
          {item.label}
        </span>
      </div>
      <span className={cn('text-caption shrink-0 ml-2', active ? 'text-white/70' : '')}>
        {item.count}
      </span>
    </Link>
  )
}
