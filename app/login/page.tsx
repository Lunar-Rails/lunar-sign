import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GoogleSignInButton from './google-sign-in-button'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (profile) redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-lr-bg px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-8 shadow-lr-card backdrop-blur-lr-card">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-baseline gap-1">
              <span className="font-display text-lr-3xl font-bold text-lr-accent">Lunar</span>
              <span className="font-display text-lr-3xl font-bold text-lr-gold">Sign</span>
            </div>
            <p className="mt-2 text-lr-sm text-lr-muted">Secure document signing portal</p>
          </div>

          <GoogleSignInButton />

          <p className="mt-6 text-center text-lr-xs text-lr-muted">
            Sign in with your Google account to continue
          </p>
        </div>
      </div>
    </div>
  )
}
