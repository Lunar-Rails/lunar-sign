import { getServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'


interface AlreadySignedPageProps {
  params: Promise<{ token: string }>
}

export default async function AlreadySignedPage({
  params,
}: AlreadySignedPageProps) {
  const { token } = await params
  const supabase = getServiceClient()

  // Fetch signature request to get document title
  const { data: signatureRequestRaw } = await supabase
    .from('signature_requests')
    .select('*, documents:document_id(title)')
    .eq('token', token)
    .single()

  const signatureRequest = signatureRequestRaw as { documents: { title: string } | null } | null
  const documentTitle = signatureRequest?.documents?.title || 'Document'

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          Already Signed
        </h2>
        <p className="mb-6 text-sm text-gray-600">
          You have already signed <strong>{documentTitle}</strong>. This link
          can only be used once.
        </p>

        <p className="text-xs text-gray-500">
          If you have any questions, please contact the document owner.
        </p>
      </div>
    </div>
  )
}
