import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { jsonRequest } from '../../helpers/mock-request'

const logAudit = vi.fn()
const getServiceClient = vi.fn()
const getConfig = vi.fn(() => ({
  MAILTRAP_HOST: 'h',
  MAILTRAP_PORT: 2525,
  MAILTRAP_USER: 'u',
  MAILTRAP_PASSWORD: 'p',
  EMAIL_FROM: 'from@example.com',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
}))

const sendMail = vi.fn().mockResolvedValue(undefined)
const createTransport = vi.fn(() => ({ sendMail }))

vi.mock('@/lib/audit', () => ({ logAudit }))
vi.mock('@/lib/supabase/service', () => ({ getServiceClient }))
vi.mock('@/lib/config', () => ({ getConfig }))
vi.mock('nodemailer', () => ({
  default: { createTransport },
}))

async function loadPost() {
  const { POST } = await import('@/app/api/signatures/route')
  return POST
}

const docId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const reqId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const token = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const signatureData = 'data:image/png;base64,abc123'

const minimalPdfBase64 = Buffer.from('%PDF-1.4 minimal', 'utf8').toString('base64')

describe('POST /api/signatures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when required fields missing', async () => {
    getServiceClient.mockReturnValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const POST = await loadPost()
    const res = await POST(
      jsonRequest('http://localhost/api/signatures', {
        token,
        signer_name: 'S',
        signed_pdf_base64: '',
      })
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid token', async () => {
    const client = createQueuedSupabaseMock({
      user: null,
      queue: [{ data: null, error: null }],
    })
    getServiceClient.mockReturnValue(client)
    const POST = await loadPost()
    const res = await POST(
      jsonRequest('http://localhost/api/signatures', {
        token: 'bad',
        signer_name: 'S',
        signature_data: signatureData,
        signed_pdf_base64: minimalPdfBase64,
      })
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 for empty decoded PDF', async () => {
    const client = createQueuedSupabaseMock({
      user: null,
      queue: [
        {
          data: {
            id: reqId,
            document_id: docId,
            token,
            status: 'pending',
            signer_email: 's@x.com',
          },
          error: null,
        },
        {
          data: { id: docId, title: 'T', uploaded_by: 'u1' },
          error: null,
        },
      ],
    })
    getServiceClient.mockReturnValue(client)
    const POST = await loadPost()
    const res = await POST(
      jsonRequest('http://localhost/api/signatures', {
        token,
        signer_name: 'S',
        signature_data: signatureData,
        signed_pdf_base64: Buffer.from('', 'utf8').toString('base64'),
      })
    )
    expect(res.status).toBe(400)
  })

  it('returns 500 when storage upload fails', async () => {
    const client = createQueuedSupabaseMock({
      user: null,
      queue: [
        {
          data: {
            id: reqId,
            document_id: docId,
            token,
            status: 'pending',
            signer_email: 's@x.com',
          },
          error: null,
        },
        {
          data: { id: docId, title: 'T', uploaded_by: 'u1' },
          error: null,
        },
      ],
      storageUploadError: { message: 'fail' },
    })
    getServiceClient.mockReturnValue(client)
    const POST = await loadPost()
    const res = await POST(
      jsonRequest('http://localhost/api/signatures', {
        token,
        signer_name: 'S',
        signature_data: signatureData,
        signed_pdf_base64: minimalPdfBase64,
      })
    )
    expect(res.status).toBe(500)
  })

  it('records signature and audit when token valid; not completed when other pending', async () => {
    const client = createQueuedSupabaseMock({
      user: null,
      queue: [
        { data: { id: reqId, document_id: docId, token, status: 'pending', signer_email: 's@x.com' }, error: null },
        { data: { id: docId, title: 'T', uploaded_by: 'u1' }, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: [{ status: 'signed' }, { status: 'pending' }], error: null },
      ],
    })
    getServiceClient.mockReturnValue(client)
    const POST = await loadPost()
    const res = await POST(
      jsonRequest('http://localhost/api/signatures', {
        token,
        signer_name: 'Sam',
        signature_data: signatureData,
        signed_pdf_base64: minimalPdfBase64,
      })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.completed).toBe(false)
    expect(logAudit).toHaveBeenCalledWith(
      null,
      'document_signed',
      'document',
      docId,
      expect.objectContaining({ token_suffix: token.slice(-8), signer_name: 'Sam' })
    )
  })

  it('marks document completed and logs document_completed when all signed', async () => {
    const client = createQueuedSupabaseMock({
      user: null,
      queue: [
        { data: { id: reqId, document_id: docId, token, status: 'pending', signer_email: 's@x.com' }, error: null },
        { data: { id: docId, title: 'T', uploaded_by: 'u1' }, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: [{ status: 'signed' }], error: null },
        { data: null, error: null },
        { data: { email: 'o@x.com', full_name: 'Owner' }, error: null },
      ],
    })
    getServiceClient.mockReturnValue(client)
    const POST = await loadPost()
    const res = await POST(
      jsonRequest('http://localhost/api/signatures', {
        token,
        signer_name: 'Sam',
        signature_data: signatureData,
        signed_pdf_base64: minimalPdfBase64,
      })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.completed).toBe(true)
    expect(logAudit).toHaveBeenCalledWith(
      null,
      'document_completed',
      'document',
      docId,
      expect.any(Object)
    )
    expect(createTransport).toHaveBeenCalled()
  })
})
