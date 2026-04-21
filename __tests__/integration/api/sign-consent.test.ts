import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { jsonRequest } from '../../helpers/mock-request'

const logAudit = vi.fn()
const getServiceClient = vi.fn()
const getConfig = vi.fn(() => ({
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  CONSENT_TEXT_VERSION: '2026-04-16',
}))

vi.mock('@/lib/audit', () => ({ logAudit }))
vi.mock('@/lib/supabase/service', () => ({ getServiceClient }))
vi.mock('@/lib/config', () => ({ getConfig }))
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => ({ check: () => ({ success: true }) }),
}))

const token = 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const reqId = 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const docId = 'cccc3333-cccc-cccc-cccc-cccccccccccc'

async function loadPost() {
  const { POST } = await import('@/app/api/sign/[token]/consent/route')
  return POST
}

function makeRequest(tok = token) {
  return jsonRequest(`http://localhost/api/sign/${tok}/consent`, {})
}

describe('POST /api/sign/[token]/consent', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 for unknown token', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({ user: null, queue: [{ data: null, error: null }] })
    )
    const POST = await loadPost()
    const res = await POST(makeRequest(), { params: Promise.resolve({ token }) })
    expect(res.status).toBe(404)
  })

  it('returns 400 when request is not pending', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          {
            data: { id: reqId, document_id: docId, signer_email: 's@x.com', status: 'signed', consent_given_at: null },
            error: null,
          },
        ],
      })
    )
    const POST = await loadPost()
    const res = await POST(makeRequest(), { params: Promise.resolve({ token }) })
    expect(res.status).toBe(400)
  })

  it('records consent_given_at and audit event for pending request', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          {
            data: { id: reqId, document_id: docId, signer_email: 's@x.com', status: 'pending', consent_given_at: null },
            error: null,
          },
          { data: null, error: null }, // update
        ],
      })
    )
    const POST = await loadPost()
    const res = await POST(makeRequest(), { params: Promise.resolve({ token }) })
    // Redirect (302/307) or 200 depending on redirect behaviour in tests
    expect([200, 302, 307, 308]).toContain(res.status)
    expect(logAudit).toHaveBeenCalledWith(
      null,
      'consent_given',
      'document',
      docId,
      expect.objectContaining({ signer_email: 's@x.com', text_version: '2026-04-16' })
    )
  })

  it('is idempotent when consent already given (redirects without re-writing)', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          {
            data: {
              id: reqId,
              document_id: docId,
              signer_email: 's@x.com',
              status: 'pending',
              consent_given_at: new Date().toISOString(),
            },
            error: null,
          },
        ],
      })
    )
    const POST = await loadPost()
    const res = await POST(makeRequest(), { params: Promise.resolve({ token }) })
    expect([200, 302, 307, 308]).toContain(res.status)
    // logAudit should NOT be called again
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('returns 500 when consent persistence fails', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          {
            data: { id: reqId, document_id: docId, signer_email: 's@x.com', status: 'pending', consent_given_at: null },
            error: null,
          },
          { data: null, error: { message: 'db unavailable' } },
        ],
      })
    )
    const POST = await loadPost()
    const res = await POST(makeRequest(), { params: Promise.resolve({ token }) })
    expect(res.status).toBe(500)
    expect(logAudit).not.toHaveBeenCalled()
  })
})
