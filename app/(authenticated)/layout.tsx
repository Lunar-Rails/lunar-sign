import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Profile } from '@/lib/types'
import { AuthenticatedShell } from '@/components/AuthenticatedShell'
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

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const userProfile: Profile | null = profile

  if (!userProfile) redirect('/login')

  return (
    <AuthenticatedShell profile={userProfile} sidebar={<CompanySidebar />}>
      {children}
    </AuthenticatedShell>
  )
}
