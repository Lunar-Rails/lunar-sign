import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/client'
import { signatureRequestEmail } from '@/lib/email/templates'
import { getConfig } from '@/lib/config'
import { canAccessDocument } from '@/lib/authorization'

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

    // Parse body
    const body = await request.json()
    const { document_id } = body

    // Fetch document
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

    // Fetch requester profile
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    if (!requesterProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Fetch all pending signature requests
    const { data: signatureRequests } = await supabase
      .from('signature_requests')
      .select('*')
      .eq('document_id', document_id)
      .eq('status', 'pending')

    if (!signatureRequests || signatureRequests.length === 0) {
      return NextResponse.json(
        { error: 'No pending signature requests found' },
        { status: 400 }
      )
    }

    // Send emails to each signer
    const config = getConfig()
    for (const sigRequest of signatureRequests) {
      const signingUrl = `${config.NEXT_PUBLIC_APP_URL}/sign/${sigRequest.token}`

      const { subject, html } = signatureRequestEmail({
        signerName: sigRequest.signer_name,
        documentTitle: document.title,
        requesterName: requesterProfile.full_name,
        signingUrl,
      })

      await sendEmail({
        to: sigRequest.signer_email,
        subject,
        html,
      })
    }

    return NextResponse.json(
      {
        success: true,
        message: `Email sent to ${signatureRequests.length} signer(s)`,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Send request email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
