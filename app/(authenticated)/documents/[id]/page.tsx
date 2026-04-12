import { redirect } from 'next/navigation'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import { Document, SignatureRequest, Company, DocumentType, DocumentStatus } from '@/lib/types'
import { mapSupabaseAuditRows } from '@/lib/map-audit-log-row'

import SignersSection from '@/components/SignersSection'
import { AuditTimeline } from '@/components/AuditTimeline'
import SendDocumentButton from '@/components/SendDocumentButton'
import { CancelDocumentButton } from '@/components/CancelDocumentButton'
import DocumentPdfPreview from '@/components/DocumentPdfPreview'
import DocumentCompaniesEditor from '@/components/DocumentCompaniesEditor'
import DocumentTypeInlineEditor from '@/components/DocumentTypeInlineEditor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, FileText, Info } from 'lucide-react'

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
          <div className="flex items-start gap-2.5 rounded-lr-lg border border-lr-accent/20 bg-lr-accent-dim px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-lr-accent" />
            <div>
              <p className="text-lr-sm font-medium text-lr-text">
                Add signers below to get started
              </p>
              <p className="mt-0.5 text-lr-xs text-lr-muted">
                You need at least one signer before sending the document.
              </p>
            </div>
          </div>
        )
      }
      return (
        <div className="flex items-start gap-2.5 rounded-lr-lg border border-lr-cyan/20 bg-lr-cyan-dim px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-lr-cyan" />
          <div>
            <p className="text-lr-sm font-medium text-lr-text">
              Ready to send &mdash; {signerCount}{' '}
              {signerCount === 1 ? 'signer' : 'signers'} will be notified
            </p>
            <p className="mt-0.5 text-lr-xs text-lr-muted">
              Hit &ldquo;Send for Signing&rdquo; when you&apos;re ready.
            </p>
          </div>
        </div>
      )
    case 'pending':
      return (
        <div className="flex items-start gap-2.5 rounded-lr-lg border border-lr-warning/20 bg-lr-warning-dim px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-lr-warning" />
          <p className="text-lr-sm font-medium text-lr-text">
            Waiting for signatures &mdash; {signedCount} of {signerCount} signed
          </p>
        </div>
      )
    case 'completed':
      return (
        <div className="flex items-start gap-2.5 rounded-lr-lg border border-lr-success/20 bg-lr-success-dim px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-lr-success" />
          <p className="text-lr-sm font-medium text-lr-text">
            All signatures collected
          </p>
        </div>
      )
    case 'cancelled':
      return (
        <div className="flex items-start gap-2.5 rounded-lr-lg border border-lr-error/20 bg-lr-error-dim px-4 py-3">
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

  const signedCount = signers.filter((s) => s.status === 'signed').length

  return (
    <div className="-m-6 flex h-[calc(100vh-56px)] flex-col overflow-hidden lg:-m-8">
      {/* Compact top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-lr-border bg-lr-surface px-4 py-2.5 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0">
            <Link href="/dashboard" title="Back to dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-display text-lr-lg font-semibold text-lr-text">
                {doc.title}
              </h1>
              <Badge variant={docStatusVariant(doc.status)}>
                {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
              </Badge>
            </div>
            {doc.description && (
              <p className="truncate text-lr-xs text-lr-muted">{doc.description}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
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

      {/* Split panel body */}
      <div className="flex min-h-0 flex-1">
        {/* Left: PDF preview */}
        <div className="hidden border-r border-lr-border lg:flex lg:w-3/5">
          <div className="flex-1 p-4">
            <DocumentPdfPreview documentId={doc.id} />
          </div>
        </div>

        {/* Right: operational panel */}
        <div className="flex w-full flex-col overflow-y-auto lg:w-2/5">
          <div className="space-y-4 p-4">
            {/* Workflow guidance */}
            <WorkflowBanner
              status={doc.status}
              signerCount={signers.length}
              signedCount={signedCount}
            />

            {/* Metadata row */}
            <div className="rounded-lr-lg border border-lr-border bg-lr-surface shadow-lr-card">
              <div className="border-b border-lr-border px-4 py-3">
                <h2 className="font-display text-lr-sm font-semibold text-lr-text">Details</h2>
              </div>
              <div className="divide-y divide-lr-border/50 px-4">
                <div className="flex items-start gap-3 py-2.5">
                  <span className="w-20 shrink-0 font-display text-lr-xs uppercase tracking-wider text-lr-muted">
                    Type
                  </span>
                  <div className="min-w-0 flex-1">
                    <DocumentTypeInlineEditor
                      documentId={doc.id}
                      initialTypeNames={assignedTypes.map((type) => type.name)}
                      availableTypeNames={allDocumentTypeNames}
                      isCompact
                    />
                  </div>
                </div>
                <div className="flex items-start gap-3 py-2.5">
                  <span className="w-20 shrink-0 font-display text-lr-xs uppercase tracking-wider text-lr-muted">
                    Companies
                  </span>
                  <div className="min-w-0 flex-1">
                    <DocumentCompaniesEditor
                      documentId={doc.id}
                      companies={allCompanies}
                      selectedCompanyIds={assignedCompanyIds}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 py-2.5">
                  <span className="w-20 shrink-0 font-display text-lr-xs uppercase tracking-wider text-lr-muted">
                    Created
                  </span>
                  <span className="text-lr-xs text-lr-text-2">
                    {new Date(doc.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                {doc.completed_at && (
                  <div className="flex items-center gap-3 py-2.5">
                    <span className="w-20 shrink-0 font-display text-lr-xs uppercase tracking-wider text-lr-muted">
                      Completed
                    </span>
                    <span className="text-lr-xs text-lr-text-2">
                      {new Date(doc.completed_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Signers */}
            <SignersSection
              documentId={doc.id}
              signers={signers}
              documentStatus={doc.status}
            />

            {/* Mobile-only PDF preview */}
            <div className="lg:hidden">
              <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-lr-muted" />
                  <h2 className="font-display text-lr-sm font-semibold text-lr-text">Preview</h2>
                </div>
                <div className="h-[480px]">
                  <DocumentPdfPreview documentId={doc.id} />
                </div>
              </div>
            </div>

            {/* Activity */}
            <AuditTimeline logs={logs} />
          </div>
        </div>
      </div>
    </div>
  )
}
