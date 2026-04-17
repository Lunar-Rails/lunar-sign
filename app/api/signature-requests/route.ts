import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { AddSignerSchema } from '@/lib/schemas'
import { logAudit } from '@/lib/audit'
import { canAccessDocument } from '@/lib/authorization'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { document_id, signer_name, signer_email } = body

    // Validate signer data
    const validation = AddSignerSchema.safeParse({
      signer_name,
      signer_email,
    })

    if (!validation.success) {
      const firstError = validation.error.flatten().fieldErrors
      const errorMessage = Object.values(firstError)[0]?.[0] || 'Validation error'
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    // Check document exists
    const { data: document } = await supabase
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .maybeSingle()

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    const hasDocumentAccess = await canAccessDocument({
      supabase,
      userId: user.id,
      documentId: document_id,
    })
    if (!hasDocumentAccess)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Check document is still in draft status
    if (document.status !== 'draft') {
      return NextResponse.json(
        { error: 'Cannot add signers to a document that is not in draft status' },
        { status: 400 }
      )
    }

    // Generate token
    const token = randomUUID()

    // Derive signer_index from insertion position so multi-signer docs route the
    // correct fields to each signer at sign time. Without this, both signers would
    // fall into legacy (null) mode and every signer-assigned field would be treated
    // as theirs, letting S1 overwrite S2's slot (and vice versa) in the rendered PDF.
    const { count: existingCount, error: countError } = await supabase
      .from('signature_requests')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', document_id)
      .neq('status', 'cancelled')

    if (countError) {
      console.error('Count signers error:', countError)
      return NextResponse.json(
        { error: 'Failed to add signer' },
        { status: 500 }
      )
    }

    const signerIndex = existingCount ?? 0

    // Create signature request
    const { data: signatureRequest, error: dbError } = await supabase
      .from('signature_requests')
      .insert({
        document_id,
        signer_name,
        signer_email,
        requested_by: user.id,
        status: 'pending',
        token,
        signer_index: signerIndex,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to add signer' },
        { status: 500 }
      )
    }

    // Log audit (entity_id = document so owners see it on document activity)
    await logAudit(user.id, 'signer_added', 'document', document_id, {
      signer_email,
      signature_request_id: signatureRequest.id,
    })

    return NextResponse.json(
      {
        success: true,
        data: { signatureRequest },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { request_id } = body

    // Get signature request
    const { data: sigRequest } = await supabase
      .from('signature_requests')
      .select('document_id, signer_email')
      .eq('id', request_id)
      .single()

    if (!sigRequest) {
      return NextResponse.json(
        { error: 'Signature request not found' },
        { status: 404 }
      )
    }

    // Check document is accessible and draft
    const { data: document } = await supabase
      .from('documents')
      .select('*')
      .eq('id', sigRequest.document_id)
      .maybeSingle()

    if (!document)
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )

    const hasDocumentAccess = await canAccessDocument({
      supabase,
      userId: user.id,
      documentId: sigRequest.document_id,
    })

    if (!hasDocumentAccess || document.status !== 'draft') {
      return NextResponse.json(
        { error: 'Cannot remove signer from this document' },
        { status: 400 }
      )
    }

    // Delete signature request
    const { error: deleteError } = await supabase
      .from('signature_requests')
      .delete()
      .eq('id', request_id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove signer' },
        { status: 500 }
      )
    }

    // Renumber remaining signers so signer_index stays contiguous (0, 1, ...).
    // Only valid in draft; pending/completed docs can't remove signers.
    const serviceSupabase = getServiceClient()
    const { data: remaining, error: remainingError } = await serviceSupabase
      .from('signature_requests')
      .select('id, created_at')
      .eq('document_id', sigRequest.document_id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true })

    if (remainingError) {
      console.error('Reindex fetch error:', remainingError)
    } else if (remaining) {
      for (let i = 0; i < remaining.length; i++) {
        const { error: updErr } = await serviceSupabase
          .from('signature_requests')
          .update({ signer_index: i })
          .eq('id', remaining[i].id)
        if (updErr) console.error('Reindex update error:', updErr)
      }
    }

    // Log audit (entity_id = document so owners see it on document activity)
    await logAudit(user.id, 'signer_removed', 'document', sigRequest.document_id, {
      signature_request_id: request_id,
      signer_email: sigRequest.signer_email,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
