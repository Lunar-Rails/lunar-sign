import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { jsonRequest } from '../../helpers/mock-request'

const logAudit = vi.fn()
const getServiceClient = vi.fn()
const sendMail = vi.fn().mockResolvedValue(undefined)
const createTransport = vi.fn(() => ({ sendMail }))

vi.mock('@/lib/audit', () => ({ logAudit }))
vi.mock('@/lib/supabase/service', () => ({ getServiceClient }))
vi.mock('nodemailer', () => ({ default: { createTransport } }))
vi.mock('@/lib/config', () => ({
  getConfig: () => ({
    MAILTRAP_HOST: 'h',
    MAILTRAP_PORT: 2525,
    MAILTRAP_USER: 'u',
    MAILTRAP_PASSWORD: 'p',
    EMAIL_FROM: 'from@example.com',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    EVIDENCE_HMAC_KEY: 'a'.repeat(64),
    CONSENT_TEXT_VERSION: '2026-04-16',
  }),
}))
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => ({ check: () => ({ success: true }) }),
}))

const token = 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const reqId = 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const docId = 'cccc3333-cccc-cccc-cccc-cccccccccccc'

function makeParams() {
  return { params: Promise.resolve({ token }) }
}

// ── Send ────────────────────────────────────────────────────────────────────
describe('POST /api/sign/[token]/otp/send', () => {
  beforeEach(() => vi.clearAllMocks())

  async function loadSend() {
    const { POST } = await import('@/app/api/sign/[token]/otp/send/route')
    return POST
  }

  function req() {
    return jsonRequest(`http://localhost/api/sign/${token}/otp/send`, {})
  }

  it('returns 404 for unknown token', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({ user: null, queue: [{ data: null, error: null }] })
    )
    const POST = await loadSend()
    const res = await POST(req(), makeParams())
    expect(res.status).toBe(404)
  })

  it('returns 400 when consent not yet given', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          {
            data: {
              id: reqId,
              document_id: docId,
              signer_name: 'Alice',
              signer_email: 'alice@example.com',
              status: 'pending',
              consent_given_at: null,
            },
            error: null,
          },
        ],
      })
    )
    const POST = await loadSend()
    const res = await POST(req(), makeParams())
    expect(res.status).toBe(400)
  })

  it('sends OTP email and returns 200 for valid pending request', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          {
            data: {
              id: reqId,
              document_id: docId,
              signer_name: 'Alice',
              signer_email: 'alice@example.com',
              status: 'pending',
              consent_given_at: new Date().toISOString(),
            },
            error: null,
          },
          { data: null, error: null }, // signing_otps select (no existing)
          { data: null, error: null }, // signing_otps upsert
        ],
      })
    )
    const POST = await loadSend()
    const res = await POST(req(), makeParams())
    expect(res.status).toBe(200)
    expect(sendMail).toHaveBeenCalledOnce()
    const mailArgs = sendMail.mock.calls[0][0]
    expect(mailArgs.to).toBe('alice@example.com')
    // Subject should contain the 6-digit code.
    expect(mailArgs.subject).toMatch(/Your signing code: \d{6}/)
    expect(logAudit).toHaveBeenCalledWith(null, 'otp_sent', 'document', docId, expect.any(Object))
  })

  it('is idempotent when OTP already verified', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          {
            data: {
              id: reqId,
              document_id: docId,
              signer_name: 'Alice',
              signer_email: 'alice@example.com',
              status: 'pending',
              consent_given_at: new Date().toISOString(),
            },
            error: null,
          },
          { data: { verified_at: new Date().toISOString() }, error: null }, // existing otp
        ],
      })
    )
    const POST = await loadSend()
    const res = await POST(req(), makeParams())
    expect(res.status).toBe(200)
    expect(sendMail).not.toHaveBeenCalled()
  })
})

// ── Verify ──────────────────────────────────────────────────────────────────
describe('POST /api/sign/[token]/otp/verify', () => {
  beforeEach(() => vi.clearAllMocks())

  async function loadVerify() {
    const { POST } = await import('@/app/api/sign/[token]/otp/verify/route')
    return POST
  }

  function req(code: string) {
    return jsonRequest(`http://localhost/api/sign/${token}/otp/verify`, { code })
  }

  it('returns 400 for non-6-digit code', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({ user: null, queue: [] })
    )
    const POST = await loadVerify()
    const res = await POST(req('abc'), makeParams())
    expect(res.status).toBe(400)
  })

  it('returns 404 for unknown token', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({ user: null, queue: [{ data: null, error: null }] })
    )
    const POST = await loadVerify()
    const res = await POST(req('123456'), makeParams())
    expect(res.status).toBe(404)
  })

  it('returns 400 when no OTP record exists', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          { data: { id: reqId, document_id: docId, signer_email: 's@x.com', status: 'pending' }, error: null },
          { data: null, error: null }, // no OTP record
        ],
      })
    )
    const POST = await loadVerify()
    const res = await POST(req('123456'), makeParams())
    expect(res.status).toBe(400)
  })

  it('returns 400 for wrong code and increments attempts', async () => {
    const { hashOtpCode } = await import('@/lib/esigning/otp')
    const correctHash = hashOtpCode(reqId, '654321')

    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          { data: { id: reqId, document_id: docId, signer_email: 's@x.com', status: 'pending' }, error: null },
          {
            data: {
              request_id: reqId,
              code_hash: correctHash,
              expires_at: new Date(Date.now() + 900_000).toISOString(),
              verified_at: null,
              attempts: 0,
            },
            error: null,
          },
          { data: null, error: null }, // update attempts
        ],
      })
    )
    const POST = await loadVerify()
    const res = await POST(req('123456'), makeParams())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Incorrect code/)
  })

  it('returns 200 and logs audit for correct code', async () => {
    const { hashOtpCode } = await import('@/lib/esigning/otp')
    const code = '123456'
    const correctHash = hashOtpCode(reqId, code)

    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          { data: { id: reqId, document_id: docId, signer_email: 's@x.com', status: 'pending' }, error: null },
          {
            data: {
              request_id: reqId,
              code_hash: correctHash,
              expires_at: new Date(Date.now() + 900_000).toISOString(),
              verified_at: null,
              attempts: 0,
            },
            error: null,
          },
          { data: null, error: null }, // update verified_at
        ],
      })
    )
    const POST = await loadVerify()
    const res = await POST(req(code), makeParams())
    expect(res.status).toBe(200)
    expect(logAudit).toHaveBeenCalledWith(null, 'otp_verified', 'document', docId, expect.any(Object))
  })

  it('returns 429 when max attempts reached', async () => {
    const { hashOtpCode } = await import('@/lib/esigning/otp')
    const correctHash = hashOtpCode(reqId, '999999')

    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          { data: { id: reqId, document_id: docId, signer_email: 's@x.com', status: 'pending' }, error: null },
          {
            data: {
              request_id: reqId,
              code_hash: correctHash,
              expires_at: new Date(Date.now() + 900_000).toISOString(),
              verified_at: null,
              attempts: 5,
            },
            error: null,
          },
        ],
      })
    )
    const POST = await loadVerify()
    const res = await POST(req('123456'), makeParams())
    expect(res.status).toBe(429)
  })
})
