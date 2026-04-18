'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { CONSENT_HEADING, CONSENT_PARAGRAPHS } from '@/lib/legal/consent-copy'
import { SignerShell } from '@/components/signer/SignerShell'
import { SignerStepper } from '@/components/signer/SignerStepper'
import { Button } from '@/components/ui/button'

interface ConsentPageProps {
  params: Promise<{ token: string }>
}

export default function ConsentPage({ params }: ConsentPageProps) {
  const { token } = use(params)
  const router = useRouter()
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/sign/${token}/consent`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError((body as { error?: string }).error || 'Failed to record consent. Please try again.')
        return
      }

      const body = await res.json().catch(() => ({}))
      const nextUrl = (body as { nextUrl?: string }).nextUrl || `/sign/${token}`
      router.push(nextUrl)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SignerShell width="narrow" align="center" headerSubtitle="Secure signing session">
      <SignerStepper currentStep={1} />

      <div className="w-full rounded-lr-lg border border-lr-border bg-lr-surface p-8 shadow-lr-card">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lr-accent/20 bg-lr-accent/10">
            <ShieldCheck size={18} className="text-lr-accent" />
          </div>
          <div>
            <p className="text-kicker text-lr-accent mb-1">Step 1 · Consent</p>
            <h1 className="text-page-title text-lr-text">{CONSENT_HEADING}</h1>
          </div>
        </div>

        <div className="space-y-3 text-body text-lr-text-2 leading-relaxed border-t border-lr-border pt-5">
          {CONSENT_PARAGRAPHS.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <label className="flex cursor-pointer items-start gap-3 rounded-lr border border-lr-border bg-lr-bg/60 p-4 transition-colors hover:border-lr-accent/40">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-lr-border accent-lr-accent focus-visible:ring-2 focus-visible:ring-lr-accent"
            />
            <span className="text-body text-lr-text leading-snug">
              I have read and agree to the electronic signature disclosure above. I consent to
              conduct this transaction and sign documents electronically.
            </span>
          </label>

          {error && (
            <p
              className="rounded-lr border border-lr-error/30 bg-lr-error/10 px-3 py-2 text-caption text-lr-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={!agreed || submitting}
            className="w-full"
          >
            {submitting ? 'Recording consent…' : 'I Agree — Continue to Document'}
          </Button>
        </form>
      </div>
    </SignerShell>
  )
}
