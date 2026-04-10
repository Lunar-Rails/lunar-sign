import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import LunarSignWordmark from '@/components/LunarSignWordmark'

import GoogleSignInButton from './google-sign-in-button'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  try {
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
  } catch {
    // Fall back to rendering the login shell when env/config is not available.
  }

  return (
    <main className="lr-shell min-h-screen">
      <header className="lr-header sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <LunarSignWordmark />
          <Link href="/" className="lr-button lr-button-ghost">
            Back to landing
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] lg:items-center">
        <div className="max-w-2xl">
          <span className="lr-pill mb-5 inline-flex bg-[rgba(124,92,252,0.12)] text-[var(--lr-accent-soft)]">
            <Sparkles className="h-3.5 w-3.5" />
            Access the signing relay
          </span>
          <h1 className="font-display text-[clamp(2.4rem,5vw,3.8rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
            Dark-space shell outside, clean signing workflow inside.
          </h1>
          <p className="mt-5 text-base leading-7 text-[var(--lr-text-soft)]">
            Use your Lunar Rails Google account to open the portal, route
            documents, and monitor signer activity from the new compact control
            room layout.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="lr-grid-card p-5">
              <p className="lr-label">Shared shell</p>
              <p className="mt-2 text-sm leading-6 text-[var(--lr-text-soft)]">
                Sticky glass header, tighter typography, and card-first layouts.
              </p>
            </div>
            <div className="lr-grid-card p-5">
              <p className="lr-label text-[rgba(255,219,160,0.82)]">
                Compliance lane
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm text-[var(--lr-text-soft)]">
                <ShieldCheck className="h-4 w-4 text-[var(--lr-gold)]" />
                Audit events remain visible without breaking the brand system.
              </div>
            </div>
          </div>
        </div>

        <div className="lr-panel w-full px-6 py-7 sm:px-8">
          <p className="lr-label">Authentication</p>
          <h2 className="font-display mt-3 text-[2rem] font-semibold tracking-[-0.03em] text-white">
            Sign in to Lunar Sign
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--lr-text-soft)]">
            Continue with Google to access dashboard views, document uploads,
            and signature request management.
          </p>

          <div className="mt-6">
            <GoogleSignInButton />
          </div>

          <div className="mt-6 rounded-[14px] border border-[rgba(193,178,255,0.12)] bg-[rgba(124,92,252,0.05)] p-4">
            <p className="lr-label">What changed</p>
            <p className="mt-2 text-sm leading-6 text-[var(--lr-text-soft)]">
              The portal now follows the Lunar Rails neon-glass language with
              compact actions, mono display typography, and a public-facing
              landing shell before the authenticated workspace.
            </p>
          </div>

          <Link href="/dashboard" className="mt-5 inline-flex items-center gap-2 text-sm text-[var(--lr-accent-soft)] hover:text-white">
            Already signed in? Open dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}
