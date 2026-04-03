import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAccessDocument } from '@/lib/authorization'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: documentId } = await params

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: document } = await supabase
      .from('documents')
      .select('id, title, file_path, uploaded_by')
      .eq('id', documentId)
      .maybeSingle()

    if (!document)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    const hasDocumentAccess = await canAccessDocument({
      supabase,
      userId: user.id,
      documentId,
    })
    if (!hasDocumentAccess)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: pdfBlob, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_path)

    if (downloadError || !pdfBlob) {
      console.error('Document preview download error:', downloadError)
      return NextResponse.json(
        { error: 'Failed to load document preview' },
        { status: 500 }
      )
    }

    const pdfBuffer = await pdfBlob.arrayBuffer()
    const safeTitle = (document.title || 'document').replace(/"/g, '')

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${safeTitle}.pdf"`,
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Document preview error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
