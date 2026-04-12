'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

interface AddSignerFormProps {
  documentId: string
}

export default function AddSignerForm({ documentId }: AddSignerFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/signature-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          signer_name: name,
          signer_email: email,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add signer')
      }

      setName('')
      setEmail('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {error && (
        <div className="flex items-center gap-2 rounded-lr bg-lr-error-dim px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-lr-error" />
          <p className="text-lr-xs text-lr-error">{error}</p>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="min-w-0 flex-1"
          required
        />
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="min-w-0 flex-1"
          required
        />
        <Button type="submit" disabled={isLoading} size="sm" className="shrink-0">
          {isLoading ? '…' : 'Add'}
        </Button>
      </div>
    </form>
  )
}
