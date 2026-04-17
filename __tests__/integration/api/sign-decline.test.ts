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

async function loadPost() {
  const { POST } = await import('@/app/api/sign/[token]/decline/route')
  return POST
}

describe('POST /api/sign/[token]/decline', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 for unknown token', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({ user: null, queue: [{ data: null, error: null }] })
    )
    const POST = await loadPost()
    const res = await POST(
      jsonRequest(`http://localhost/api/sign/${token}/decline`, {}),
      makeParams()
    )
    expect(res.status).toBe(404)
  })

  it('returns 400 when request is not pending', async () => {
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
              status: 'signed',
              expires_at: null,
            },
            error: null,
          },
        ],
      })
    )
    const POST = await loadPost()
    const res = await POST(
      jsonRequest(`http://localhost/api/sign/${token}/decline`, {}),
      makeParams()
    )
    expect(res.status).toBe(400)
  })

  it('marks request cancelled, cancels document, logs audit, notifies owner', async () => {
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
              expires_at: null,
            },
            error: null,
          },
          { data: null, error: null }, // signature_requests update
          { data: null, error: null }, // documents update
          {
            data: { title: 'Agreement', uploaded_by: 'owner-uid' },
            error: null,
          }, // document select
          {
            data: { email: 'owner@example.com', full_name: 'Owner' },
            error: null,
          }, // profiles select
        ],
      })
    )
    const POST = await loadPost()
    const res = await POST(
      jsonRequest(`http://localhost/api/sign/${token}/decline`, { reason: 'Terms not acceptable' }),
      makeParams()
    )
    expect(res.status).toBe(200)
    expect(logAudit).toHaveBeenCalledWith(
      null,
      'signature_declined',
      'document',
      docId,
      expect.objectContaining({ signer_email: 'alice@example.com', reason: 'Terms not acceptable' })
    )
    expect(sendMail).toHaveBeenCalledOnce()
    const mail = sendMail.mock.calls[0][0]
    expect(mail.to).toBe('owner@example.com')
    expect(mail.subject).toContain('Declined')
  })

  it('succeeds even when owner notification fails', async () => {
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
              expires_at: null,
            },
            error: null,
          },
          { data: null, error: null }, // signature_requests update
          { data: null, error: null }, // documents update
          { data: null, error: null }, // document select → null → email skipped
        ],
      })
    )
    const POST = await loadPost()
    const res = await POST(
      jsonRequest(`http://localhost/api/sign/${token}/decline`, {}),
      makeParams()
    )
    expect(res.status).toBe(200)
    expect(sendMail).not.toHaveBeenCalled()
  })
})
