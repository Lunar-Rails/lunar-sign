'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserRound, X } from 'lucide-react'

import { SignatureRequest } from '@/lib/types'

interface SignersSectionProps {
  documentId: string
  signers: SignatureRequest[]
  isEditable: boolean
}

function getStatusBadgeStyles(status: string) {
  switch (status) {
    case 'pending':
      return 'lr-status-chip lr-status-pending'
    case 'signed':
      return 'lr-status-chip lr-status-signed'
    case 'declined':
    case 'cancelled':
      return 'lr-status-chip lr-status-cancelled'
    default:
      return 'lr-status-chip'
  }
}

export default function SignersSection({
  signers,
  isEditable,
}: SignersSectionProps) {
  const router = useRouter()
  const [isRemoving, setIsRemoving] = useState<string | null>(null)

  const handleRemoveSigner = async (requestId: string) => {
    setIsRemoving(requestId)
    try {
      const response = await fetch('/api/signature-requests', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ request_id: requestId }),
      })

      if (!response.ok) {
        throw new Error('Failed to remove signer')
      }

      router.refresh()
    } catch (error) {
      console.error('Error removing signer:', error)
      setIsRemoving(null)
    }
  }

  return (
    <div className="lr-panel p-6">
      <p className="lr-label">Signature requests</p>
      <h2 className="font-display mt-2 text-xl font-semibold text-white">Signers</h2>

      {signers.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--lr-text-muted)]">No signers added yet.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {signers.map((signer) => (
            <div
              key={signer.id}
              className="lr-grid-card flex items-center justify-between gap-3 p-4"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(193,178,255,0.16)] bg-[rgba(124,92,252,0.12)] text-[var(--lr-accent-soft)]">
                  <UserRound className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {signer.signer_name}
                  </p>
                  <p className="truncate text-xs text-[var(--lr-text-muted)]">
                    {signer.signer_email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={getStatusBadgeStyles(signer.status)}>
                  {signer.status.charAt(0).toUpperCase() + signer.status.slice(1)}
                </span>
                {isEditable && (
                  <button
                    onClick={() => handleRemoveSigner(signer.id)}
                    disabled={isRemoving === signer.id}
                    className="lr-button lr-button-danger px-3 py-2 text-xs"
                  >
                    <X className="h-3.5 w-3.5" />
                    {isRemoving === signer.id ? 'Removing...' : 'Remove'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
