import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { Company } from '@/lib/types'
import { countTemplateReadinessBuckets } from '@/lib/template-readiness'
import CompanySidebarClient from '@/components/CompanySidebarClient'

interface CompanySidebarItem {
  id: string
  name: string
  slug: string
  documentCount: number
  templateCount: number
}

export default async function CompanySidebar() {
  const supabase = await createClient()
  const serviceClient = getServiceClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [{ data: companies }, { data: documents }, { count: userCount }, { data: templates }] =
    await Promise.all([
      supabase.from('companies').select('*').order('name', { ascending: true }),
      supabase.from('documents').select('id, status').is('deleted_at', null),
      serviceClient.from('profiles').select('*', { count: 'exact', head: true }),
      supabase
        .from('templates')
        .select('id, document_type_id, field_metadata, template_companies(company_id)')
        .is('deleted_at', null),
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

  const templateCountByCompanyId = new Map<string, number>()
  let totalTemplateCount = 0
  for (const t of templates || []) {
    totalTemplateCount += 1
    const links = t.template_companies as { company_id: string }[] | null
    for (const l of links ?? []) {
      const c = templateCountByCompanyId.get(l.company_id) || 0
      templateCountByCompanyId.set(l.company_id, c + 1)
    }
  }

  const sidebarCompanies: CompanySidebarItem[] = baseCompanies.map((company) => ({
    id: company.id,
    name: company.name,
    slug: company.slug,
    documentCount: countByCompanyId.get(company.id) || 0,
    templateCount: templateCountByCompanyId.get(company.id) || 0,
  }))

  const statusCounts = {
    draft: docs.filter((d) => d.status === 'draft').length,
    pending: docs.filter((d) => d.status === 'pending').length,
    completed: docs.filter((d) => d.status === 'completed').length,
  }

  const templateStatusCounts = countTemplateReadinessBuckets(
    (templates || []).map((t) => {
      const links = t.template_companies as { company_id: string }[] | null
      return {
        document_type_id: t.document_type_id as string | null,
        field_metadata: t.field_metadata,
        companyLinkCount: links?.length ?? 0,
      }
    })
  )

  return (
    <CompanySidebarClient
      companies={sidebarCompanies}
      totalDocumentCount={docs.length}
      totalTemplateCount={totalTemplateCount}
      statusCounts={statusCounts}
      templateStatusCounts={templateStatusCounts}
      adminStats={{ userCount: userCount ?? 0, companyCount: sidebarCompanies.length }}
    />
  )
}
