import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Profile } from '@/lib/types'

export default async function AdminLayout({
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

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const userProfile: Profile | null = profile

  if (!userProfile || userProfile.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Admin Subnav */}
      <div className="border-b border-gray-200 bg-gray-100 px-6 py-3">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Admin Panel</h2>
          <div className="flex gap-6">
            <a
              href="/admin"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300"
            >
              Dashboard
            </a>
            <a
              href="/admin/users"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300"
            >
              Users
            </a>
            <a
              href="/admin/documents"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300"
            >
              Documents
            </a>
            <a
              href="/admin/audit-log"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300"
            >
              Audit Log
            </a>
          </div>
        </div>
      </div>

      {/* Admin Content */}
      <main className="flex-1 bg-gray-50 px-6 py-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  )
}
