import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

type CancelDocumentRpcResult = {
  ok: boolean
  error?: 'not_found' | 'not_pending' | 'concurrent_update'
}

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

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'cancel_accessible_pending_document',
      { p_document_id: documentId }
    )

    if (rpcError) {
      console.error('Cancel document RPC error:', rpcError)
      return NextResponse.json(
        { error: 'Failed to cancel document' },
        { status: 500 }
      )
    }

    const result = rpcData as CancelDocumentRpcResult | null
    if (!result?.ok) {
      if (result?.error === 'not_found') {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }
      if (result?.error === 'not_pending') {
        return NextResponse.json(
          { error: 'Only pending documents can be revoked' },
          { status: 400 }
        )
      }
      if (result?.error === 'concurrent_update') {
        return NextResponse.json(
          { error: 'Document was updated by another request; try again' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to cancel document' },
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
