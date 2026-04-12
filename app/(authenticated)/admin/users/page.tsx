import { getServiceClient } from '@/lib/supabase/service'
import { Profile } from '@/lib/types'
import RoleToggle from '@/components/RoleToggle'
import { InviteUserForm } from '@/components/InviteUserForm'
import { InvitationsTable, InvitationWithCompanies } from '@/components/InvitationsTable'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const dynamic = 'force-dynamic'

interface InvitationRow {
  id: string
  email: string
  role: 'admin' | 'member'
  invited_by: string
  status: 'pending' | 'accepted' | 'revoked'
  created_at: string
  invitation_companies: {
    company_id: string
    companies: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null
  }[] | null
}

export default async function AdminUsersPage() {
  const supabase = getServiceClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, slug')
    .order('name', { ascending: true })

  const { data: invitationRows } = await supabase
    .from('invitations')
    .select('id, email, role, invited_by, status, created_at, invitation_companies(company_id, companies(id, name, slug))')
    .order('created_at', { ascending: false })

  const users: Profile[] = profiles || []
  const invitationList: InvitationWithCompanies[] = (
    (invitationRows || []) as InvitationRow[]
  ).map((invitation) => ({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    invited_by: invitation.invited_by,
    status: invitation.status,
    created_at: invitation.created_at,
    companies: (invitation.invitation_companies || []).flatMap((row) => {
      if (!row.companies) return []
      if (Array.isArray(row.companies)) return row.companies
      return [row.companies]
    }),
  }))

  return (
    <div className="space-y-6">
      <div>
        <p className="text-kicker mb-1">Admin</p>
        <h1 className="text-page-title">Manage Users</h1>
        <p className="text-body mt-1">View and manage user roles across the system.</p>
      </div>

      <InviteUserForm companies={companies || []} />
      <InvitationsTable initialInvitations={invitationList} />

      {/* Users Table */}
      <div className="rounded-lr-lg border border-lr-border bg-lr-surface shadow-lr-card overflow-hidden">
        <div className="px-5 py-4 border-b border-lr-border">
          <h2 className="text-card-title">Users</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-lr-muted py-8">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-lr-text">{user.full_name}</TableCell>
                  <TableCell className="text-lr-muted">{user.email}</TableCell>
                  <TableCell>
                    <RoleToggle userId={user.id} currentRole={user.role} />
                  </TableCell>
                  <TableCell className="text-lr-muted">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
