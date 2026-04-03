import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
