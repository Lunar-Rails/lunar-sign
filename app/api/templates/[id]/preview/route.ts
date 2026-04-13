import { NextResponse } from 'next/server'

import { canAccessTemplate } from '@/lib/authorization'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: templateId } = await params

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: template } = await supabase
      .from('templates')
      .select('id, title, file_path')
      .eq('id', templateId)
      .is('deleted_at', null)
      .maybeSingle()

    if (!template)
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    const allowed = await canAccessTemplate({
      supabase,
      userId: user.id,
      templateId,
    })
    if (!allowed)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const service = getServiceClient()
    const { data: pdfBlob, error: downloadError } = await service.storage
      .from('documents')
      .download(template.file_path)

    if (downloadError || !pdfBlob) {
      console.error('Template preview download error:', downloadError)
      return NextResponse.json(
        { error: 'Failed to load template PDF' },
        { status: 500 }
      )
    }

    const pdfBuffer = await pdfBlob.arrayBuffer()
    const safeTitle = (template.title || 'template').replace(/"/g, '')

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${safeTitle}.pdf"`,
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Template preview error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
