'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'

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
        <div className="mb-2 rounded-[12px] border border-[rgba(255,141,151,0.3)] bg-[rgba(255,141,151,0.08)] p-2">
          <p className="text-xs text-[var(--lr-danger)]">{error}</p>
        </div>
      )}
      <button
        onClick={handleSend}
        disabled={isLoading}
        className="lr-button lr-button-primary"
      >
        <Send className="h-4 w-4" />
        {isLoading ? 'Sending...' : 'Send for signing'}
      </button>
    </div>
  )
}
