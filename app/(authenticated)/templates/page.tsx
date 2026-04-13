import { createClient } from '@/lib/supabase/server'
import { Company, DocumentType } from '@/lib/types'
import { countTemplateReadinessBuckets } from '@/lib/template-readiness'
import TemplatesSearch, { type TemplateListRow } from '@/components/TemplatesSearch'
import { DashboardUploadTemplateButton } from '@/components/DashboardUploadTemplateButton'
import { ListStatCards } from '@/components/ListStatCards'

export const dynamic = 'force-dynamic'

interface TemplatesPageProps {
  searchParams: Promise<{ company?: string }>
}

function normalizeDocumentTypeJoin(
  value: unknown
): { id: string; name: string } | null {
  if (!value || typeof value !== 'object') return null
  if (Array.isArray(value)) {
    const first = value[0]
    if (first && typeof first === 'object' && 'id' in first && 'name' in first)
      return { id: String(first.id), name: String(first.name) }
    return null
  }
  const o = value as { id: unknown; name: unknown }
  if (o.id != null && o.name != null) return { id: String(o.id), name: String(o.name) }
  return null
}

function templateRowToListRow(row: {
  id: string
  title: string
  document_type_id: string | null
  field_metadata: unknown
  created_at: string
  updated_at: string
  document_types: unknown
  template_companies: unknown
}): TemplateListRow {
  const typeOne = normalizeDocumentTypeJoin(row.document_types)
  const links = (row.template_companies ?? []) as {
    companies?: Pick<Company, 'id' | 'name' | 'slug'> | Pick<Company, 'id' | 'name' | 'slug'>[] | null
  }[]
  const companies: Pick<Company, 'id' | 'name' | 'slug'>[] = []
  for (const link of links) {
    const c = link.companies
    if (!c) continue
    const arr = Array.isArray(c) ? c : [c]
    for (const item of arr) {
      if (item?.id && item?.name != null && item?.slug != null) {
        companies.push({
          id: String(item.id),
          name: String(item.name),
          slug: String(item.slug),
        })
      }
    }
  }
  return {
    id: row.id,
    title: row.title,
    document_type_id: row.document_type_id,
    field_metadata: row.field_metadata,
    created_at: row.created_at,
    updated_at: row.updated_at,
    types: typeOne ? [typeOne] : [],
    companies,
  }
}

export default async function TemplatesPage({ searchParams }: TemplatesPageProps) {
  const supabase = await createClient()
  const { company: companySlug } = await searchParams

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: allCompanies } = await supabase
    .from('companies')
    .select('slug, name')
    .order('name', { ascending: true })
  const companyOptions = (allCompanies || []) as Pick<Company, 'slug' | 'name'>[]

  let activeCompany: Pick<Company, 'id' | 'name' | 'slug'> | null = null
  let companyId: string | null = null

  if (companySlug) {
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, slug')
      .eq('slug', companySlug)
      .maybeSingle()
    activeCompany = company
    companyId = company?.id ?? null
  }

  const { data: documentTypeRows } = await supabase
    .from('document_types')
    .select('id, name')
    .order('name', { ascending: true })
  const documentTypes = (documentTypeRows || []) as Pick<DocumentType, 'id' | 'name'>[]

  const { data: rows } = await supabase
    .from('templates')
    .select(
      `
      id,
      title,
      document_type_id,
      field_metadata,
      created_at,
      updated_at,
      document_types(id, name),
      template_companies(
        company_id,
        companies(id, name, slug)
      )
    `
    )
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  let list = (rows ?? []).map(templateRowToListRow)

  if (companyId) {
    list = list.filter((row) => row.companies.some((c) => c.id === companyId))
  }

  const stats = countTemplateReadinessBuckets(
    list.map((row) => ({
      document_type_id: row.document_type_id,
      field_metadata: row.field_metadata,
      companyLinkCount: row.companies.length,
    }))
  )

  const pageTitle = activeCompany ? activeCompany.name : 'All Templates'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">{pageTitle}</h1>
        {companySlug && !activeCompany && (
          <p className="text-caption mt-1 text-lr-error">Company not found. Showing no templates.</p>
        )}
      </div>

      <ListStatCards stats={stats} />

      <div className="rounded-lr-lg border border-lr-border bg-lr-surface shadow-lr-card">
        <div className="border-b border-lr-border px-6 py-4">
          <p className="text-kicker">Templates</p>
          <h2 className="text-card-title mt-0.5">{pageTitle}</h2>
        </div>
        <div className="px-6 py-4">
          <TemplatesSearch templates={list} documentTypes={documentTypes} />
        </div>
      </div>

      <DashboardUploadTemplateButton
        activeCompanySlug={activeCompany?.slug ?? null}
        companies={companyOptions}
      />
    </div>
  )
}
