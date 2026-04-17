import { XCircle } from 'lucide-react'
import { SignerShell } from '@/components/signer/SignerShell'
import { SignerStateCard } from '@/components/signer/SignerStateCard'

export default function DeclinedPage() {
  return (
    <SignerShell width="narrow" align="center">
      <SignerStateCard
        tone="error"
        icon={XCircle}
        kicker="Declined"
        title="Signature declined"
        description="You have declined to sign this document. The document owner has been notified. If you changed your mind, please contact the document owner to request a new signing link."
      />
    </SignerShell>
  )
}
