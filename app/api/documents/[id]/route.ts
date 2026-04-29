import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit'
import { canAccessDocument } from '@/lib/authorization'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
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
      .select('id, title, deleted_at')
      .eq('id', documentId)
      .maybeSingle()

    if (!document)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    if (document.deleted_at)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    const hasAccess = await canAccessDocument({
      supabase,
      userId: user.id,
      documentId,
    })
    if (!hasAccess)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: updated, error } = await supabase
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', documentId)
      .select('id')
      .maybeSingle()

    // error   → Postgres/network failure (500).
    // !updated → RLS blocked the write silently (0 rows); caller is not owner or admin (403).
    if (error) {
      console.error('Document soft delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      )
    }
    if (!updated)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await logAudit(user.id, 'document_deleted', 'document', documentId, {
      title: document.title,
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/documents/[id]', e)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
