import FileUploadForm from '@/components/FileUploadForm'
import { createClient } from '@/lib/supabase/server'
import { DocumentType } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function UploadPage() {
  const supabase = await createClient()
  const { data: documentTypes } = await supabase
    .from('document_types')
    .select('*')
    .order('name', { ascending: true })

  const typeRows: DocumentType[] = documentTypes || []

  return (
    <div className="mx-auto max-w-2xl py-4">
      <div className="mb-8">
        <p className="text-kicker mb-1">New Document</p>
        <h1 className="text-page-title">Upload Document</h1>
        <p className="text-body mt-2">
          Upload a PDF document that requires signatures.
        </p>
      </div>

      <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-8 shadow-lr-card">
        <FileUploadForm documentTypes={typeRows} />
      </div>
    </div>
  )
}
