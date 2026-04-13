import { FileX2 } from 'lucide-react'

export default function SigningNotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-lr-bg px-4">
      <div className="w-full max-w-md rounded-lr-lg border border-lr-border bg-lr-surface p-8 text-center shadow-lr-card">
        <FileX2 className="mx-auto h-12 w-12 text-lr-muted" />
        <h2 className="mt-4 font-display text-lr-xl font-semibold text-lr-text">
          Document not available
        </h2>
        <p className="mt-2 text-lr-sm text-lr-muted">
          This document has been removed or the signing link is no longer valid.
        </p>
        <p className="mt-4 text-lr-xs text-lr-muted">
          If you believe this is an error, please contact the document owner.
        </p>
      </div>
    </div>
  )
}
