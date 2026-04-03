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
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Upload Document</h1>
      <p className="mb-8 text-gray-600">
        Upload a PDF document that requires signatures
      </p>

      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <FileUploadForm
          companies={rows}
          documentTypes={typeRows}
          initialCompanyIds={initialCompanyIds}
        />
      </div>
    </div>
  )
}
