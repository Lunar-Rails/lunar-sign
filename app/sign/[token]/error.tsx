'use client'

import { AlertTriangle } from 'lucide-react'
import { SignerShell } from '@/components/signer/SignerShell'
import { SignerStateCard } from '@/components/signer/SignerStateCard'
import { Button } from '@/components/ui/button'

export default function SigningError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <SignerShell width="narrow" align="center">
      <SignerStateCard
        tone="error"
        icon={AlertTriangle}
        kicker="Something broke"
        title="Unexpected error"
        description="An error occurred while processing your signing request. Please try again."
      >
        <Button onClick={() => reset()} className="w-full">
          Try again
        </Button>
      </SignerStateCard>
    </SignerShell>
  )
}
