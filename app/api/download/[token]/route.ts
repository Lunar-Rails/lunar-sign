import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { rateLimit } from '@/lib/rate-limit'
import type { Document } from '@/lib/types'

const downloadRateLimiter = rateLimit({ windowMs: 60_000, max: 30 })

interface SignatureRequestWithDocument {
  status: string
  documents: Document
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip')?.trim() ||
      'unknown'
    const rateLimitResult = downloadRateLimiter.check(ip)
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const supabase = getServiceClient()
    const { token } = await params

    const { data: signatureRequestRaw } = await supabase
      .from('signature_requests')
      .select('status, documents:document_id(*)')
      .eq('token', token)
      .single()

    const signatureRequest =
      signatureRequestRaw as SignatureRequestWithDocument | null

    if (!signatureRequest) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    const document = signatureRequest.documents

    // Signer must have signed to be allowed to download any version of the
    // document. Access is driven by DB state, not by whether the completion
    // email was delivered.
    if (signatureRequest.status !== 'signed') {
      return NextResponse.json(
        {
          error: 'Not authorized',
          message: 'You can download this document after you sign it.',
        },
        { status: 403 }
      )
    }

    if (!document.latest_signed_pdf_path) {
      return NextResponse.json(
        { error: 'Document not yet signed' },
        { status: 404 }
      )
    }

    // Prefer the certificate PDF (CoC page appended) when the document is fully
    // completed; fall back to latest signed PDF for partial or legacy docs.
    const downloadPath =
      (document as unknown as { certificate_pdf_path?: string | null }).certificate_pdf_path ||
      document.latest_signed_pdf_path

    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('signed-documents')
      .createSignedUrl(downloadPath, 3600)

    if (urlError || !signedUrl) {
      console.error('Signed URL error:', urlError)
      return NextResponse.json(
        { error: 'Failed to generate download link' },
        { status: 500 }
      )
    }

    return NextResponse.redirect(signedUrl.signedUrl)
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
