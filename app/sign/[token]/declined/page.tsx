import { XCircle } from 'lucide-react'

export default function DeclinedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-lr-bg px-4">
      <div className="w-full max-w-md rounded-lr-lg border border-lr-border bg-lr-surface p-8 text-center shadow-lr-card">
        <XCircle className="mx-auto mb-4 h-10 w-10 text-lr-error" />
        <h1 className="font-display text-lr-xl font-semibold text-lr-text">
          Signature declined
        </h1>
        <p className="mt-4 text-lr-sm text-lr-muted">
          You have declined to sign this document. The document owner has been notified.
        </p>
        <p className="mt-3 text-lr-sm text-lr-muted">
          If you changed your mind, please contact the document owner to request a new signing link.
        </p>
      </div>
    </div>
  )
}
