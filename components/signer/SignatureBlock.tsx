'use client'

import { SignatureCaptureForm } from '@/components/signing/SignatureCaptureForm'

interface SignatureBlockProps {
  displayName: string
  onSignatureDataUrl: (dataUrl: string | null) => void
}

export function SignatureBlock({ displayName, onSignatureDataUrl }: SignatureBlockProps) {
  return (
    <div>
      <p className="text-section-label mb-2">Your signature</p>
      <p className="text-caption text-lr-muted mb-3">This will appear on the signed document.</p>
      <SignatureCaptureForm displayName={displayName} onSignatureDataUrl={onSignatureDataUrl} showFontPicker />
    </div>
  )
}
