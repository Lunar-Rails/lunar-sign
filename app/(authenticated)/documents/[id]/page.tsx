import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'

import { Company, Document, DocumentType, SignatureRequest } from '@/lib/types'
import { mapSupabaseAuditRows } from '@/lib/map-audit-log-row'

import AddSignerForm from '@/components/AddSignerForm'
import { AuditTimeline } from '@/components/AuditTimeline'
import { CancelDocumentButton } from '@/components/CancelDocumentButton'
import DocumentCompaniesEditor from '@/components/DocumentCompaniesEditor'
import DocumentPdfPreview from '@/components/DocumentPdfPreview'
import DocumentTypeInlineEditor from '@/components/DocumentTypeInlineEditor'
import SendDocumentButton from '@/components/SendDocumentButton'
import SignersSection from '@/components/SignersSection'

export const dynamic = 'force-dynamic'

interface DocumentDetailPageProps {
  params: Promise<{ id: string }>
}

function getStatusBadgeStyles(status: string) {
  switch (status) {
    case 'draft':
      return 'lr-status-chip lr-status-draft'
    case 'pending':
      return 'lr-status-chip lr-status-pending'
    case 'completed':
      return 'lr-status-chip lr-status-completed'
    case 'cancelled':
      return 'lr-status-chip lr-status-cancelled'
    default:
      return 'lr-status-chip'
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
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
    supabase.from('document_types').select('name').order('name', { ascending: true }),
  ])

  const allCompanies: Company[] = companies || []
  const assignedCompanies = (assignedCompanyRows || []).flatMap((row) => {
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
    <div className="mx-auto max-w-[1120px] space-y-6">
      <Link href="/dashboard" className="lr-link-pill">
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <section className="lr-panel px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="lr-label">Document detail</p>
            <h1 className="font-display mt-3 text-[2.3rem] font-semibold tracking-[-0.04em] text-white">
              {doc.title}
            </h1>
            {doc.description && (
              <p className="mt-3 text-sm leading-6 text-[var(--lr-text-soft)]">
                {doc.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
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
                className="lr-button lr-button-gold"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <div className="space-y-6">
          <DocumentPdfPreview documentId={doc.id} />

          <div className="lr-panel p-6">
            <p className="lr-label">Metadata</p>
            <h2 className="font-display mt-2 text-xl font-semibold text-white">
              Document details
            </h2>
            <dl className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <dt className="lr-label">Title</dt>
                <dd className="mt-2 text-sm text-[var(--lr-text-soft)]">{doc.title}</dd>
              </div>
              <div>
                <dt className="lr-label">Status</dt>
                <dd className="mt-2">
                  <span className={getStatusBadgeStyles(doc.status)}>
                    {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="lr-label">Type</dt>
                <dd className="mt-2">
                  <DocumentTypeInlineEditor
                    documentId={doc.id}
                    initialTypeNames={assignedTypes.map((type) => type.name)}
                    availableTypeNames={allDocumentTypeNames}
                  />
                </dd>
              </div>
              <div>
                <dt className="lr-label">Companies</dt>
                <dd className="mt-2">
                  {assignedCompanies.length === 0 ? (
                    <span className="text-sm text-[var(--lr-text-muted)]">Unassigned</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {assignedCompanies.map((company) => (
                        <span key={company.id} className="lr-chip">
                          {company.name}
                        </span>
                      ))}
                    </div>
                  )}
                </dd>
              </div>
              <div>
                <dt className="lr-label">Created at</dt>
                <dd className="mt-2 text-sm text-[var(--lr-text-soft)]">
                  {formatDateTime(doc.created_at)}
                </dd>
              </div>
              {doc.completed_at && (
                <div>
                  <dt className="lr-label">Completed at</dt>
                  <dd className="mt-2 text-sm text-[var(--lr-text-soft)]">
                    {formatDateTime(doc.completed_at)}
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

          <SignersSection
            documentId={doc.id}
            signers={signers}
            isEditable={doc.status === 'draft'}
          />

          {doc.status === 'draft' && (
            <div className="lr-panel p-6">
              <AddSignerForm documentId={doc.id} />
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <AuditTimeline logs={logs} />
        </div>
      </div>
    </div>
  )
}
