import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Profile } from '@/lib/types'
import UserDropdown from '@/components/UserDropdown'
import CompanySidebar from '@/components/CompanySidebar'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const userProfile: Profile | null = profile

  if (!userProfile) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 h-14 border-b border-lr-border bg-lr-bg/88 backdrop-blur-lr-header saturate-[1.2]">
        <div className="flex h-full items-center justify-between px-6 lg:px-10">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <span className="font-display text-lr-lg font-bold text-lr-accent">Lunar</span>
            <span className="font-display text-lr-lg font-bold text-lr-gold">Sign</span>
          </Link>

          {/* Nav Links */}
          <nav className="flex items-end h-14">
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/upload">Upload</NavLink>
            {userProfile.role === 'admin' && (
              <NavLink href="/admin">Admin</NavLink>
            )}
          </nav>

          {/* User Dropdown */}
          <UserDropdown profile={userProfile} />
        </div>
      </header>

      <div className="flex flex-1">
        <CompanySidebar />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex h-[52px] items-center px-4 text-lr-sm font-medium text-lr-muted transition-colors duration-lr-fast hover:text-lr-text-2"
    >
      {children}
    </a>
  )
}
