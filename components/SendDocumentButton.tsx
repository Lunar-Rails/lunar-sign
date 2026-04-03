'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SendDocumentButtonProps {
  documentId: string
}

export default function SendDocumentButton({
  documentId,
}: SendDocumentButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch(`/api/documents/${documentId}/send`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send document')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-2 rounded-md border border-red-200 bg-red-50 p-2">
          <p className="text-xs text-red-800">{error}</p>
        </div>
      )}
      <button
        onClick={handleSend}
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Sending...' : 'Send for Signing'}
      </button>
    </div>
  )
}
