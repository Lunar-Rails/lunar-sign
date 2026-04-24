import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'
import { hashOtpCode, safeEqual, OTP_MAX_ATTEMPTS } from '@/lib/esigning/otp'

// 10 verify attempts per minute per IP (across all tokens) — blocks brute force at network layer.
const verifyRateLimiter = rateLimit({ windowMs: 60_000, max: 10 })

interface OtpRow {
  request_id: string
  code_hash: string
  expires_at: string
  verified_at: string | null
  attempts: number
}

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

    if (ip && !verifyRateLimiter.check(`${ip}:${token}`).success)
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    const body = await request.json().catch(() => ({}))
    const { code } = body as { code?: string }

    if (!code || !/^\d{6}$/.test(code))
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 })

    const supabase = getServiceClient()

    const { data: reqRaw } = await supabase
      .from('signature_requests')
      .select('id, document_id, signer_email, status, expires_at')
      .eq('token', token)
      .single()

    if (!reqRaw)
      return NextResponse.json({ error: 'Invalid signing link' }, { status: 404 })
    if (reqRaw.status !== 'pending')
      return NextResponse.json({ error: 'Signing request is no longer active' }, { status: 400 })

    const expiresAt = (reqRaw as unknown as { expires_at?: string | null }).expires_at
    if (expiresAt && new Date(expiresAt) < new Date())
      return NextResponse.json({ error: 'This signing link has expired' }, { status: 410 })

    const { data: otpRaw } = await supabase
      .from('signing_otps')
      .select('request_id, code_hash, expires_at, verified_at, attempts')
      .eq('request_id', reqRaw.id)
      .maybeSingle()

    const otp = otpRaw as OtpRow | null

    if (!otp)
      return NextResponse.json({ error: 'No code has been sent. Request a new code.' }, { status: 400 })

    if (otp.verified_at)
      return NextResponse.json({ ok: true, alreadyVerified: true })

    if (otp.attempts >= OTP_MAX_ATTEMPTS)
      return NextResponse.json(
        { error: 'Maximum verification attempts reached. Request a new code.' },
        { status: 429 }
      )

    if (new Date(otp.expires_at) < new Date())
      return NextResponse.json({ error: 'Code has expired. Request a new code.' }, { status: 400 })

    const expectedHash = hashOtpCode(reqRaw.id, code)
    const match = safeEqual(expectedHash, otp.code_hash)

    if (!match) {
      await supabase
        .from('signing_otps')
        .update({ attempts: otp.attempts + 1 })
        .eq('request_id', reqRaw.id)

      const remaining = OTP_MAX_ATTEMPTS - (otp.attempts + 1)
      return NextResponse.json(
        { error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` },
        { status: 400 }
      )
    }

    await supabase
      .from('signing_otps')
      .update({ verified_at: new Date().toISOString(), attempts: otp.attempts + 1 })
      .eq('request_id', reqRaw.id)

    await logAudit(null, 'otp_verified', 'document', reqRaw.document_id, {
      token_suffix: token.slice(-8),
      signer_email: reqRaw.signer_email,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('OTP verify error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
