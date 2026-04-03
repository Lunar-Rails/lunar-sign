import { redirect } from 'next/navigation'
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

  // Fetch user profile
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
      {/* Navbar */}
      <nav className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Lunar Sign</h1>
          </div>

          {/* Nav Links */}
          <div className="flex items-center gap-6">
            <a
              href="/dashboard"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Dashboard
            </a>
            <a
              href="/upload"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Upload
            </a>
            {userProfile.role === 'admin' && (
              <a
                href="/admin"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Admin
              </a>
            )}
          </div>

          {/* User Dropdown */}
          <UserDropdown profile={userProfile} />
        </div>
      </nav>

      <div className="flex flex-1 bg-gray-50">
        <CompanySidebar />

        {/* Main Content */}
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  )
}
