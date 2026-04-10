'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

interface AppShellNavProps {
  showAdmin: boolean
}

const baseItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/upload', label: 'Upload' },
]

export default function AppShellNav({ showAdmin }: AppShellNavProps) {
  const pathname = usePathname()
  const items = showAdmin
    ? [...baseItems, { href: '/admin', label: 'Admin' }]
    : baseItems

  return (
    <nav className="flex min-w-0 items-end gap-2 overflow-x-auto pb-px">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx('lr-nav-link whitespace-nowrap', {
              'lr-nav-link-active': isActive,
            })}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
