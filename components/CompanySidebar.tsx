import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { Company } from '@/lib/types'
import CompanySidebarClient from '@/components/CompanySidebarClient'

interface CompanySidebarItem {
  id: string
  name: string
  slug: string
  documentCount: number
}

export default async function CompanySidebar() {
  const supabase = await createClient()
  const serviceClient = getServiceClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [{ data: companies }, { data: documents }, { count: userCount }] = await Promise.all([
    supabase.from('companies').select('*').order('name', { ascending: true }),
    supabase.from('documents').select('id, status'),
    serviceClient.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  const docs = (documents || []) as { id: string; status: string }[]
  const baseCompanies: Company[] = companies || []
  const documentIds = docs.map((doc) => doc.id)

  const { data: documentCompanies } = documentIds.length
    ? await supabase
        .from('document_companies')
        .select('document_id, company_id')
        .in('document_id', documentIds)
    : { data: [] }

  const countByCompanyId = new Map<string, number>()
  ;(documentCompanies || []).forEach((row) => {
    const current = countByCompanyId.get(row.company_id) || 0
    countByCompanyId.set(row.company_id, current + 1)
  })

  const sidebarCompanies: CompanySidebarItem[] = baseCompanies.map((company) => ({
    id: company.id,
    name: company.name,
    slug: company.slug,
    documentCount: countByCompanyId.get(company.id) || 0,
  }))

  const statusCounts = {
    draft: docs.filter((d) => d.status === 'draft').length,
    pending: docs.filter((d) => d.status === 'pending').length,
    completed: docs.filter((d) => d.status === 'completed').length,
  }

  return (
    <CompanySidebarClient
      companies={sidebarCompanies}
      totalDocumentCount={docs.length}
      statusCounts={statusCounts}
      adminStats={{ userCount: userCount ?? 0, companyCount: sidebarCompanies.length }}
    />
  )
}
