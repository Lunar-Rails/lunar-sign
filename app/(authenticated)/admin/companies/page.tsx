import { createClient } from '@/lib/supabase/server'
import CompanyManagementTable from '@/components/CompanyManagementTable'
import { Company } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function AdminCompaniesPage() {
  const supabase = await createClient()
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .order('name', { ascending: true })

  const rows: Company[] = companies || []

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-kicker mb-1">Admin</p>
        <h1 className="text-page-title">Companies</h1>
        <p className="text-body mt-1">
          Manage workspace-like company groups used to organize documents.
        </p>
      </div>

      <CompanyManagementTable initialCompanies={rows} />
    </div>
  )
}
