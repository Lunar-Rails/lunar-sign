import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Profile } from '@/lib/types'
import { AdminTabNav } from '@/components/AdminTabNav'

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

  if (!userProfile || userProfile.role !== 'admin') redirect('/documents')

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)]">
      <AdminTabNav />
      <main className="flex-1 py-6 lg:py-8">
        {children}
      </main>
    </div>
  )
}
