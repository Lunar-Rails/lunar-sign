import { getServiceClient } from '@/lib/supabase/service'

import { Profile } from '@/lib/types'

import RoleToggle from '@/components/RoleToggle'
import { InviteUserForm } from '@/components/InviteUserForm'
import {
  InvitationsTable,
  InvitationWithCompanies,
} from '@/components/InvitationsTable'

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
    companies:
      | { id: string; name: string; slug: string }
      | { id: string; name: string; slug: string }[]
      | null
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
    .select(
      'id, email, role, invited_by, status, created_at, invitation_companies(company_id, companies(id, name, slug))'
    )
    .order('created_at', { ascending: false })

  const users: Profile[] = profiles || []
  const invitationList: InvitationWithCompanies[] = (
    (invitationRows || []) as InvitationRow[]
  ).map(
    (invitation) => ({
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
    })
  )

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
        <p className="mt-2 text-gray-600">
          View and manage user roles across the system.
        </p>
      </div>

      <InviteUserForm companies={companies || []} />
      <InvitationsTable initialInvitations={invitationList} />

      {/* Users Table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Name
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Email
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Role
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Created At
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-600">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {user.full_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <RoleToggle userId={user.id} currentRole={user.role} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
