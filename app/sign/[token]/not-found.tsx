import { LinkIcon } from 'lucide-react'

export default function SigningNotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-lr-bg px-4">
      <div className="w-full max-w-md rounded-lr-lg border border-lr-border bg-lr-surface p-8 text-center shadow-lr-card">
        <LinkIcon className="mx-auto h-12 w-12 text-lr-error" />
        <h2 className="mt-4 font-display text-lr-xl font-semibold text-lr-text">
          Invalid or Expired Link
        </h2>
        <p className="mt-2 text-lr-sm text-lr-muted">
          This signing link is invalid or has expired. Signing links can only be used once and may
          expire if not used within a certain time period.
        </p>
        <p className="mt-4 text-lr-xs text-lr-muted">
          If you believe this is an error, please contact the document owner.
        </p>
      </div>
    </div>
  )
}
