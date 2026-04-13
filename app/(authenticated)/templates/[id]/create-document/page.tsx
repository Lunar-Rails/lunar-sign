import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'

import { DocumentFromTemplateForm } from '@/components/DocumentFromTemplateForm'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import type { StoredField } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface CreateDocumentPageProps {
  params: Promise<{ id: string }>
}

export default async function CreateDocumentPage({ params }: CreateDocumentPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: template } = await supabase
    .from('templates')
    .select('id, title, description, field_metadata, signer_count')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!template) notFound()

  const storedFields = Array.isArray(template.field_metadata)
    ? (template.field_metadata as StoredField[])
    : []

  const signerCount = typeof (template as Record<string, unknown>).signer_count === 'number'
    ? Math.min(2, Math.max(1, (template as Record<string, unknown>).signer_count as number)) as 1 | 2
    : 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0">
            <Link href={`/templates/${id}`} title="Back to template">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-card-title">Create document</h1>
            <p className="text-caption mt-0.5 truncate">From: {template.title}</p>
          </div>
        </div>
      </div>
      <DocumentFromTemplateForm
        key={id}
        templateId={id}
        defaultTitle={template.title}
        defaultDescription={template.description}
        storedFields={storedFields}
        signerCount={signerCount}
      />
    </div>
  )
}
