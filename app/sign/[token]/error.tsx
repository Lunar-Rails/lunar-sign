'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SigningError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-lr-bg px-4">
      <div className="w-full max-w-md rounded-lr-lg border border-lr-border bg-lr-surface p-8 text-center shadow-lr-card">
        <AlertTriangle className="mx-auto h-12 w-12 text-lr-error" />
        <h2 className="mt-4 font-display text-lr-xl font-semibold text-lr-text">
          Something went wrong
        </h2>
        <p className="mt-2 text-lr-sm text-lr-muted">
          An error occurred while processing your signing request. Please try again.
        </p>
        <Button onClick={() => reset()} className="mt-6">
          Try Again
        </Button>
      </div>
    </div>
  )
}
