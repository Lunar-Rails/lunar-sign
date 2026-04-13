'use client'

import dynamic from 'next/dynamic'

interface SigningInterfaceClientProps {
  token: string
  signerName: string
  signerEmail: string
  documentTitle: string
  pdfBase64: string
  initialFieldsJson?: string | null
}

const SigningInterface = dynamic(() => import('@/components/SigningInterface'), {
  ssr: false,
  loading: () => (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center bg-lr-bg px-4 py-10">
      <p className="text-body">Loading signing experience...</p>
    </div>
  ),
})

export default function SigningInterfaceClient(props: SigningInterfaceClientProps) {
  return <SigningInterface {...props} />
}
