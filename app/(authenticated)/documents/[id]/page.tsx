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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Download } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface DocumentDetailPageProps {
  params: Promise<{ id: string }>
}

type StatusVariant = 'default' | 'warning' | 'success' | 'destructive' | 'secondary'

function docStatusVariant(status: string): StatusVariant {
  switch (status) {
    case 'draft': return 'secondary'
    case 'pending': return 'warning'
    case 'completed': return 'success'
    case 'cancelled': return 'destructive'
    default: return 'secondary'
  }
}

export default async function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: document } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()

  if (!document) redirect('/dashboard')

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
      .select('id, document_id, signer_name, signer_email, requested_by, status, signed_at, created_at')
      .eq('document_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('audit_log')
      .select('id, actor_id, action, entity_type, entity_id, metadata, created_at, profiles:actor_id(email, full_name)')
      .eq('entity_id', id)
      .eq('entity_type', 'document')
      .order('created_at', { ascending: false }),
    supabase.from('companies').select('*').order('name', { ascending: true }),
    supabase.from('document_companies').select('company_id, companies(id, name, slug)').eq('document_id', id),
    supabase.from('document_document_types').select('document_type_id, document_types(id, name)').eq('document_id', id),
    supabase.from('document_types').select('name').order('name', { ascending: true }),
  ])

  const allCompanies: Company[] = companies || []
  const assignedCompanies = (assignedCompanyRows || []).flatMap((row) => {
    const value = row.companies as Pick<Company, 'id' | 'name' | 'slug'> | Pick<Company, 'id' | 'name' | 'slug'>[] | null
    if (!value) return []
    return Array.isArray(value) ? value : [value]
  })
  const assignedCompanyIds = assignedCompanies.map((c) => c.id)
  const assignedTypes = (assignedTypeRows || []).flatMap((row) => {
    const value = row.document_types as Pick<DocumentType, 'id' | 'name'> | Pick<DocumentType, 'id' | 'name'>[] | null
    if (!value) return []
    return Array.isArray(value) ? value : [value]
  })
  const allDocumentTypeNames = (allDocumentTypeRows || []).map((row) => row.name)
  const signers: SignatureRequest[] = signatureRequests || []
  const logs = mapSupabaseAuditRows(auditLogs)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-lr-3xl font-bold text-lr-text">{doc.title}</h1>
          {doc.description && (
            <p className="mt-1 text-lr-sm text-lr-muted">{doc.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant={docStatusVariant(doc.status)}>
            {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
          </Badge>
          {doc.status === 'draft' && signers.length > 0 && (
            <SendDocumentButton documentId={doc.id} />
          )}
          {doc.status === 'pending' && (
            <CancelDocumentButton documentId={doc.id} />
          )}
          {doc.status === 'completed' && (
            <Button asChild variant="gold">
              <Link href={`/api/documents/${doc.id}/download`}>
                <Download className="h-4 w-4" />
                Download PDF
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <DocumentPdfPreview documentId={doc.id} />

          {/* Document Metadata */}
          <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-5 shadow-lr-card">
            <h2 className="mb-4 font-display text-lr-xl font-semibold text-lr-text">Document Details</h2>
            <dl className="space-y-4">
              <div>
                <dt className="font-display text-lr-xs uppercase tracking-wider text-lr-muted">Title</dt>
                <dd className="mt-1 text-lr-sm text-lr-text">{doc.title}</dd>
              </div>
              <div>
                <dt className="font-display text-lr-xs uppercase tracking-wider text-lr-muted">Status</dt>
                <dd className="mt-1">
                  <Badge variant={docStatusVariant(doc.status)}>
                    {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="font-display text-lr-xs uppercase tracking-wider text-lr-muted">Type</dt>
                <dd className="mt-1">
                  <DocumentTypeInlineEditor
                    documentId={doc.id}
                    initialTypeNames={assignedTypes.map((type) => type.name)}
                    availableTypeNames={allDocumentTypeNames}
                  />
                </dd>
              </div>
              <div>
                <dt className="font-display text-lr-xs uppercase tracking-wider text-lr-muted">Companies</dt>
                <dd className="mt-1">
                  {assignedCompanies.length === 0 ? (
                    <span className="text-lr-xs text-lr-muted">Unassigned</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {assignedCompanies.map((company) => (
                        <Badge key={company.id} variant="outline">{company.name}</Badge>
                      ))}
                    </div>
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-display text-lr-xs uppercase tracking-wider text-lr-muted">Created At</dt>
                <dd className="mt-1 text-lr-sm text-lr-text">{new Date(doc.created_at).toLocaleString()}</dd>
              </div>
              {doc.completed_at && (
                <div>
                  <dt className="font-display text-lr-xs uppercase tracking-wider text-lr-muted">Completed At</dt>
                  <dd className="mt-1 text-lr-sm text-lr-text">{new Date(doc.completed_at).toLocaleString()}</dd>
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
            <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-5 shadow-lr-card">
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
