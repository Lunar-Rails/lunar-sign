import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'
import { canAccessDocument } from '@/lib/authorization'
import { getConfig } from '@/lib/config'
import { sendEmail } from '@/lib/email/client'
import { signatureReminderEmail } from '@/lib/email/templates'

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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const hasAccess = await canAccessDocument({ supabase, userId: user.id, documentId })
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: document } = await supabase
      .from('documents')
      .select('id, title, status')
      .eq('id', documentId)
      .maybeSingle()

    if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    if (document.status !== 'pending') {
      return NextResponse.json(
        { error: 'Reminders can only be sent for pending documents' },
        { status: 400 }
      )
    }

    // Fetch only signers who haven't signed yet
    const serviceSupabase = getServiceClient()
    const { data: pendingSigners } = await serviceSupabase
      .from('signature_requests')
      .select('id, signer_name, signer_email, token')
      .eq('document_id', documentId)
      .eq('status', 'pending')

    if (!pendingSigners || pendingSigners.length === 0) {
      return NextResponse.json(
        { error: 'No pending signers to remind' },
        { status: 400 }
      )
    }

    const config = getConfig()
    let sentCount = 0

    // Bump expires_at by 30 days from now so the reminded signer has a fresh window.
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    try {
      for (const signer of pendingSigners) {
        const signingUrl = `${config.NEXT_PUBLIC_APP_URL}/sign/${signer.token}`
        const { subject, html } = signatureReminderEmail({
          signerName: signer.signer_name,
          documentTitle: document.title,
          requesterName: user.email ?? 'Document owner',
          signingUrl,
        })
        await sendEmail({ to: signer.signer_email, subject, html })
        sentCount++

        // Extend the signing window so the link doesn't expire on the reminded signer.
        await serviceSupabase
          .from('signature_requests')
          .update({ expires_at: newExpiresAt })
          .eq('id', signer.id)
      }
    } catch (emailError) {
      console.error('Reminder email error:', emailError)
    }

    await logAudit(user.id, 'document_reminder_sent', 'document', documentId, {
      reminded_count: sentCount,
    })

    return NextResponse.json({
      success: true,
      message: `Reminder sent to ${sentCount} signer${sentCount === 1 ? '' : 's'}`,
      reminded_count: sentCount,
    })
  } catch (error) {
    console.error('Remind error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
