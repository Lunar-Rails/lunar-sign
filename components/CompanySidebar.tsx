import { createClient } from '@/lib/supabase/server'
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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [{ data: profile }, { data: companies }, { data: documents }] =
    await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase.from('companies').select('*').order('name', { ascending: true }),
      supabase.from('documents').select('id'),
    ])

  const docs = documents || []
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

  return (
    <CompanySidebarClient
      companies={sidebarCompanies}
      totalDocumentCount={docs.length}
      canManageCompanies={profile?.role === 'admin'}
    />
  )
}
