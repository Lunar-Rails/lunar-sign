import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AddSignerSchema } from '@/lib/schemas'
import { logAudit } from '@/lib/audit'
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

    // Check document exists and belongs to user
    const { data: document } = await supabase
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .eq('uploaded_by', user.id)
      .single()

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

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

    // Log audit
    await logAudit(user.id, 'signer_added', 'signature_request', signatureRequest.id, {
      signer_email,
      document_id,
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
      .select('document_id')
      .eq('id', request_id)
      .single()

    if (!sigRequest) {
      return NextResponse.json(
        { error: 'Signature request not found' },
        { status: 404 }
      )
    }

    // Check document belongs to user and is draft
    const { data: document } = await supabase
      .from('documents')
      .select('*')
      .eq('id', sigRequest.document_id)
      .eq('uploaded_by', user.id)
      .single()

    if (!document || document.status !== 'draft') {
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

    // Log audit
    await logAudit(user.id, 'signer_removed', 'signature_request', request_id, {
      document_id: sigRequest.document_id,
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
