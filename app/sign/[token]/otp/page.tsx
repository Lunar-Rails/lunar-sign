'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, ShieldCheck } from 'lucide-react'

interface OtpPageProps {
  params: Promise<{ token: string }>
}

export default function OtpPage({ params }: OtpPageProps) {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    params.then(({ token: t }) => {
      setToken(t)
      sendCode(t)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    if (!token || verifying) return
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-lr-bg px-4 py-10">
      <div className="w-full max-w-md rounded-lr-lg border border-lr-border bg-lr-surface p-8 shadow-lr-card">
        <div className="mb-6 flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 shrink-0 text-lr-accent" />
          <h1 className="font-display text-lr-xl font-semibold text-lr-text">
            Verify your identity
          </h1>
        </div>

        {sending && (
          <p className="mb-6 text-lr-sm text-lr-muted">Sending your code…</p>
        )}

        {sent && !sending && (
          <div className="mb-6 flex items-start gap-2 rounded-lr border border-lr-border bg-lr-bg p-3 text-lr-sm text-lr-muted">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-lr-accent" />
            <span>
              We sent a 6-digit code to your email address. Enter it below to continue.
            </span>
          </div>
        )}

        <div className="flex justify-center gap-2" onPaste={handlePaste}>
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
              className="h-14 w-12 rounded-lr border border-lr-border bg-lr-bg text-center text-lr-xl font-semibold text-lr-text outline-none ring-lr-accent transition focus:border-lr-accent focus:ring-1 disabled:opacity-50"
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>

        {error && (
          <p className="mt-5 text-center text-lr-sm text-lr-error" role="alert">
            {error}
          </p>
        )}

        {verifying && (
          <p className="mt-5 text-center text-lr-sm text-lr-muted">Verifying…</p>
        )}

        <div className="mt-6 text-center">
          <button
            type="button"
            disabled={sending || !token}
            onClick={() => token && sendCode(token)}
            className="text-lr-sm text-lr-accent underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Resend code'}
          </button>
        </div>
      </div>
    </div>
  )
}
