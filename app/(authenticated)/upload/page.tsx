import FileUploadForm from '@/components/FileUploadForm'
import { createClient } from '@/lib/supabase/server'
import { Company } from '@/lib/types'

export const dynamic = 'force-dynamic'


export default async function UploadPage() {
  const supabase = await createClient()
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .order('name', { ascending: true })

  const rows: Company[] = companies || []

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Upload Document</h1>
      <p className="mb-8 text-gray-600">
        Upload a PDF document that requires signatures
      </p>

      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <FileUploadForm companies={rows} />
      </div>
    </div>
  )
}
