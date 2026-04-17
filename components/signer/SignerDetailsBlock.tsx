'use client'

import type { SignerInfo } from '@drvillo/react-browser-e-signing'
import { PenLine } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface SignerDetailsBlockProps {
  signerInfo: SignerInfo
  onSignerInfoChange: (next: SignerInfo) => void
  /** Show the Title field only when the document contains a title-type field. */
  showTitle?: boolean
}

const inputClass =
  'flex h-9 w-full rounded-lr border border-lr-border bg-lr-bg px-3 py-1 font-sans text-lr-base text-lr-text placeholder:text-lr-muted transition-colors duration-lr-fast focus-visible:outline-none focus-visible:border-lr-accent focus-visible:ring-1 focus-visible:ring-lr-accent disabled:cursor-not-allowed disabled:opacity-50'

export function SignerDetailsBlock({
  signerInfo,
  onSignerInfoChange,
  showTitle = true,
}: SignerDetailsBlockProps) {
  const update =
    (key: keyof SignerInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
      onSignerInfoChange({ ...signerInfo, [key]: e.target.value })

  return (
    <div>
      <p className="text-section-label mb-1">Signer details</p>
      <p className="text-caption text-lr-muted mb-3">
        These details will appear on the signed document.
      </p>

      <div className="space-y-3">
        <div>
          <Label htmlFor="signer-first-name" className="text-caption">
            First name
          </Label>
          <input
            id="signer-first-name"
            className={cn(inputClass, 'mt-1')}
            value={signerInfo.firstName}
            onChange={update('firstName')}
            autoComplete="given-name"
          />
        </div>

        <div>
          <Label htmlFor="signer-last-name" className="text-caption">
            Last name
          </Label>
          <input
            id="signer-last-name"
            className={cn(inputClass, 'mt-1')}
            value={signerInfo.lastName}
            onChange={update('lastName')}
            autoComplete="family-name"
          />
        </div>

        <div className="flex items-center gap-1.5 pt-0.5">
          <PenLine size={10} className="text-lr-muted shrink-0" />
          <p className="text-micro text-lr-muted">
            Editing your name updates the signature preview
          </p>
        </div>

        {showTitle && (
          <div>
            <Label htmlFor="signer-title" className="text-caption">
              Title
            </Label>
            <input
              id="signer-title"
              className={cn(inputClass, 'mt-1')}
              value={signerInfo.title}
              onChange={update('title')}
              placeholder="e.g. CEO, Director"
              autoComplete="organization-title"
            />
          </div>
        )}
      </div>
    </div>
  )
}
