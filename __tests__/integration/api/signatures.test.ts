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

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    token,
    signer_name: 'Sam',
    signature_data: signatureData,
    signed_pdf_base64: minimalPdfBase64,
    base_version: 'original',
    ...overrides,
  }
}

let ipCounter = 0
function sigRequest(body: unknown) {
  ipCounter += 1
  // Unique IP per call so the module-level rate limiter doesn't bleed across tests.
  return jsonRequest('http://localhost/api/signatures', body, {
    headers: { 'x-forwarded-for': `10.0.0.${ipCounter}` },
  })
}

describe('POST /api/signatures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when required fields missing', async () => {
    getServiceClient.mockReturnValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const POST = await loadPost()
    const res = await POST(
      sigRequest({
        token,
        signer_name: 'S',
        signed_pdf_base64: '',
      })
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when base_version missing', async () => {
    getServiceClient.mockReturnValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const POST = await loadPost()
    const res = await POST(
      sigRequest({
        token,
        signer_name: 'Sam',
        signature_data: signatureData,
        signed_pdf_base64: minimalPdfBase64,
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
    const res = await POST(sigRequest(validBody({ token: 'bad' })))
    expect(res.status).toBe(400)
  })

  it('returns 409 when base_version does not match current latest_signed_pdf_path', async () => {
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
          data: {
            id: docId,
            title: 'T',
            uploaded_by: 'u1',
            latest_signed_pdf_path: 'some/path.pdf',
          },
          error: null,
        },
      ],
    })
    getServiceClient.mockReturnValue(client)
    const POST = await loadPost()
    const res = await POST(sigRequest(validBody({ base_version: 'original' })))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('STALE_BASE')
  })

  it('accepts base_version="original" when document has no prior signatures', async () => {
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
          data: { id: docId, title: 'T', uploaded_by: 'u1', latest_signed_pdf_path: null },
          error: null,
        },
        { data: null, error: null }, // doc update
        { data: null, error: null }, // signature insert
        { data: null, error: null }, // request status update
        { data: [{ status: 'signed' }, { status: 'pending' }], error: null }, // allRequests
        { data: { email: 'o@x.com', full_name: 'Owner' }, error: null }, // owner profile
      ],
    })
    getServiceClient.mockReturnValue(client)
    const POST = await loadPost()
    const res = await POST(
      sigRequest(validBody())
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.completed).toBe(false)
  })

  it('accepts base_version matching existing latest_signed_pdf_path', async () => {
    const priorPath = 'docs/123/sig1_signed.pdf'
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
          data: {
            id: docId,
            title: 'T',
            uploaded_by: 'u1',
            latest_signed_pdf_path: priorPath,
          },
          error: null,
        },
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: [{ status: 'signed' }, { status: 'signed' }], error: null },
        { data: { email: 'o@x.com', full_name: 'Owner' }, error: null },
        { data: null, error: null },
      ],
    })
    getServiceClient.mockReturnValue(client)
    const POST = await loadPost()
    const res = await POST(sigRequest(validBody({ base_version: priorPath })))
    expect(res.status).toBe(200)
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
        { data: { id: docId, title: 'T', uploaded_by: 'u1' }, error: null },
      ],
    })
    getServiceClient.mockReturnValue(client)
    const POST = await loadPost()
    const res = await POST(
      sigRequest(
        validBody({ signed_pdf_base64: Buffer.from('', 'utf8').toString('base64') })
      )
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
        { data: { id: docId, title: 'T', uploaded_by: 'u1' }, error: null },
      ],
      storageUploadError: { message: 'fail' },
    })
    getServiceClient.mockReturnValue(client)
    const POST = await loadPost()
    const res = await POST(
      sigRequest(validBody())
    )
    expect(res.status).toBe(500)
  })

  it('records signature and audit when token valid; not completed when other pending', async () => {
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
        { data: { id: docId, title: 'T', uploaded_by: 'u1' }, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: [{ status: 'signed' }, { status: 'pending' }], error: null },
        { data: { email: 'o@x.com', full_name: 'Owner' }, error: null },
      ],
    })
    getServiceClient.mockReturnValue(client)
    const POST = await loadPost()
    const res = await POST(
      sigRequest(validBody())
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

  it('sends per-signature email to owner on partial signing', async () => {
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
        { data: { id: docId, title: 'NDA', uploaded_by: 'u1' }, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: [{ status: 'signed' }, { status: 'pending' }], error: null },
        { data: { email: 'owner@x.com', full_name: 'Owner' }, error: null },
      ],
    })
    getServiceClient.mockReturnValue(client)
    const POST = await loadPost()
    await POST(sigRequest(validBody()))
    expect(sendMail).toHaveBeenCalledTimes(1)
    const call = sendMail.mock.calls[0][0]
    expect(call.to).toBe('owner@x.com')
    expect(call.subject).toContain('NDA')
    expect(call.subject).toContain('Signature Received')
  })

  it('marks document completed and sends completion emails with per-signer download URLs', async () => {
    const tokenA = 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const tokenB = 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
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
        { data: { id: docId, title: 'Contract', uploaded_by: 'u1' }, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
        {
          data: [
            {
              id: 'r1',
              status: 'signed',
              signer_name: 'Alice',
              signer_email: 'alice@x.com',
              token: tokenA,
            },
            {
              id: 'r2',
              status: 'signed',
              signer_name: 'Bob',
              signer_email: 'bob@x.com',
              token: tokenB,
            },
          ],
          error: null,
        },
        { data: { email: 'owner@x.com', full_name: 'Owner' }, error: null },
        { data: null, error: null },
      ],
    })
    getServiceClient.mockReturnValue(client)
    const POST = await loadPost()
    const res = await POST(
      sigRequest(validBody())
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

    // Owner + 2 signers = 3 emails. No per-signature partial email (avoid double-notify).
    expect(sendMail).toHaveBeenCalledTimes(3)

    const callsByTo = new Map<string, { subject: string; html: string }>()
    for (const args of sendMail.mock.calls) {
      callsByTo.set(args[0].to, { subject: args[0].subject, html: args[0].html })
    }

    const ownerCall = callsByTo.get('owner@x.com')
    expect(ownerCall).toBeDefined()
    expect(ownerCall?.subject).toContain('Document Completed')
    expect(ownerCall?.html).toContain(
      `http://localhost:3000/api/documents/${docId}/download`
    )

    const aliceCall = callsByTo.get('alice@x.com')
    expect(aliceCall?.subject).toContain('Fully Signed')
    expect(aliceCall?.html).toContain(`http://localhost:3000/api/download/${tokenA}`)

    const bobCall = callsByTo.get('bob@x.com')
    expect(bobCall?.html).toContain(`http://localhost:3000/api/download/${tokenB}`)
  })
})
