import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

export async function POST(
  _request: NextRequest,
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

    const { data: document } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('uploaded_by', user.id)
      .single()

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending documents can be revoked' },
        { status: 400 }
      )
    }

    const { data: cancelledDocument, error: docError } = await supabase
      .from('documents')
      .update({ status: 'cancelled' })
      .eq('id', documentId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()

    if (docError) {
      console.error('Cancel document error:', docError)
      return NextResponse.json(
        { error: 'Failed to cancel document' },
        { status: 500 }
      )
    }

    if (!cancelledDocument) {
      return NextResponse.json(
        { error: 'Only pending documents can be revoked' },
        { status: 409 }
      )
    }

    const { error: requestsError } = await supabase
      .from('signature_requests')
      .update({ status: 'cancelled' })
      .eq('document_id', documentId)
      .eq('status', 'pending')

    if (requestsError) {
      console.error('Cancel signature requests error:', requestsError)
      return NextResponse.json(
        { error: 'Failed to cancel signature requests' },
        { status: 500 }
      )
    }

    await logAudit(user.id, 'document_cancelled', 'document', documentId, {})

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Cancel document error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
