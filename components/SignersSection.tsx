'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignatureRequest } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserMinus, Users } from 'lucide-react'

interface SignersSectionProps {
  documentId: string
  signers: SignatureRequest[]
  isEditable: boolean
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

export default function SignersSection({ signers, isEditable }: SignersSectionProps) {
  const router = useRouter()
  const [isRemoving, setIsRemoving] = useState<string | null>(null)

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
    <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-5 shadow-lr-card">
      <h2 className="mb-4 font-display text-lr-xl font-semibold text-lr-text">Signers</h2>

      {signers.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <Users className="h-8 w-8 text-lr-muted" />
          <p className="mt-2 text-lr-sm text-lr-muted">No signers added yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {signers.map((signer) => (
            <div
              key={signer.id}
              className="flex items-center justify-between rounded-lr border border-lr-border bg-lr-glass px-4 py-3"
            >
              <div className="flex-1">
                <p className="text-lr-sm font-medium text-lr-text">{signer.signer_name}</p>
                <p className="text-lr-xs text-lr-muted">{signer.signer_email}</p>
              </div>
              <Badge variant={signerStatusVariant(signer.status)}>
                {signer.status.charAt(0).toUpperCase() + signer.status.slice(1)}
              </Badge>
              {isEditable && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-3 text-lr-error hover:text-lr-error hover:bg-lr-error-dim"
                  onClick={() => handleRemoveSigner(signer.id)}
                  disabled={isRemoving === signer.id}
                >
                  <UserMinus className="h-4 w-4" />
                  {isRemoving === signer.id ? 'Removing…' : 'Remove'}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
