import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  CompanyMemberManagement,
  CompanyMemberRow,
} from '@/components/CompanyMemberManagement'

export const dynamic = 'force-dynamic'

interface CompanyMembersPageProps {
  params: Promise<{ slug: string }>
}

interface CompanyMemberQueryRow {
  company_id: string
  user_id: string
  created_at: string
  profiles:
    | {
        id: string
        email: string
        full_name: string
      }
    | {
        id: string
        email: string
        full_name: string
      }[]
    | null
}

export default async function AdminCompanyMembersPage({
  params,
}: CompanyMembersPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle()

  if (!company) redirect('/admin/companies')

  const { data: members } = await supabase
    .from('company_members')
    .select(
      `
      company_id,
      user_id,
      created_at,
      profiles:user_id (
        id,
        email,
        full_name
      )
    `
    )
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })

  const initialMembers: CompanyMemberRow[] = ((members || []) as CompanyMemberQueryRow[]).map(
    (member) => ({
      company_id: member.company_id,
      user_id: member.user_id,
      created_at: member.created_at,
      profiles: Array.isArray(member.profiles)
        ? (member.profiles[0] ?? null)
        : member.profiles,
    })
  )

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-kicker mb-1">{company.name}</p>
        <h1 className="text-page-title">Company Members</h1>
        <p className="text-body mt-1">
          Manage who can access documents in{' '}
          <span className="font-medium text-lr-text">{company.name}</span>.
        </p>
      </div>

      <CompanyMemberManagement
        companyId={company.id}
        initialMembers={initialMembers}
      />
    </div>
  )
}
