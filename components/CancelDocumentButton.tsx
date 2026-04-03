'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CancelDocumentButtonProps {
  documentId: string
}

export function CancelDocumentButton({ documentId }: CancelDocumentButtonProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleClick() {
    if (
      !window.confirm(
        'Revoke this signing request? Signers will no longer be able to sign with their links.'
      )
    )
      return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/documents/${documentId}/cancel`, {
        method: 'POST',
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(body?.error || 'Failed to revoke')
      }

      router.refresh()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Failed to revoke')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSubmitting}
      className="inline-block rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isSubmitting ? 'Revoking…' : 'Revoke signing request'}
    </button>
  )
}
