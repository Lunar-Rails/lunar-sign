'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormPending } from '@/components/ui/form-pending'
import { Button } from '@/components/ui/button'
import { AlertCircle, Send } from 'lucide-react'

interface SendDocumentButtonProps {
  documentId: string
}

export default function SendDocumentButton({ documentId }: SendDocumentButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch(`/api/documents/${documentId}/send`, { method: 'POST' })

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
    <FormPending isPending={isLoading} className="block">
    <div className="space-y-2">
      {error && (
        <div className="flex items-center gap-2 rounded-lr border-l-4 border-l-lr-error bg-lr-error-dim px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-lr-error" />
          <p className="text-lr-xs text-lr-error">{error}</p>
        </div>
      )}
      <Button onClick={handleSend} disabled={isLoading}>
        <Send className="h-4 w-4" />
        {isLoading ? 'Sending…' : 'Send for Signing'}
      </Button>
    </div>
    </FormPending>
  )
}
