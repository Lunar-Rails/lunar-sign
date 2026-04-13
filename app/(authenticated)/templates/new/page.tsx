import Link from 'next/link'
import { redirect } from 'next/navigation'

import { TemplateFieldEditor } from '@/components/TemplateFieldEditor'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import type { Company, DocumentType } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface NewTemplatePageProps {
  searchParams: Promise<{ company?: string }>
}

export default async function NewTemplatePage({ searchParams }: NewTemplatePageProps) {
  const supabase = await createClient()
  const { company: companySlug } = await searchParams

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: companies }, { data: documentTypes }] = await Promise.all([
    supabase.from('companies').select('*').order('name', { ascending: true }),
    supabase.from('document_types').select('*').order('name', { ascending: true }),
  ])

  const rows: Company[] = companies || []
  const typeRows: DocumentType[] = documentTypes || []

  let initialCompanyIds: string[] = []
  if (companySlug) {
    const match = rows.find((c) => c.slug === companySlug)
    if (match) initialCompanyIds = [match.id]
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0">
            <Link href="/templates" title="Back to templates">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-card-title">New template</h1>
            <p className="text-caption mt-0.5">
              Upload a PDF, place fields, and choose which values you fill vs. the signer.
            </p>
          </div>
        </div>
      </div>
      <TemplateFieldEditor
        mode="create"
        companies={rows}
        documentTypes={typeRows}
        initialCompanyIds={initialCompanyIds}
      />
    </div>
  )
}
