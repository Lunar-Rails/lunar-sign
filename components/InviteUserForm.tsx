'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Company, UserRole } from '@/lib/types'

interface InviteUserFormProps {
  companies: Pick<Company, 'id' | 'name' | 'slug'>[]
}

export function InviteUserForm({ companies }: InviteUserFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('member')
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  function handleCompanyToggle(companyId: string) {
    setSelectedCompanyIds((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.trim()) return

    setError(null)
    setSuccessMessage(null)
    setIsSaving(true)

    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          role,
          companyIds: selectedCompanyIds,
        }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to create invitation')

      setEmail('')
      setRole('member')
      setSelectedCompanyIds([])
      setSuccessMessage('Invitation saved. Permissions will apply on first login.')
      router.refresh()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to create invitation'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-900">Invite user</h2>
      <p className="mt-1 text-sm text-gray-600">
        Add an email, workspace role, and optional company access.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="invite-email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@company.com"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            disabled={isSaving}
            required
          />
        </div>

        <div>
          <label
            htmlFor="invite-role"
            className="block text-sm font-medium text-gray-700"
          >
            Workspace role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            disabled={isSaving}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">
          Company access
        </label>
        {companies.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">No companies available yet.</p>
        ) : (
          <div className="mt-2 max-h-44 space-y-2 overflow-y-auto rounded-md border border-gray-200 p-3">
            {companies.map((company) => (
              <label
                key={company.id}
                className="flex items-center gap-2 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={selectedCompanyIds.includes(company.id)}
                  onChange={() => handleCompanyToggle(company.id)}
                  className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  disabled={isSaving}
                />
                <span>{company.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={isSaving || !email.trim()}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Send Invite'}
        </button>
        {successMessage && <p className="text-sm text-emerald-700">{successMessage}</p>}
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </form>
  )
}
