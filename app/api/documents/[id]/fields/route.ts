import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { canAccessDocument } from '@/lib/authorization'
import { parseFieldMetadata } from '@/lib/field-metadata'
import { logAudit } from '@/lib/audit'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: documentId } = await params

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await canAccessDocument({ supabase, userId: user.id, documentId })
    if (!hasAccess) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const { data: document } = await supabase
      .from('documents')
      .select('id, status')
      .eq('id', documentId)
      .single()

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.status !== 'draft') {
      return NextResponse.json(
        { error: 'Signature fields can only be edited on draft documents' },
        { status: 400 }
      )
    }

    const body = await request.json()

    let fieldMetadata
    try {
      fieldMetadata = parseFieldMetadata(body.field_metadata)
    } catch {
      return NextResponse.json({ error: 'Invalid field metadata' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('documents')
      .update({ field_metadata: fieldMetadata })
      .eq('id', documentId)
      .select('id')
      .maybeSingle()

    // updateError → Postgres/network failure (500).
    // !updated   → RLS blocked the write silently (0 rows); caller is not owner or admin (403).
    if (updateError) {
      console.error('Save fields error:', updateError)
      return NextResponse.json({ error: 'Failed to save fields' }, { status: 500 })
    }
    if (!updated)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await logAudit(user.id, 'document_fields_updated', 'document', documentId, {
      field_count: fieldMetadata.length,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save fields error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
