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
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="lr-panel px-6 py-6 sm:px-8">
        <p className="lr-label">Upload lane</p>
        <h1 className="font-display mt-3 text-[2.3rem] font-semibold tracking-[-0.04em] text-white">
          Add a new signing document
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--lr-text-soft)]">
          Drop in a PDF, assign it to one or more companies, and prepare the
          document for signature requests inside the shared Lunar Sign shell.
        </p>
      </section>

      <div className="lr-panel p-6 sm:p-8">
        <FileUploadForm
          companies={rows}
          documentTypes={typeRows}
          initialCompanyIds={initialCompanyIds}
        />
      </div>
    </div>
  )
}
