'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export interface CompanyMemberRow {
  company_id: string
  user_id: string
  created_at: string
  profiles: {
    id: string
    email: string
    full_name: string
  } | null
}

interface CompanyMemberManagementProps {
  companyId: string
  initialMembers: CompanyMemberRow[]
}

export function CompanyMemberManagement({
  companyId,
  initialMembers,
}: CompanyMemberManagementProps) {
  const router = useRouter()
  const [members, setMembers] = useState<CompanyMemberRow[]>(initialMembers)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) =>
        (a.profiles?.email || '').localeCompare(b.profiles?.email || '')
      ),
    [members]
  )

  async function handleAddMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.trim()) return

    setError(null)
    setIsLoading(true)
    try {
      const response = await fetch(`/api/companies/${companyId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const payload = await response.json()
      if (!response.ok)
        throw new Error(payload.error || 'Failed to add company member')

      const member = payload.data.member as CompanyMemberRow
      setMembers((prev) => {
        const alreadyExists = prev.some((row) => row.user_id === member.user_id)
        if (alreadyExists) return prev
        return [...prev, { ...member, created_at: new Date().toISOString() }]
      })
      setEmail('')
      router.refresh()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to add member'
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRemoveMember(member: CompanyMemberRow) {
    const memberLabel = member.profiles?.email || member.user_id
    const shouldDelete = window.confirm(
      `Remove ${memberLabel} from this company?`
    )
    if (!shouldDelete) return

    setError(null)
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/companies/${companyId}/members/${member.user_id}`,
        { method: 'DELETE' }
      )
      const payload = await response.json()
      if (!response.ok)
        throw new Error(payload.error || 'Failed to remove company member')

      setMembers((prev) => prev.filter((row) => row.user_id !== member.user_id))
      router.refresh()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to remove member'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleAddMember}
        className="rounded-lg border border-gray-200 bg-white p-4"
      >
        <label
          htmlFor="member-email"
          className="block text-sm font-medium text-gray-700"
        >
          Add member by email
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="member-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@company.com"
            className="block flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add Member
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </form>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Added
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                    No members yet.
                  </td>
                </tr>
              )}
              {sortedMembers.map((member) => (
                <tr
                  key={member.user_id}
                  className="border-b border-gray-100 last:border-b-0"
                >
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {member.profiles?.full_name || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {member.profiles?.email || member.user_id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(member.created_at).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member)}
                        className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
