'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Invitation, UserRole } from '@/lib/types'

interface InvitationCompany {
  id: string
  name: string
  slug: string
}

export interface InvitationWithCompanies extends Invitation {
  role: UserRole
  companies: InvitationCompany[]
}

interface InvitationsTableProps {
  initialInvitations: InvitationWithCompanies[]
}

export function InvitationsTable({ initialInvitations }: InvitationsTableProps) {
  const router = useRouter()
  const [invitations, setInvitations] =
    useState<InvitationWithCompanies[]>(initialInvitations)
  const [error, setError] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const sortedInvitations = useMemo(
    () =>
      [...invitations].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [invitations]
  )

  async function handleRevoke(invitation: InvitationWithCompanies) {
    const shouldRevoke = window.confirm(
      `Revoke invitation for ${invitation.email}?`
    )
    if (!shouldRevoke) return

    setError(null)
    setRevokingId(invitation.id)

    try {
      const response = await fetch(`/api/admin/invitations/${invitation.id}`, {
        method: 'DELETE',
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to revoke invitation')

      setInvitations((prev) =>
        prev.map((row) =>
          row.id === invitation.id ? { ...row, status: 'revoked' } : row
        )
      )
      router.refresh()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to revoke invitation'
      )
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">Invitations</h2>
        <p className="text-sm text-gray-600">
          Pending, accepted, and revoked invitation records.
        </p>
      </div>

      {error && <p className="px-4 pt-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Companies
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Invited
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedInvitations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                  No invitations found.
                </td>
              </tr>
            )}

            {sortedInvitations.map((invitation) => (
              <tr key={invitation.id} className="border-b border-gray-100 last:border-b-0">
                <td className="px-4 py-3 text-sm text-gray-900">{invitation.email}</td>
                <td className="px-4 py-3 text-sm text-gray-700 capitalize">
                  {invitation.role}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {invitation.companies.length === 0 ? (
                    <span className="text-gray-500">All personal uploads only</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {invitation.companies.map((company) => (
                        <span
                          key={company.id}
                          className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
                        >
                          {company.name}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      invitation.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : invitation.status === 'accepted'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {invitation.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(invitation.created_at).toLocaleDateString('en-US')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    {invitation.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(invitation)}
                        disabled={revokingId === invitation.id}
                        className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {revokingId === invitation.id ? 'Revoking...' : 'Revoke'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
