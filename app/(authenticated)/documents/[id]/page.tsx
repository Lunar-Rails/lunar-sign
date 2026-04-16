import { redirect } from 'next/navigation'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import { Document, SignatureRequest, Company, DocumentType, DocumentStatus } from '@/lib/types'
import { mapSupabaseAuditRows } from '@/lib/map-audit-log-row'

import SignersSection from '@/components/SignersSection'
import SendDocumentButton from '@/components/SendDocumentButton'
import { CancelDocumentButton } from '@/components/CancelDocumentButton'
import { DeleteDocumentButton } from '@/components/DeleteDocumentButton'
import DocumentPdfPreview from '@/components/DocumentPdfPreview'
import { DocumentFieldEditor } from '@/components/DocumentFieldEditor'
import { DocumentSidebarSetter } from '@/components/DocumentSidebarSetter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Info } from 'lucide-react'

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

function WorkflowBanner({
  status,
  signerCount,
  signedCount,
}: {
  status: DocumentStatus
  signerCount: number
  signedCount: number
}) {
  switch (status) {
    case 'draft':
      if (signerCount === 0) {
        return (
          <div className="flex items-start gap-2.5 rounded-lr border border-lr-accent/20 bg-lr-accent-dim px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-lr-accent" />
            <div>
              <p className="text-lr-sm font-medium text-lr-text">
                Add signers below to get started
              </p>
              <p className="text-caption mt-0.5">
                You need at least one signer before sending the document.
              </p>
            </div>
          </div>
        )
      }
      return (
        <div className="flex items-start gap-2.5 rounded-lr border border-lr-cyan/20 bg-lr-cyan-dim px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-lr-cyan" />
          <div>
            <p className="text-lr-sm font-medium text-lr-text">
              Ready to send &mdash; {signerCount}{' '}
              {signerCount === 1 ? 'signer' : 'signers'} will be notified
            </p>
            <p className="text-caption mt-0.5">
              Hit &ldquo;Send for Signing&rdquo; when you&apos;re ready.
            </p>
          </div>
        </div>
      )
    case 'pending':
      return (
        <div className="flex items-start gap-2.5 rounded-lr border border-lr-warning/20 bg-lr-warning-dim px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-lr-warning" />
          <p className="text-lr-sm font-medium text-lr-text">
            Waiting for signatures &mdash; {signedCount} of {signerCount} signed
          </p>
        </div>
      )
    case 'completed':
      return (
        <div className="flex items-start gap-2.5 rounded-lr border border-lr-success/20 bg-lr-success-dim px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-lr-success" />
          <p className="text-lr-sm font-medium text-lr-text">
            All signatures collected
          </p>
        </div>
      )
    case 'cancelled':
      return (
        <div className="flex items-start gap-2.5 rounded-lr border border-lr-error/20 bg-lr-error-dim px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-lr-error" />
          <p className="text-lr-sm font-medium text-lr-text">
            This document was cancelled
          </p>
        </div>
      )
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
    .is('deleted_at', null)
    .maybeSingle()

  if (!document) redirect('/documents')

  const doc: Document = document

  let sourceTemplate: { id: string; title: string } | null = null
  if (doc.template_id) {
    const { data: tmpl } = await supabase
      .from('templates')
      .select('id, title')
      .eq('id', doc.template_id)
      .is('deleted_at', null)
      .maybeSingle()
    sourceTemplate = tmpl
  }

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
      .select('id, document_id, signer_name, signer_email, requested_by, status, signed_at, created_at, signer_index')
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
  const signedCount = signers.filter((s) => s.status === 'signed').length

  return (
    <>
      <DocumentSidebarSetter
        data={{
          documentId: doc.id,
          documentStatus: doc.status,
          assignedTypes,
          allDocumentTypeNames,
          assignedCompanies,
          allCompanies,
          assignedCompanyIds,
          createdAt: doc.created_at,
          completedAt: doc.completed_at,
          auditLogs: logs,
        }}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0">
              <Link href="/documents" title="Back to documents">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-card-title truncate">{doc.title}</h1>
                <Badge variant={docStatusVariant(doc.status)}>
                  {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                </Badge>
                {sourceTemplate && (
                  <Link
                    href={`/templates/${sourceTemplate.id}`}
                    className="inline-flex items-center rounded-full border border-lr-border bg-transparent px-2.5 py-0.5 text-lr-xs font-medium text-lr-muted hover:text-lr-text shrink-0"
                  >
                    From template: {sourceTemplate.title}
                  </Link>
                )}
              </div>
              {doc.description && (
                <p className="text-caption truncate mt-0.5">{doc.description}</p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
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
            {doc.status === 'draft' && (
              <DeleteDocumentButton documentId={doc.id} documentTitle={doc.title} />
            )}
          </div>
        </div>

        <WorkflowBanner
          status={doc.status}
          signerCount={signers.length}
          signedCount={signedCount}
        />

        {doc.status === 'draft' && signers.length > 0 ? (
          <DocumentFieldEditor
            documentId={doc.id}
            signers={signers}
            initialFieldMetadata={doc.field_metadata}
            documentStatus={doc.status}
          />
        ) : (
          <div className="flex flex-col xl:flex-row xl:items-start gap-4 xl:gap-6">
            <div className="xl:sticky xl:top-[72px] xl:w-[380px] xl:shrink-0">
              <SignersSection
                documentId={doc.id}
                signers={signers}
                documentStatus={doc.status}
              />
            </div>

            <div className="flex-1 min-w-0 rounded-lr-lg border border-lr-border bg-lr-surface shadow-lr-card overflow-hidden">
              <div className="border-b border-lr-border px-4 py-3">
                <h2 className="text-card-title">Document Preview</h2>
              </div>
              <div className="h-[640px] xl:h-[720px] p-4">
                <DocumentPdfPreview documentId={doc.id} fieldMetadata={doc.field_metadata} />
              </div>
            </div>
          </div>
        )}

        <div className="lg:hidden space-y-4">
          <div className="rounded-lr-lg border border-lr-border bg-lr-surface shadow-lr-card p-4">
            <h2 className="text-card-title mb-3">Details</h2>
            <div className="space-y-2">
              <MobileDetailRow label="Type">
                <span className="text-caption">
                  {assignedTypes.length > 0
                    ? assignedTypes.map((t) => t.name).join(', ')
                    : <span className="text-lr-muted">None</span>}
                </span>
              </MobileDetailRow>
              <MobileDetailRow label="Companies">
                <span className="text-caption">
                  {assignedCompanies.length > 0
                    ? assignedCompanies.map((c) => c.name).join(', ')
                    : <span className="text-lr-muted">None</span>}
                </span>
              </MobileDetailRow>
              <MobileDetailRow label="Created">
                <span className="text-caption">
                  {new Date(doc.created_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </span>
              </MobileDetailRow>
              {doc.completed_at && (
                <MobileDetailRow label="Completed">
                  <span className="text-caption">
                    {new Date(doc.completed_at).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </span>
                </MobileDetailRow>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function MobileDetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-20 shrink-0 text-section-label pt-0.5">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
