import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { Profile } from '@/lib/types'

import AppShellNav from '@/components/AppShellNav'
import CompanySidebar from '@/components/CompanySidebar'
import LunarSignWordmark from '@/components/LunarSignWordmark'
import UserDropdown from '@/components/UserDropdown'

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
    <div className="min-h-screen">
      <header className="lr-header sticky top-0 z-40">
        <div className="mx-auto flex max-w-[1200px] items-center gap-4 px-6 py-3">
          <div className="shrink-0">
            <LunarSignWordmark href="/dashboard" size="sm" />
          </div>

          <div className="min-w-0 flex-1">
            <AppShellNav showAdmin={userProfile.role === 'admin'} />
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden lg:inline-flex lr-chip text-[var(--lr-gold)]">
              Audit-ready
            </span>
            <UserDropdown profile={userProfile} />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1200px] gap-6 px-6 pb-8 pt-8 lg:items-start">
        <CompanySidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <footer className="mx-auto max-w-[1200px] px-6 pb-10 pt-2">
        <div className="lr-footer">
          <span>Lunar Sign · secure signing relay</span>
          <div className="flex flex-wrap gap-4">
            <span>Dark neon-glass shell</span>
            <span>Compact controls</span>
            <span>Audit-first detail views</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
