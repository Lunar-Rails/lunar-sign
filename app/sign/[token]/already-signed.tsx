import { getServiceClient } from '@/lib/supabase/service'
import { CheckCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface AlreadySignedPageProps {
  params: Promise<{ token: string }>
}

export default async function AlreadySignedPage({ params }: AlreadySignedPageProps) {
  const { token } = await params
  const supabase = getServiceClient()

  const { data: signatureRequestRaw } = await supabase
    .from('signature_requests')
    .select('*, documents:document_id(title)')
    .eq('token', token)
    .single()

  const signatureRequest = signatureRequestRaw as { documents: { title: string } | null } | null
  const documentTitle = signatureRequest?.documents?.title || 'Document'

  return (
    <div className="flex min-h-screen items-center justify-center bg-lr-bg px-4">
      <div className="w-full max-w-md rounded-lr-lg border border-lr-border bg-lr-surface p-8 text-center shadow-lr-card">
        <CheckCircle className="mx-auto h-12 w-12 text-lr-success" />
        <h2 className="mt-4 font-display text-lr-xl font-semibold text-lr-text">Already Signed</h2>
        <p className="mt-2 text-lr-sm text-lr-muted">
          You have already signed <strong className="text-lr-text">{documentTitle}</strong>. This
          link can only be used once.
        </p>
        <p className="mt-4 text-lr-xs text-lr-muted">
          If you have any questions, please contact the document owner.
        </p>
      </div>
    </div>
  )
}
