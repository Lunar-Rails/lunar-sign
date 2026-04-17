'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { CONSENT_HEADING, CONSENT_PARAGRAPHS } from '@/lib/legal/consent-copy'

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
      if (res.ok || res.redirected) {
        router.push(`/sign/${token}`)
      } else {
        const body = await res.json().catch(() => ({}))
        setError((body as { error?: string }).error || 'Failed to record consent. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-lr-bg px-4 py-10">
      <div className="w-full max-w-lg rounded-lr-lg border border-lr-border bg-lr-surface p-8 shadow-lr-card">
        <div className="mb-6 flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 shrink-0 text-lr-accent" />
          <h1 className="font-display text-lr-xl font-semibold text-lr-text">
            {CONSENT_HEADING}
          </h1>
        </div>

        <div className="space-y-4 text-lr-sm text-lr-text-2 leading-relaxed">
          {CONSENT_PARAGRAPHS.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-lr-border accent-lr-accent"
            />
            <span className="text-lr-sm text-lr-text leading-snug">
              I have read and agree to the electronic signature disclosure above. I consent to
              conduct this transaction and sign documents electronically.
            </span>
          </label>

          {error && (
            <p className="text-lr-sm text-lr-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!agreed || submitting}
            className="w-full rounded-lr bg-lr-accent px-4 py-2.5 text-lr-sm font-semibold text-white hover:bg-lr-accent-hover disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-lr-base"
          >
            {submitting ? 'Recording consent…' : 'I Agree — Continue to Document'}
          </button>
        </form>
      </div>
    </div>
  )
}
