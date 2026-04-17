'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, KeyRound } from 'lucide-react'
import { SignerShell } from '@/components/signer/SignerShell'
import { SignerStepper } from '@/components/signer/SignerStepper'

interface OtpClientProps {
  token: string
  signerEmail: string
}

export function OtpClient({ token, signerEmail }: OtpClientProps) {
  const router = useRouter()
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    sendCode(token)
  }, [token])

  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => window.clearInterval(id)
  }, [cooldown])

  async function sendCode(tok: string) {
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/sign/${tok}/otp/send`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((body as { error?: string }).error ?? 'Failed to send code.')
      } else {
        setSent(true)
        setCooldown(30)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    if (digit && index < 5) inputRefs.current[index + 1]?.focus()
    if (next.every((d) => d !== '')) handleVerify(next.join(''))
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      e.preventDefault()
      setDigits(pasted.split(''))
      handleVerify(pasted)
    }
  }

  async function handleVerify(code: string) {
    if (verifying) return
    setVerifying(true)
    setError(null)
    try {
      const res = await fetch(`/api/sign/${token}/otp/verify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        router.push(`/sign/${token}`)
      } else {
        setDigits(Array(6).fill(''))
        inputRefs.current[0]?.focus()
        setError((body as { error?: string }).error ?? 'Verification failed. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <SignerShell width="narrow" align="center" headerSubtitle="Secure signing session">
      <SignerStepper currentStep={2} />

      <div className="w-full rounded-lr-lg border border-lr-border bg-lr-surface p-8 shadow-lr-card">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lr-accent/20 bg-lr-accent/10">
            <KeyRound size={18} className="text-lr-accent" />
          </div>
          <div>
            <p className="text-kicker text-lr-accent mb-1">Step 2 · Verify identity</p>
            <h1 className="text-page-title text-lr-text">Check your inbox</h1>
          </div>
        </div>

        {/* Status banner */}
        {sent && !sending && (
          <div className="mb-6 flex items-start gap-3 rounded-lr border border-lr-border bg-lr-bg/60 px-4 py-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-lr-accent/20 bg-lr-accent/10">
              <Mail size={13} className="text-lr-accent" />
            </div>
            <div>
              <p className="text-body text-lr-text">Code sent to</p>
              <p className="text-body font-semibold text-lr-text">{signerEmail}</p>
            </div>
          </div>
        )}

        {sending && (
          <p className="mb-6 text-body text-lr-muted">Sending your code…</p>
        )}

        {/* OTP inputs */}
        <div
          className="flex justify-center gap-2 rounded-lr border border-lr-border bg-lr-bg/60 p-4 shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]"
          onPaste={handlePaste}
        >
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={verifying}
              aria-label={`Digit ${i + 1} of 6`}
              className="h-12 w-11 rounded-lr border border-lr-border bg-lr-bg text-center font-display text-xl text-lr-text outline-none transition-all duration-lr-fast focus:border-lr-accent focus:ring-2 focus:ring-lr-accent/30 disabled:opacity-50"
            />
          ))}
        </div>

        {error && (
          <p
            className="mt-4 rounded-lr border border-lr-error/30 bg-lr-error/10 px-3 py-2 text-caption text-lr-error text-center"
            role="alert"
          >
            {error}
          </p>
        )}

        {verifying && (
          <p className="mt-4 text-center text-body text-lr-muted">Verifying…</p>
        )}

        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={sending || cooldown > 0}
            onClick={() => sendCode(token)}
            className="text-body text-lr-accent underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lr-accent rounded"
          >
            {sending ? 'Sending…' : 'Resend code'}
          </button>
          {cooldown > 0 && (
            <span className="text-caption text-lr-muted">({cooldown}s)</span>
          )}
        </div>
      </div>
    </SignerShell>
  )
}
