import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import { Document, SignatureRequest, Company, DocumentType } from '@/lib/types'
import { mapSupabaseAuditRows } from '@/lib/map-audit-log-row'

import AddSignerForm from '@/components/AddSignerForm'

import SignersSection from '@/components/SignersSection'

import { AuditTimeline } from '@/components/AuditTimeline'

import SendDocumentButton from '@/components/SendDocumentButton'
import { CancelDocumentButton } from '@/components/CancelDocumentButton'
import DocumentPdfPreview from '@/components/DocumentPdfPreview'
import DocumentCompaniesEditor from '@/components/DocumentCompaniesEditor'
import DocumentTypeInlineEditor from '@/components/DocumentTypeInlineEditor'

export const dynamic = 'force-dynamic'


interface DocumentDetailPageProps {
  params: Promise<{ id: string }>
}

function getStatusBadgeStyles(status: string) {
  switch (status) {
    case 'draft':
      return 'inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800'
    case 'pending':
      return 'inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800'
    case 'completed':
      return 'inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800'
    case 'cancelled':
      return 'inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800'
    default:
      return ''
  }
}

export default async function DocumentDetailPage({
  params,
}: DocumentDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch document
  const { data: document } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()

  if (!document) {
    redirect('/dashboard')
  }

  const doc: Document = document

  const [
    { data: signatureRequests },
    { data: auditLogs },
    { data: companies },
    { data: assignedCompanyRows },
    { data: assignedTypeRows },
    { data: allDocumentTypeRows },
  ] = await Promise.all([
    supabase
      .from('signature_requests')
      .select(
        'id, document_id, signer_name, signer_email, requested_by, status, signed_at, created_at'
      )
      .eq('document_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('audit_log')
      .select(
        `
        id,
        actor_id,
        action,
        entity_type,
        entity_id,
        metadata,
        created_at,
        profiles:actor_id(email, full_name)
      `
      )
      .eq('entity_id', id)
      .eq('entity_type', 'document')
      .order('created_at', { ascending: false }),
    supabase.from('companies').select('*').order('name', { ascending: true }),
    supabase
      .from('document_companies')
      .select('company_id, companies(id, name, slug)')
      .eq('document_id', id),
    supabase
      .from('document_document_types')
      .select('document_type_id, document_types(id, name)')
      .eq('document_id', id),
    supabase
      .from('document_types')
      .select('name')
      .order('name', { ascending: true }),
  ])

  const allCompanies: Company[] = companies || []
  const assignedCompanies = (assignedCompanyRows || [])
    .flatMap((row) => {
      const value = row.companies as
        | Pick<Company, 'id' | 'name' | 'slug'>
        | Pick<Company, 'id' | 'name' | 'slug'>[]
        | null
      if (!value) return []
      if (Array.isArray(value)) return value
      return [value]
    })
  const assignedCompanyIds = assignedCompanies.map((company) => company.id)
  const assignedTypes = (assignedTypeRows || []).flatMap((row) => {
    const value = row.document_types as
      | Pick<DocumentType, 'id' | 'name'>
      | Pick<DocumentType, 'id' | 'name'>[]
      | null
    if (!value) return []
    if (Array.isArray(value)) return value
    return [value]
  })
  const allDocumentTypeNames = (allDocumentTypeRows || []).map((row) => row.name)
  const signers: SignatureRequest[] = signatureRequests || []
  const logs = mapSupabaseAuditRows(auditLogs)

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">{doc.title}</h1>
          <p className="text-gray-600">{doc.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className={getStatusBadgeStyles(doc.status)}>
            {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
          </span>
          {doc.status === 'draft' && signers.length > 0 && (
            <SendDocumentButton documentId={doc.id} />
          )}
          {doc.status === 'pending' && (
            <CancelDocumentButton documentId={doc.id} />
          )}
          {doc.status === 'completed' && (
            <a
              href={`/api/documents/${doc.id}/download`}
              className="inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Download PDF
            </a>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column - Document Info and Signers */}
        <div className="lg:col-span-2 space-y-6">
          <DocumentPdfPreview documentId={doc.id} />

          {/* Document Metadata */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Document Details
            </h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-600">Title</dt>
                <dd className="mt-1 text-sm text-gray-900">{doc.title}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Status</dt>
                <dd className="mt-1">
                  <span className={getStatusBadgeStyles(doc.status)}>
                    {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Type</dt>
                <dd className="mt-1">
                  <DocumentTypeInlineEditor
                    documentId={doc.id}
                    initialTypeNames={assignedTypes.map((type) => type.name)}
                    availableTypeNames={allDocumentTypeNames}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Companies</dt>
                <dd className="mt-1">
                  {assignedCompanies.length === 0 ? (
                    <span className="text-sm text-gray-500">Unassigned</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {assignedCompanies.map((company) => (
                        <span
                          key={company.id}
                          className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                        >
                          {company.name}
                        </span>
                      ))}
                    </div>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">
                  Created At
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(doc.created_at).toLocaleString()}
                </dd>
              </div>
              {doc.completed_at && (
                <div>
                  <dt className="text-sm font-medium text-gray-600">
                    Completed At
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(doc.completed_at).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <DocumentCompaniesEditor
            documentId={doc.id}
            companies={allCompanies}
            selectedCompanyIds={assignedCompanyIds}
          />

          {/* Signers Section */}
          <SignersSection
            documentId={doc.id}
            signers={signers}
            isEditable={doc.status === 'draft'}
          />

          {/* Add Signer Form - Only show if draft */}
          {doc.status === 'draft' && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <AddSignerForm documentId={doc.id} />
            </div>
          )}
        </div>

        {/* Right Column - Audit Timeline */}
        <div className="lg:col-span-1">
          <AuditTimeline logs={logs} />
        </div>
      </div>
    </div>
  )
}
