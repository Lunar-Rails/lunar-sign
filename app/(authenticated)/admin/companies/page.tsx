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
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Companies</h1>
      <p className="mb-8 text-gray-600">
        Manage workspace-like company groups used to organize documents.
      </p>

      <CompanyManagementTable initialCompanies={rows} />
    </div>
  )
}
