'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/types'
import UserDropdown from '@/components/UserDropdown'
import { ThemeToggle } from '@/components/theme-toggle'
import { DocumentSidebarProvider } from '@/lib/document-sidebar-context'
import { TemplateSidebarProvider } from '@/lib/template-sidebar-context'
import { TemplateEditorSidebarProvider } from '@/lib/template-editor-sidebar-context'
import { FormPendingBar, FormPendingProvider } from '@/components/ui/form-pending'

export function AuthenticatedShell({
  profile,
  sidebar,
  children,
}: {
  profile: Profile
  sidebar: React.ReactNode
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <DocumentSidebarProvider>
    <TemplateSidebarProvider>
    <TemplateEditorSidebarProvider>
    <FormPendingProvider>
    <div className="flex min-h-screen flex-col bg-lr-bg">
      {/* Sticky header + global form-pending bar (full width) */}
      <div className="sticky top-0 z-50 w-full">
        <header className="h-14 border-b border-lr-border bg-lr-bg/88 backdrop-blur-lr-header saturate-[1.2]">
          <div className="flex h-full items-center justify-between px-6 lg:px-10 max-w-lr-app mx-auto w-full">
            <Link href="/documents" className="flex items-center gap-1 shrink-0">
              <span className="font-display text-lr-lg font-bold text-lr-accent">Lunar</span>
              <span className="font-display text-lr-lg font-bold text-lr-gold">Sign</span>
            </Link>

            <nav className="flex items-end h-14">
              <NavLink
                href="/documents"
                active={pathname === '/documents' || pathname.startsWith('/documents/')}
              >
                Documents
              </NavLink>
              <NavLink
                href="/templates"
                active={pathname === '/templates' || pathname.startsWith('/templates/')}
              >
                Templates
              </NavLink>
              <NavLink href="/upload" active={pathname === '/upload'}>Upload</NavLink>
              {profile.role === 'admin' && (
                <NavLink href="/admin" active={pathname.startsWith('/admin')}>Admin</NavLink>
              )}
            </nav>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserDropdown profile={profile} />
            </div>
          </div>
        </header>
        <FormPendingBar />
      </div>

      {/* Body */}
      <div className="flex-1">
        <div className="max-w-lr-app mx-auto px-6 lg:px-8 py-8">
          <div className="flex gap-6 items-start">
            {sidebar}
            <main className="flex-1 min-w-0">{children}</main>
          </div>
        </div>
      </div>
    </div>
    </FormPendingProvider>
    </TemplateEditorSidebarProvider>
    </TemplateSidebarProvider>
    </DocumentSidebarProvider>
  )
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-[52px] items-center px-4 text-lr-sm font-medium transition-all duration-lr-fast rounded-t-lr-lg',
        active
          ? 'bg-gradient-to-b from-lr-accent-dim to-transparent shadow-lr-inset-accent text-lr-text'
          : 'text-lr-muted hover:text-lr-text-2'
      )}
    >
      {children}
    </Link>
  )
}
