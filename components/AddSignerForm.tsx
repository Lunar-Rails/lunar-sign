'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
        headers: {
          'Content-Type': 'application/json',
        },
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="lr-label">Signature routing</p>
        <h3 className="font-display mt-2 text-xl font-semibold text-white">Add signer</h3>
      </div>

      {error && (
        <div className="rounded-[12px] border border-[rgba(255,141,151,0.3)] bg-[rgba(255,141,151,0.08)] p-3">
          <p className="text-sm text-[var(--lr-danger)]">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="lr-label block" htmlFor="signer-name">
            Signer name
          </label>
          <input
            id="signer-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Signer name"
            className="lr-input"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="lr-label block" htmlFor="signer-email">
            Signer email
          </label>
          <input
            id="signer-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Signer email"
            className="lr-input"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="lr-button lr-button-primary"
      >
        {isLoading ? 'Adding...' : 'Add signer'}
      </button>
    </form>
  )
}
