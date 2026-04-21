'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Invitation, UserRole } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertCircle } from 'lucide-react'

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

type InviteStatusVariant = 'warning' | 'success' | 'secondary'

function inviteStatusVariant(status: string): InviteStatusVariant {
  if (status === 'pending') return 'warning'
  if (status === 'accepted') return 'success'
  return 'secondary'
}

export function InvitationsTable({ initialInvitations }: InvitationsTableProps) {
  const router = useRouter()
  const [invitations, setInvitations] = useState<InvitationWithCompanies[]>(initialInvitations)
  const [error, setError] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  useEffect(() => {
    setInvitations(initialInvitations)
  }, [initialInvitations])

  const sortedInvitations = useMemo(
    () => [...invitations].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [invitations]
  )

  async function handleRevoke(invitation: InvitationWithCompanies) {
    if (!window.confirm(`Revoke invitation for ${invitation.email}?`)) return

    setError(null)
    setRevokingId(invitation.id)

    try {
      const response = await fetch(`/api/admin/invitations/${invitation.id}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to revoke invitation')

      setInvitations((prev) =>
        prev.map((row) => (row.id === invitation.id ? { ...row, status: 'revoked' } : row))
      )
      router.refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to revoke invitation')
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <div className="rounded-lr-lg border border-lr-border bg-lr-surface shadow-lr-card overflow-hidden">
      <div className="border-b border-lr-border px-5 py-4">
        <h2 className="font-display text-lr-xl font-semibold text-lr-text">Invitations</h2>
        <p className="text-lr-sm text-lr-muted">Pending, accepted, and revoked invitation records.</p>
      </div>

      {error && (
        <div className="mx-5 mt-4 flex items-center gap-2 rounded-lr border-l-4 border-l-lr-error bg-lr-error-dim px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-lr-error" />
          <p className="text-lr-sm text-lr-error">{error}</p>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Companies</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Invited</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedInvitations.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-lr-muted py-8">
                No invitations found.
              </TableCell>
            </TableRow>
          )}

          {sortedInvitations.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell className="font-medium text-lr-text">{invitation.email}</TableCell>
              <TableCell className="capitalize text-lr-muted">{invitation.role}</TableCell>
              <TableCell>
                {invitation.companies.length === 0 ? (
                  <span className="text-lr-xs text-lr-muted">All personal uploads only</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {invitation.companies.map((company) => (
                      <Badge key={company.id} variant="outline">{company.name}</Badge>
                    ))}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={inviteStatusVariant(invitation.status)}>
                  {invitation.status}
                </Badge>
              </TableCell>
              <TableCell className="text-lr-muted">
                {new Date(invitation.created_at).toLocaleDateString('en-US')}
              </TableCell>
              <TableCell className="text-right">
                {invitation.status === 'pending' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRevoke(invitation)}
                    disabled={revokingId === invitation.id}
                  >
                    {revokingId === invitation.id ? 'Revoking…' : 'Revoke'}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
