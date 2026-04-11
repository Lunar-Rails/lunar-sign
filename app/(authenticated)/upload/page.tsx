import FileUploadForm from '@/components/FileUploadForm'
import { createClient } from '@/lib/supabase/server'
import { Company, DocumentType } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface UploadPageProps {
  searchParams: Promise<{ company?: string }>
}

export default async function UploadPage({ searchParams }: UploadPageProps) {
  const { company: companySlug } = await searchParams
  const supabase = await createClient()
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .order('name', { ascending: true })
  const { data: documentTypes } = await supabase
    .from('document_types')
    .select('*')
    .order('name', { ascending: true })

  const rows: Company[] = companies || []
  const typeRows: DocumentType[] = documentTypes || []

  const initialCompanyIds =
    companySlug && rows.some((c) => c.slug === companySlug)
      ? [rows.find((c) => c.slug === companySlug)!.id]
      : []

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display text-lr-3xl font-bold text-lr-text">Upload Document</h1>
        <p className="mt-1 text-lr-sm text-lr-muted">
          Upload a PDF document that requires signatures.
        </p>
      </div>

      <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-8 shadow-lr-card">
        <FileUploadForm
          companies={rows}
          documentTypes={typeRows}
          initialCompanyIds={initialCompanyIds}
        />
      </div>
    </div>
  )
}
