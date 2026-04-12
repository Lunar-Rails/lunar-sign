import { createClient } from '@/lib/supabase/server'
import { Company, Document, DocumentType } from '@/lib/types'
import DashboardSearch from '@/components/DashboardSearch'
import { DashboardUploadDocumentButton } from '@/components/DashboardUploadDocumentButton'

export const dynamic = 'force-dynamic'

interface DashboardPageProps {
  searchParams: Promise<{ company?: string }>
}

interface DashboardDocument extends Document {
  companies: Pick<Company, 'id' | 'name' | 'slug'>[]
  types: Pick<DocumentType, 'id' | 'name'>[]
}

const statCards = [
  { label: 'Total', key: 'total', color: 'text-lr-text' },
  { label: 'Draft', key: 'draft', color: 'text-lr-muted' },
  { label: 'Pending', key: 'pending', color: 'text-lr-warning' },
  { label: 'Completed', key: 'completed', color: 'text-lr-cyan' },
] as const

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient()
  const { company: companySlug } = await searchParams

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: allCompanies } = await supabase
    .from('companies')
    .select('slug, name')
    .order('name', { ascending: true })
  const companyOptions = (allCompanies || []) as Pick<Company, 'slug' | 'name'>[]

  let activeCompany: Pick<Company, 'id' | 'name' | 'slug'> | null = null
  let docs: Document[] = []

  if (!companySlug) {
    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })
    docs = documents || []
  } else {
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, slug')
      .eq('slug', companySlug)
      .maybeSingle()

    activeCompany = company

    if (company) {
      const { data: linkedDocumentRows } = await supabase
        .from('document_companies')
        .select('document_id')
        .eq('company_id', company.id)

      const linkedDocumentIds = (linkedDocumentRows || []).map((row) => row.document_id)
      if (linkedDocumentIds.length > 0) {
        const { data: documents } = await supabase
          .from('documents')
          .select('*')
          .in('id', linkedDocumentIds)
          .order('created_at', { ascending: false })
        docs = documents || []
      }
    }
  }

  const docIds = docs.map((doc) => doc.id)
  const { data: allDocumentTypes } = await supabase
    .from('document_types')
    .select('id, name')
    .order('name', { ascending: true })

  const { data: documentCompanies } = docIds.length
    ? await supabase
        .from('document_companies')
        .select('document_id, companies(id, name, slug)')
        .in('document_id', docIds)
    : { data: [] }

  const { data: documentTypes } = docIds.length
    ? await supabase
        .from('document_document_types')
        .select('document_id, document_types(id, name)')
        .in('document_id', docIds)
    : { data: [] }

  const companiesByDocumentId = new Map<string, Pick<Company, 'id' | 'name' | 'slug'>[]>()
  ;(documentCompanies || []).forEach((row) => {
    const value = row.companies as Pick<Company, 'id' | 'name' | 'slug'> | Pick<Company, 'id' | 'name' | 'slug'>[] | null
    if (!value) return
    const companyValues = Array.isArray(value) ? value : [value]
    const current = companiesByDocumentId.get(row.document_id) || []
    companiesByDocumentId.set(row.document_id, [...current, ...companyValues])
  })

  const typesByDocumentId = new Map<string, Pick<DocumentType, 'id' | 'name'>[]>()
  ;(documentTypes || []).forEach((row) => {
    const value = row.document_types as Pick<DocumentType, 'id' | 'name'> | Pick<DocumentType, 'id' | 'name'>[] | null
    if (!value) return
    const typeValues = Array.isArray(value) ? value : [value]
    const current = typesByDocumentId.get(row.document_id) || []
    typesByDocumentId.set(row.document_id, [...current, ...typeValues])
  })

  const docsWithCompanies: DashboardDocument[] = docs.map((doc) => ({
    ...doc,
    companies: companiesByDocumentId.get(doc.id) || [],
    types: typesByDocumentId.get(doc.id) || [],
  }))

  const stats = {
    total: docsWithCompanies.length,
    draft: docsWithCompanies.filter((d) => d.status === 'draft').length,
    pending: docsWithCompanies.filter((d) => d.status === 'pending').length,
    completed: docsWithCompanies.filter((d) => d.status === 'completed').length,
  }

  const pageTitle = activeCompany ? activeCompany.name : 'All Documents'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">{pageTitle}</h1>
        {companySlug && !activeCompany && (
          <p className="text-caption mt-1 text-lr-error">
            Company not found. Showing no documents.
          </p>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map(({ label, key, color }) => (
          <div
            key={key}
            className="rounded-lr-lg border border-lr-border bg-lr-surface p-5 shadow-lr-card"
          >
            <p className="text-section-label">{label}</p>
            <p className={`mt-2 font-display text-lr-3xl font-bold ${color}`}>{stats[key]}</p>
          </div>
        ))}
      </div>

      {/* Documents Panel */}
      <div className="rounded-lr-lg border border-lr-border bg-lr-surface shadow-lr-card">
        <div className="border-b border-lr-border px-6 py-4">
          <p className="text-kicker">Documents</p>
          <h2 className="text-card-title mt-0.5">{pageTitle}</h2>
        </div>
        <div className="px-6 py-4">
          <DashboardSearch
            documents={docsWithCompanies}
            documentTypes={(allDocumentTypes || []) as Pick<DocumentType, 'id' | 'name'>[]}
          />
        </div>
      </div>

      <DashboardUploadDocumentButton
        activeCompanySlug={activeCompany?.slug ?? null}
        companies={companyOptions}
      />
    </div>
  )
}
