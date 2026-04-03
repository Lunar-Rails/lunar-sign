import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import type { Document } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = getServiceClient()
    const { token } = await params

    // Validate token and fetch signature request
    const { data: signatureRequestRaw } = await supabase
      .from('signature_requests')
      .select('*, documents:document_id(*)')
      .eq('token', token)
      .single()

    const signatureRequest = signatureRequestRaw as ({ documents: Document } | null)

    if (!signatureRequest) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 404 }
      )
    }

    const document = signatureRequest.documents

    // Check document is completed
    if (document.status !== 'completed') {
      return NextResponse.json(
        {
          error: 'Document not yet complete',
          message: 'Not all parties have signed this document yet.',
        },
        { status: 404 }
      )
    }

    if (!document.latest_signed_pdf_path) {
      return NextResponse.json({ error: 'Document not yet signed' }, { status: 404 })
    }

    // Generate signed URL for latest signed PDF
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('signed-documents')
      .createSignedUrl(document.latest_signed_pdf_path, 3600)

    if (urlError || !signedUrl) {
      console.error('Signed URL error:', urlError)
      return NextResponse.json(
        { error: 'Failed to generate download link' },
        { status: 500 }
      )
    }

    // Redirect to signed URL
    return NextResponse.redirect(signedUrl.signedUrl)
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
