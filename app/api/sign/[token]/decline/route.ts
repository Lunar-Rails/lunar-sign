import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/email/client'
import { documentDeclinedOwnerEmail } from '@/lib/email/templates'

const declineRateLimiter = rateLimit({ windowMs: 60_000, max: 5 })

interface OwnerProfileRow {
  email: string
  full_name: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip')?.trim() ||
      'unknown'

    if (!declineRateLimiter.check(ip).success)
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { token } = await params
    const supabase = getServiceClient()

    const body = await request.json().catch(() => ({}))
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : null

    const { data: reqRaw } = await supabase
      .from('signature_requests')
      .select('id, document_id, signer_name, signer_email, status, expires_at')
      .eq('token', token)
      .single()

    if (!reqRaw)
      return NextResponse.json({ error: 'Invalid signing link' }, { status: 404 })

    if (reqRaw.status !== 'pending')
      return NextResponse.json({ error: 'Signing request is no longer active' }, { status: 400 })

    const expiresAt = (reqRaw as unknown as { expires_at?: string | null }).expires_at
    if (expiresAt && new Date(expiresAt) < new Date())
      return NextResponse.json({ error: 'This signing link has expired' }, { status: 410 })

    const declinedAt = new Date().toISOString()

    // Mark the signature request as declined.
    await supabase
      .from('signature_requests')
      .update({ status: 'cancelled', declined_at: declinedAt, decline_reason: reason })
      .eq('id', reqRaw.id)

    // Cancel the whole document — one declination blocks completion.
    await supabase
      .from('documents')
      .update({ status: 'cancelled' })
      .eq('id', reqRaw.document_id)

    await logAudit(null, 'signature_declined', 'document', reqRaw.document_id, {
      token_suffix: token.slice(-8),
      signer_email: reqRaw.signer_email,
      reason: reason ?? '(no reason given)',
    })

    // Notify the document owner.
    try {
      const { data: documentRaw } = await supabase
        .from('documents')
        .select('title, uploaded_by')
        .eq('id', reqRaw.document_id)
        .single()

      if (documentRaw) {
        const { data: ownerProfileRaw } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', (documentRaw as unknown as { uploaded_by: string }).uploaded_by)
          .single()

        const ownerProfile = ownerProfileRaw as OwnerProfileRow | null
        if (ownerProfile) {
          const { subject, html } = documentDeclinedOwnerEmail({
            ownerName: ownerProfile.full_name,
            documentTitle: (documentRaw as unknown as { title: string }).title,
            signerName: reqRaw.signer_name,
            signerEmail: reqRaw.signer_email,
            reason,
          })
          await sendEmail({ to: ownerProfile.email, subject, html })
        }
      }
    } catch (emailError) {
      console.error('Decline notification email error:', emailError)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Decline route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
