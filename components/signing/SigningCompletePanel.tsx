'use client'

import { CheckCircle, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SigningCompletePanelProps {
  signerName: string
  fieldCount: number
  signedAt: string
  documentHash: string
  downloadUrl: string
  fileName?: string
  onReset: () => void
  className?: string
}

function formatSignedAt(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function SigningCompletePanel({
  signerName,
  fieldCount,
  signedAt,
  documentHash,
  downloadUrl,
  fileName = 'signed-document.pdf',
  onReset,
  className,
}: SigningCompletePanelProps) {
  const displayName = signerName.trim() || 'Unknown'

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-lg rounded-lr-lg border border-lr-border bg-lr-surface p-8 shadow-lr-card',
        className
      )}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={cn(
            'mb-5 flex h-14 w-14 items-center justify-center rounded-full border',
            'bg-lr-success/10 border-lr-success/20'
          )}
        >
          <CheckCircle size={28} className="text-lr-success" aria-hidden />
        </div>
        <p className="text-kicker text-lr-cyan mb-1">Complete</p>
        <h1 className="text-page-title text-lr-text">Document signed</h1>
        <p className="mt-2 max-w-sm text-body text-lr-muted">
          Your signature has been applied and recorded.
        </p>
      </div>

      <dl className="mt-8 space-y-4 border-t border-lr-border pt-8">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          <dt className="text-caption text-lr-muted shrink-0">Signer</dt>
          <dd className="text-body text-lr-text sm:text-right break-words">{displayName}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          <dt className="text-caption text-lr-muted shrink-0">Fields applied</dt>
          <dd className="text-body text-lr-text sm:text-right tabular-nums">{fieldCount}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          <dt className="text-caption text-lr-muted shrink-0">Signed at</dt>
          <dd className="text-body text-lr-text sm:text-right">{formatSignedAt(signedAt)}</dd>
        </div>
      </dl>

      <div className="mt-6 rounded-lr border border-lr-border bg-lr-surface-2 p-4">
        <p className="text-caption text-lr-muted mb-2">SHA-256</p>
        <p className="font-mono text-caption text-lr-text break-all leading-relaxed">{documentHash}</p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <Button asChild variant="default" className="w-full sm:w-auto">
          <a href={downloadUrl} download={fileName}>
            <Download className="size-4" aria-hidden />
            Download signed PDF
          </a>
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={onReset}
        >
          Sign another
        </Button>
      </div>
    </div>
  )
}
