import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { canAccessDocument } from '@/lib/authorization'
import { getConfig } from '@/lib/config'
import nodemailer from 'nodemailer'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: documentId } = await params

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check document exists
    const { data: document } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .maybeSingle()

    if (!document)
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )

    const hasDocumentAccess = await canAccessDocument({
      supabase,
      userId: user.id,
      documentId,
    })
    if (!hasDocumentAccess)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Check document is in draft status
    if (document.status !== 'draft') {
      return NextResponse.json(
        { error: 'Document is not in draft status' },
        { status: 400 }
      )
    }

    // Check there is at least 1 signature request
    const { data: signatureRequests } = await supabase
      .from('signature_requests')
      .select('*')
      .eq('document_id', documentId)

    if (!signatureRequests || signatureRequests.length === 0) {
      return NextResponse.json(
        { error: 'Add at least one signer before sending' },
        { status: 400 }
      )
    }

    // Update document status to pending
    const { error: updateError } = await supabase
      .from('documents')
      .update({ status: 'pending' })
      .eq('id', documentId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update document status' },
        { status: 500 }
      )
    }

    // Send emails to signers
    try {
      const config = getConfig()
      const transporter = nodemailer.createTransport({
        host: config.MAILTRAP_HOST,
        port: config.MAILTRAP_PORT,
        auth: {
          user: config.MAILTRAP_USER,
          pass: config.MAILTRAP_PASSWORD,
        },
      })

      for (const sigRequest of signatureRequests) {
        const signingUrl = `${config.NEXT_PUBLIC_APP_URL}/sign/${sigRequest.token}`

        await transporter.sendMail({
          from: config.EMAIL_FROM,
          to: sigRequest.signer_email,
          subject: `Please sign: ${document.title}`,
          html: `
            <h2>Signature Request</h2>
            <p>Hello ${sigRequest.signer_name},</p>
            <p>You have been requested to sign the following document:</p>
            <p><strong>${document.title}</strong></p>
            <p>
              <a href="${signingUrl}" style="display: inline-block; padding: 10px 20px; background-color: #1a202c; color: white; text-decoration: none; border-radius: 5px;">
                Sign Document
              </a>
            </p>
            <p>This link is unique to you and expires after signing.</p>
          `,
        })
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError)
      // Don't fail the API call if emails fail - document status is already updated
    }

    // Log audit
    await logAudit(user.id, 'document_sent', 'document', documentId, {
      signer_count: signatureRequests.length,
    })

    return NextResponse.json(
      {
        success: true,
        message: `Document sent to ${signatureRequests.length} signer(s)`,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Send document error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
