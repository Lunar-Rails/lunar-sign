import { getServiceClient } from '@/lib/supabase/service'
import { OtpClient } from './OtpClient'

export const dynamic = 'force-dynamic'

interface OtpPageProps {
  params: Promise<{ token: string }>
}

export default async function OtpPage({ params }: OtpPageProps) {
  const { token } = await params
  const supabase = getServiceClient()

  const { data } = await supabase
    .from('signature_requests')
    .select('signer_email')
    .eq('token', token)
    .single()

  const signerEmail = data?.signer_email ?? ''

  return <OtpClient token={token} signerEmail={signerEmail} />
}
