import { getServiceClient } from '@/lib/supabase/service'
import { CheckCircle } from 'lucide-react'
import { SignerShell } from '@/components/signer/SignerShell'
import { SignerStateCard } from '@/components/signer/SignerStateCard'

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
    <SignerShell width="narrow" align="center">
      <SignerStateCard
        tone="success"
        icon={CheckCircle}
        kicker="Signed"
        title="You've already signed"
        description={`You have already signed "${documentTitle}". This link can only be used once. If you have any questions, please contact the document owner.`}
      />
    </SignerShell>
  )
}
