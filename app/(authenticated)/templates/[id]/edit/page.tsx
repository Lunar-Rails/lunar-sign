import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'

import { TemplateFieldEditor } from '@/components/TemplateFieldEditor'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import type { Company, DocumentType, StoredField } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface EditTemplatePageProps {
  params: Promise<{ id: string }>
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: template } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!template) notFound()

  const [{ data: links }, { data: companies }, { data: documentTypes }] = await Promise.all([
    supabase.from('template_companies').select('company_id').eq('template_id', id),
    supabase.from('companies').select('*').order('name', { ascending: true }),
    supabase.from('document_types').select('*').order('name', { ascending: true }),
  ])

  const companyIds = (links || []).map((l) => l.company_id as string)
  const rows: Company[] = companies || []
  const typeRows: DocumentType[] = documentTypes || []
  const meta = Array.isArray(template.field_metadata)
    ? (template.field_metadata as StoredField[])
    : []

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
            <h1 className="text-card-title truncate">Edit template</h1>
            <p className="text-caption truncate mt-0.5">{template.title}</p>
          </div>
        </div>
      </div>
      <TemplateFieldEditor
        key={id}
        mode="edit"
        templateId={id}
        companies={rows}
        documentTypes={typeRows}
        initialCompanyIds={companyIds}
        initialTitle={template.title}
        initialDescription={template.description}
        initialDocumentTypeId={template.document_type_id}
        initialStoredFields={meta}
      />
    </div>
  )
}
