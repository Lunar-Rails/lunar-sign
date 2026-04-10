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
  { key: 'total', label: 'Total documents' },
  { key: 'draft', label: 'Draft lane' },
  { key: 'pending', label: 'Awaiting signatures' },
  { key: 'completed', label: 'Completed' },
] as const

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient()
  const { company: companySlug } = await searchParams

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

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
    const value = row.companies as
      | Pick<Company, 'id' | 'name' | 'slug'>
      | Pick<Company, 'id' | 'name' | 'slug'>[]
      | null
    if (!value) return
    const companyValues = Array.isArray(value) ? value : [value]
    const current = companiesByDocumentId.get(row.document_id) || []
    companiesByDocumentId.set(row.document_id, [...current, ...companyValues])
  })
  const typesByDocumentId = new Map<string, Pick<DocumentType, 'id' | 'name'>[]>()
  ;(documentTypes || []).forEach((row) => {
    const value = row.document_types as
      | Pick<DocumentType, 'id' | 'name'>
      | Pick<DocumentType, 'id' | 'name'>[]
      | null
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

  const totalDocs = docsWithCompanies.length
  const draftCount = docsWithCompanies.filter((d) => d.status === 'draft').length
  const pendingCount = docsWithCompanies.filter((d) => d.status === 'pending').length
  const completedCount = docsWithCompanies.filter((d) => d.status === 'completed').length

  const pageTitle = activeCompany ? activeCompany.name : 'All Documents'
  const statValues = {
    total: totalDocs,
    draft: draftCount,
    pending: pendingCount,
    completed: completedCount,
  }

  return (
    <div className="space-y-8">
      <section className="lr-panel px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="lr-label">Signing dashboard</p>
            <h1 className="font-display mt-3 text-[2.4rem] font-semibold tracking-[-0.04em] text-white">
              {pageTitle}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--lr-text-soft)]">
              Review documents, watch signature progress, and move between
              company lanes without leaving the shared Lunar Sign shell.
            </p>
            {companySlug && !activeCompany && (
              <p className="mt-3 text-sm text-[var(--lr-danger)]">
                Company not found. Showing no documents.
              </p>
            )}
          </div>

          <DashboardUploadDocumentButton
            activeCompanySlug={activeCompany?.slug ?? null}
            companies={companyOptions}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.key} className="lr-grid-card p-5">
            <p className="lr-label">{card.label}</p>
            <p className="lr-kpi mt-4">{statValues[card.key]}</p>
          </div>
        ))}
      </section>

      <section className="lr-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[rgba(193,178,255,0.12)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="lr-label">Document library</p>
            <h2 className="font-display mt-2 text-xl font-semibold text-white">
              Card-first document view
            </h2>
          </div>
        </div>

        <div className="px-6 py-6">
          <DashboardSearch
            documents={docsWithCompanies}
            documentTypes={(allDocumentTypes || []) as Pick<DocumentType, 'id' | 'name'>[]}
          />
        </div>
      </section>
    </div>
  )
}
