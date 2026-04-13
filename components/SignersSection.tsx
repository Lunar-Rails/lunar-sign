'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DocumentStatus, SignatureRequest } from '@/lib/types'
import AddSignerForm from '@/components/AddSignerForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { UserMinus, Users } from 'lucide-react'

interface SignersSectionProps {
  documentId: string
  signers: SignatureRequest[]
  documentStatus: DocumentStatus
}

type StatusVariant = 'warning' | 'success' | 'destructive' | 'secondary'

function signerStatusVariant(status: string): StatusVariant {
  switch (status) {
    case 'pending': return 'warning'
    case 'signed': return 'success'
    case 'declined':
    case 'cancelled': return 'destructive'
    default: return 'secondary'
  }
}

const SLOT_BADGE_STYLES: Record<number, string> = {
  0: 'bg-lr-accent/10 text-lr-accent border-lr-accent/30',
  1: 'bg-lr-cyan/10 text-lr-cyan border-lr-cyan/30',
}

function SignerSlotBadge({ signerIndex }: { signerIndex: number | null }) {
  if (signerIndex === null) return null
  const label = signerIndex === 0 ? 'S1' : `S${signerIndex + 1}`
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-1.5 py-0.5 font-display text-micro font-semibold',
        SLOT_BADGE_STYLES[signerIndex] ?? 'bg-lr-surface text-lr-muted border-lr-border'
      )}
    >
      {label}
    </span>
  )
}

export default function SignersSection({
  documentId,
  signers,
  documentStatus,
}: SignersSectionProps) {
  const router = useRouter()
  const [isRemoving, setIsRemoving] = useState<string | null>(null)
  const isEditable = documentStatus === 'draft'

  const signedCount = signers.filter((s) => s.status === 'signed').length
  const totalCount = signers.length

  const handleRemoveSigner = async (requestId: string) => {
    setIsRemoving(requestId)
    try {
      const response = await fetch('/api/signature-requests', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId }),
      })

      if (!response.ok) throw new Error('Failed to remove signer')
      router.refresh()
    } catch (error) {
      console.error('Error removing signer:', error)
      setIsRemoving(null)
    }
  }

  return (
    <div className="rounded-lr-lg border border-lr-border bg-lr-surface shadow-lr-card">
      <div className="flex items-center justify-between border-b border-lr-border px-4 py-3">
        <h2 className="font-display text-lr-sm font-semibold text-lr-text">Signers</h2>
        {totalCount > 0 && documentStatus === 'pending' && (
          <span className="text-lr-xs text-lr-muted">
            {signedCount} of {totalCount} signed
          </span>
        )}
      </div>

      {documentStatus === 'pending' && totalCount > 0 && (
        <div className="border-b border-lr-border px-4 py-2">
          <Progress value={(signedCount / totalCount) * 100} className="h-1.5" />
        </div>
      )}

      <div className="px-4 py-3">
        {signers.length === 0 ? (
          <div className="flex flex-col items-center py-4 text-center">
            <Users className="h-6 w-6 text-lr-muted" />
            <p className="mt-2 text-lr-sm text-lr-muted">
              {isEditable ? 'Add at least one signer to continue' : 'No signers'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {signers.map((signer) => (
              <div
                key={signer.id}
                className="flex items-center justify-between rounded-lr border border-lr-border bg-lr-glass px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <SignerSlotBadge signerIndex={signer.signer_index ?? null} />
                    <p className="truncate text-lr-sm font-medium text-lr-text">
                      {signer.signer_name}
                    </p>
                  </div>
                  <p className="truncate text-lr-xs text-lr-muted">
                    {signer.signer_email}
                  </p>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  <Badge variant={signerStatusVariant(signer.status)}>
                    {signer.status.charAt(0).toUpperCase() + signer.status.slice(1)}
                  </Badge>
                  {isEditable && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-lr-muted hover:text-lr-error hover:bg-lr-error-dim"
                      onClick={() => handleRemoveSigner(signer.id)}
                      disabled={isRemoving === signer.id}
                      title="Remove signer"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isEditable && (
        <div className="border-t border-lr-border px-4 py-3">
          <AddSignerForm documentId={documentId} />
        </div>
      )}
    </div>
  )
}
