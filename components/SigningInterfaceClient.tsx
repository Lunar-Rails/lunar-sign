'use client'

import dynamic from 'next/dynamic'

interface SigningInterfaceClientProps {
  token: string
  signerName: string
  signerEmail: string
  documentTitle: string
  pdfBase64: string
  initialFieldsJson?: string | null
  signerIndex?: number | null
  baseVersion: string
}

const SigningInterface = dynamic(() => import('@/components/SigningInterface'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-lr-bg px-4 py-10 gap-4">
      <div className="w-full max-w-sm rounded-lr-lg border border-lr-border bg-lr-surface p-8 shadow-lr-card text-center">
        <div className="mx-auto mb-4 h-10 w-10 rounded-full bg-lr-accent/10 border border-lr-accent/20 animate-pulse" />
        <p className="text-card-title text-lr-text mb-1">Preparing your signing room</p>
        <p className="text-caption text-lr-muted">Loading document…</p>
      </div>
    </div>
  ),
})

export default function SigningInterfaceClient(props: SigningInterfaceClientProps) {
  return <SigningInterface {...props} />
}
