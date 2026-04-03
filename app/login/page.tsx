import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import GoogleSignInButton from './google-sign-in-button'

export const dynamic = 'force-dynamic'


export default async function LoginPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (profile) redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Lunar Sign</h1>
          <p className="mb-8 text-sm text-gray-600">
            Secure document signing portal
          </p>

          <GoogleSignInButton />

          <p className="mt-6 text-center text-xs text-gray-500">
            Sign in with your Google account to continue
          </p>
        </div>
      </div>
    </div>
  )
}
