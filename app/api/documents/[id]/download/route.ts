import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { canAccessDocument } from '@/lib/authorization'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: documentId } = await params

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch document
    const { data: document } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    const hasDocumentAccess = await canAccessDocument({
      supabase,
      userId: user.id,
      documentId,
    })
    if (!hasDocumentAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check document is completed
    if (document.status !== 'completed') {
      return NextResponse.json(
        { error: 'Document is not yet completed' },
        { status: 404 }
      )
    }

    // Authorization was already enforced via canAccessDocument; use the service
    // client for storage so company members and admins (not just the uploader)
    // can download. The bucket's RLS policy only covers `uploaded_by = auth.uid()`.
    const service = getServiceClient()
    const { data: signedUrl, error: urlError } = await service.storage
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
    console.error('Document download error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
