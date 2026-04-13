import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'

import { DeleteTemplateButton } from '@/components/DeleteTemplateButton'
import { TemplatePdfPreviewByTemplateId } from '@/components/TemplatePdfCard'
import { TemplateSidebarSetter } from '@/components/TemplateSidebarSetter'
import { TemplateDocumentsList } from '@/components/TemplateDocumentsList'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import type { Document, StoredField } from '@/lib/types'
import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface TemplateDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function TemplateDetailPage({ params }: TemplateDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: row } = await supabase
    .from('templates')
    .select(
      `
      *,
      document_types(id, name),
      template_companies(company_id, companies(id, name, slug))
    `
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!row) notFound()

  const meta = Array.isArray(row.field_metadata) ? (row.field_metadata as StoredField[]) : []
  const signerCount = meta.filter((f) => f.forSigner).length
  const creatorCount = meta.length - signerCount

  const docTypes = row.document_types as { id: string; name: string } | null
  const companyLinks = (row.template_companies || []) as {
    company_id: string
    companies: { id: string; name: string; slug: string } | null
  }[]

  const companyNames = companyLinks.flatMap((l) => (l.companies?.name ? [l.companies.name] : []))

  const { data: documentRows } = await supabase
    .from('documents')
    .select('id, title, status, created_at')
    .eq('template_id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  const templateDocuments = (documentRows || []) as Pick<Document, 'id' | 'title' | 'status' | 'created_at'>[]

  return (
    <>
      <TemplateSidebarSetter
        data={{
          templateId: id,
          title: row.title,
          documentTypeName: docTypes?.name ?? null,
          companyNames,
          createdAt: row.created_at,
          documentsCount: templateDocuments.length,
        }}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0">
              <Link href="/templates" title="Back to templates">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-card-title truncate">{row.title}</h1>
                {docTypes && <Badge variant="secondary">{docTypes.name}</Badge>}
                <Badge variant="outline">{meta.length} fields</Badge>
                <Badge variant="outline">
                  {creatorCount} creator{creatorCount === 1 ? '' : 's'}
                </Badge>
                <Badge variant="outline">
                  {signerCount} signer{signerCount === 1 ? '' : 's'}
                </Badge>
              </div>
              {row.description && (
                <p className="text-caption truncate mt-0.5">{row.description}</p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button asChild>
              <Link href={`/templates/${id}/create-document`}>Create document</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/templates/${id}/edit`}>Edit</Link>
            </Button>
            <DeleteTemplateButton templateId={id} templateTitle={row.title} />
          </div>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-start gap-4 xl:gap-6">
          <div className="xl:sticky xl:top-[72px] xl:w-[380px] xl:shrink-0 space-y-4">
            {companyNames.length > 0 && (
              <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card">
                <h2 className="text-card-title">Companies</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {companyNames.map((name) => (
                    <Badge key={name} variant="outline">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-4 shadow-lr-card">
              <h2 className="text-card-title">Documents</h2>
              <p className="mt-1 text-lr-xs text-lr-muted">Documents created from this template.</p>
              <TemplateDocumentsList documents={templateDocuments} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <TemplatePdfPreviewByTemplateId
              templateId={id}
              title="PDF preview"
              fieldMetadata={meta}
            />
          </div>
        </div>

        <div className="lg:hidden space-y-4">
          <div className="rounded-lr-lg border border-lr-border bg-lr-surface shadow-lr-card p-4">
            <h2 className="text-card-title mb-3">Details</h2>
            <div className="space-y-2">
              <MobileDetailRow label="Type">
                <span className="text-caption">
                  {docTypes?.name ?? <span className="text-lr-muted">None</span>}
                </span>
              </MobileDetailRow>
              <MobileDetailRow label="Companies">
                <span className="text-caption">
                  {companyNames.length > 0
                    ? companyNames.join(', ')
                    : <span className="text-lr-muted">None</span>}
                </span>
              </MobileDetailRow>
              <MobileDetailRow label="Created">
                <span className="text-caption">
                  {new Date(row.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </MobileDetailRow>
              <MobileDetailRow label="Documents">
                <span className="text-caption">{templateDocuments.length}</span>
              </MobileDetailRow>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function MobileDetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-20 shrink-0 text-section-label pt-0.5">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
