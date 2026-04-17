import { FileX2 } from 'lucide-react'
import { SignerShell } from '@/components/signer/SignerShell'
import { SignerStateCard } from '@/components/signer/SignerStateCard'

export default function SigningNotFoundPage() {
  return (
    <SignerShell width="narrow" align="center">
      <SignerStateCard
        tone="muted"
        icon={FileX2}
        kicker="Unavailable"
        title="Document not available"
        description="This document has been removed or the signing link is no longer valid. If you believe this is an error, please contact the document owner."
      />
    </SignerShell>
  )
}
