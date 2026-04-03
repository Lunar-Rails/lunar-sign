import FileUploadForm from '@/components/FileUploadForm'

export const dynamic = 'force-dynamic'


export default function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Upload Document</h1>
      <p className="mb-8 text-gray-600">
        Upload a PDF document that requires signatures
      </p>

      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <FileUploadForm />
      </div>
    </div>
  )
}
