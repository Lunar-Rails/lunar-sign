'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="bg-lr-bg">
        <div className="flex min-h-screen items-center justify-center bg-lr-bg px-4">
          <div className="w-full max-w-sm text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-lr-error" />
            <h2 className="mt-4 text-page-title">
              Something went wrong
            </h2>
            <p className="text-body mt-2">
              An unexpected error occurred. Please try again or contact support if the problem
              persists.
            </p>

            {process.env.NODE_ENV === 'development' && error.message && (
              <div className="mt-4 rounded-lr border border-lr-border bg-lr-surface p-4 text-left">
                <p className="font-mono text-lr-xs text-lr-muted">{error.message}</p>
              </div>
            )}

            <Button onClick={() => reset()} className="mt-6">
              Try Again
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
