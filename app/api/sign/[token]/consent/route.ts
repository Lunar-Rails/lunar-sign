import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'
import { getConfig } from '@/lib/config'
import { CONSENT_TEXT } from '@/lib/legal/consent-copy'
import { rateLimit } from '@/lib/rate-limit'

const consentRateLimiter = rateLimit({ windowMs: 60_000, max: 10 })

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip')?.trim() ||
      'unknown'

    const rateLimitResult = consentRateLimiter.check(ip)
    if (!rateLimitResult.success)
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { token } = await params
    const supabase = getServiceClient()

    const { data: requestRaw } = await supabase
      .from('signature_requests')
      .select('id, document_id, signer_email, status, consent_given_at')
      .eq('token', token)
      .single()

    if (!requestRaw)
      return NextResponse.json({ error: 'Invalid signing link' }, { status: 404 })

    if (requestRaw.status !== 'pending')
      return NextResponse.json({ error: 'Signing request is no longer active' }, { status: 400 })

    // Idempotent — if consent already given, redirect through.
    if (requestRaw.consent_given_at) {
      const config = getConfig()
      return NextResponse.redirect(`${config.NEXT_PUBLIC_APP_URL}/sign/${token}`)
    }

    const config = getConfig()
    const textVersion = config.CONSENT_TEXT_VERSION
    const consentTextHash = crypto
      .createHash('sha256')
      .update(`${textVersion}\n${CONSENT_TEXT}`)
      .digest('hex')

    const now = new Date().toISOString()

    await supabase
      .from('signature_requests')
      .update({ consent_given_at: now, consent_text_hash: consentTextHash })
      .eq('id', requestRaw.id)

    await logAudit(null, 'consent_given', 'document', requestRaw.document_id, {
      token_suffix: token.slice(-8),
      signer_email: requestRaw.signer_email,
      text_version: textVersion,
      consent_text_hash: consentTextHash,
    })

    return NextResponse.redirect(`${config.NEXT_PUBLIC_APP_URL}/sign/${token}`)
  } catch (error) {
    console.error('Consent route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
