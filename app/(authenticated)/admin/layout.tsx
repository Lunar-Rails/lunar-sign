import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Profile } from '@/lib/types'

const adminLinks = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/companies', label: 'Companies' },
  { href: '/admin/documents', label: 'Documents' },
  { href: '/admin/audit-log', label: 'Audit Log' },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const userProfile: Profile | null = profile

  if (!userProfile || userProfile.role !== 'admin') redirect('/dashboard')

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)]">
      {/* Admin Tab Nav */}
      <div className="border-b border-lr-border bg-lr-surface/50 px-6 lg:px-8">
        <div className="flex items-end gap-0">
          {adminLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="inline-flex h-11 items-center px-4 text-lr-sm font-medium text-lr-muted transition-all duration-lr-fast hover:text-lr-text-2 border-b-2 border-transparent hover:border-lr-border-2"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Admin Content */}
      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  )
}
