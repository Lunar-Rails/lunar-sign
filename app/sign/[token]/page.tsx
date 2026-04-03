import { redirect } from 'next/navigation'

import { getServiceClient } from '@/lib/supabase/service'

import { logAudit } from '@/lib/audit'

import SigningInterface from '@/components/SigningInterface'

import type { SignatureRequest, Document } from '@/lib/types'

export const dynamic = 'force-dynamic'


interface SigningPageProps {
  params: Promise<{ token: string }>
}

export default async function SigningPage({ params }: SigningPageProps) {
  const { token } = await params
  const supabase = getServiceClient()

  try {
    // Fetch signature request by token
    const { data: signatureRequestRaw } = await supabase
      .from('signature_requests')
      .select('*')
      .eq('token', token)
      .single()

    const signatureRequest = signatureRequestRaw as SignatureRequest | null

    if (!signatureRequest) {
      redirect(`/sign/${token}/not-found`)
    }

    // Check if already signed
    if (signatureRequest.status !== 'pending') {
      redirect(`/sign/${token}/already-signed`)
    }

    // Fetch document
    const { data: documentRaw } = await supabase
      .from('documents')
      .select('*')
      .eq('id', signatureRequest.document_id)
      .single()

    const document = documentRaw as Document | null

    if (!document) {
      redirect(`/sign/${token}/not-found`)
    }

    // Determine which PDF to load
    let pdfPath = document.file_path
    if (document.latest_signed_pdf_path) {
      pdfPath = document.latest_signed_pdf_path
    }

    // Download PDF bytes from storage
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from(
        document.latest_signed_pdf_path
          ? 'signed-documents'
          : 'documents'
      )
      .download(pdfPath)

    if (downloadError || !pdfData) {
      console.error('PDF download error:', downloadError)
      redirect(`/sign/${token}/not-found`)
    }

    // Convert blob to base64
    const arrayBuffer = await pdfData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const pdfBase64 = buffer.toString('base64')

    // Log audit: document_viewed
    await logAudit(null, 'document_viewed', 'document', document.id, {
      token,
      signer_email: signatureRequest.signer_email,
    })

    return (
      <SigningInterface
        token={token}
        signerName={signatureRequest.signer_name}
        signerEmail={signatureRequest.signer_email}
        documentTitle={document.title}
        pdfBase64={pdfBase64}
      />
    )
  } catch (error) {
    console.error('Signing page error:', error)
    redirect(`/sign/${token}/not-found`)
  }
}
