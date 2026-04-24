import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'
import { generateOtpCode, hashOtpCode, OTP_TTL_MINUTES } from '@/lib/esigning/otp'
import { sendEmail } from '@/lib/email/client'
import { signingOtpEmail } from '@/lib/email/templates'

const sendRateLimiter = rateLimit({ windowMs: 60_000, max: 5 })

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip')?.trim() ||
      null

    if (process.env.NODE_ENV === 'production' && ip && !sendRateLimiter.check(`${ip}:${token}`).success)
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    const supabase = getServiceClient()

    const { data: reqRaw } = await supabase
      .from('signature_requests')
      .select('id, document_id, signer_name, signer_email, status, consent_given_at, expires_at')
      .eq('token', token)
      .single()

    if (!reqRaw)
      return NextResponse.json({ error: 'Invalid signing link' }, { status: 404 })
    if (reqRaw.status !== 'pending')
      return NextResponse.json({ error: 'Signing request is no longer active' }, { status: 400 })

    const expiresAt = (reqRaw as unknown as { expires_at?: string | null }).expires_at
    if (expiresAt && new Date(expiresAt) < new Date())
      return NextResponse.json({ error: 'This signing link has expired' }, { status: 410 })

    if (!reqRaw.consent_given_at)
      return NextResponse.json({ error: 'Consent required before OTP' }, { status: 400 })

    // Check whether OTP already verified — idempotent: return 200 without re-sending.
    const { data: existing } = await supabase
      .from('signing_otps')
      .select('verified_at')
      .eq('request_id', reqRaw.id)
      .maybeSingle()

    if (existing?.verified_at)
      return NextResponse.json({ ok: true, alreadyVerified: true })

    const code = generateOtpCode()
    const codeHash = hashOtpCode(reqRaw.id, code)
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString()

    // Upsert replaces any previous unsent/unverified code.
    const { error: upsertErr } = await supabase
      .from('signing_otps')
      .upsert(
        {
          request_id: reqRaw.id,
          code_hash: codeHash,
          sent_to: reqRaw.signer_email,
          expires_at: otpExpiresAt,
          verified_at: null,
          attempts: 0,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'request_id' }
      )

    if (upsertErr) {
      console.error('OTP upsert error:', upsertErr)
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 })
    }

    const { subject, html } = signingOtpEmail({
      signerName: reqRaw.signer_name,
      documentTitle: 'your document',
      otpCode: code,
    })
    await sendEmail({ to: reqRaw.signer_email, subject, html })

    await logAudit(null, 'otp_sent', 'document', reqRaw.document_id, {
      token_suffix: token.slice(-8),
      signer_email: reqRaw.signer_email,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('OTP send error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
