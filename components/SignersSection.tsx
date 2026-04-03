'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignatureRequest } from '@/lib/types'

interface SignersSectionProps {
  documentId: string
  signers: SignatureRequest[]
  isEditable: boolean
}

function getStatusBadgeStyles(status: string) {
  switch (status) {
    case 'pending':
      return 'inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800'
    case 'signed':
      return 'inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800'
    case 'declined':
    case 'cancelled':
      return 'inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800'
    default:
      return ''
  }
}

export default function SignersSection({
  documentId,
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
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Signers</h2>

      {signers.length === 0 ? (
        <p className="text-sm text-gray-500">No signers added yet.</p>
      ) : (
        <div className="space-y-3">
          {signers.map((signer) => (
            <div
              key={signer.id}
              className="flex items-center justify-between rounded-md border border-gray-100 p-3"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {signer.signer_name}
                </p>
                <p className="text-xs text-gray-500">{signer.signer_email}</p>
              </div>
              <span className={getStatusBadgeStyles(signer.status)}>
                {signer.status.charAt(0).toUpperCase() +
                  signer.status.slice(1)}
              </span>
              {isEditable && (
                <button
                  onClick={() => handleRemoveSigner(signer.id)}
                  disabled={isRemoving === signer.id}
                  className="ml-3 inline-flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRemoving === signer.id ? 'Removing...' : 'Remove'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
