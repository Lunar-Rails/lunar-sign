import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { routeParams } from '../../helpers/mock-request'

const logAudit = vi.fn()
vi.mock('@/lib/audit', () => ({ logAudit }))

const createClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient }))
const getServiceClient = vi.fn()
vi.mock('@/lib/supabase/service', () => ({ getServiceClient }))

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue(undefined),
    })),
  },
}))

const userId = '11111111-1111-4111-8111-111111111111'
const docId = '22222222-2222-4222-8222-222222222222'

async function loadPost() {
  const { POST } = await import('@/app/api/documents/[id]/send/route')
  return POST
}

describe('POST /api/documents/[id]/send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({ user: null, queue: [] })
    )
  })

  it('returns 401 when unauthenticated', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({ user: null, queue: [] })
    )
    const POST = await loadPost()
    const res = await POST(
      new NextRequest('http://localhost/api/documents/x/send', { method: 'POST' }),
      routeParams({ id: docId })
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when document not draft', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [
          { data: { id: docId, status: 'pending', title: 'T' }, error: null },
          { data: { role: 'admin' }, error: null },
        ],
      })
    )
    const POST = await loadPost()
    const res = await POST(
      new NextRequest('http://localhost/api/documents/x/send', { method: 'POST' }),
      routeParams({ id: docId })
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when no signers', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [{ data: [], error: null }],
      })
    )
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [
          { data: { id: docId, status: 'draft', title: 'T' }, error: null },
          { data: { role: 'admin' }, error: null },
        ],
      })
    )
    const POST = await loadPost()
    const res = await POST(
      new NextRequest('http://localhost/api/documents/x/send', { method: 'POST' }),
      routeParams({ id: docId })
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when creator-assigned fields are blank', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          {
            data: [
              {
                token: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                signer_email: 's@x.com',
                signer_name: 'S',
              },
            ],
            error: null,
          },
        ],
      })
    )
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [
          {
            data: {
              id: docId,
              status: 'draft',
              title: 'Title',
              field_metadata: [
                {
                  id: 'creator-1',
                  type: 'text',
                  pageIndex: 0,
                  xPercent: 1,
                  yPercent: 1,
                  widthPercent: 10,
                  heightPercent: 5,
                  label: 'Company',
                  value: '   ',
                  forSigner: false,
                  signerIndex: null,
                },
                {
                  id: 'signer-1',
                  type: 'signature',
                  pageIndex: 0,
                  xPercent: 10,
                  yPercent: 10,
                  widthPercent: 20,
                  heightPercent: 5,
                  label: 'Signature',
                  forSigner: true,
                  signerIndex: 0,
                },
              ],
            },
            error: null,
          },
          { data: { role: 'admin' }, error: null },
        ],
      })
    )
    const POST = await loadPost()
    const res = await POST(
      new NextRequest('http://localhost/api/documents/x/send', { method: 'POST' }),
      routeParams({ id: docId })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Missing values for fields')
    expect(body.missing_labels).toEqual(['Company'])
  })

  it('returns 400 when a signer slot has no assigned fields', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          {
            data: [
              {
                token: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                signer_email: 's1@x.com',
                signer_name: 'Signer 1',
              },
              {
                token: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
                signer_email: 's2@x.com',
                signer_name: 'Signer 2',
              },
            ],
            error: null,
          },
        ],
      })
    )
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [
          {
            data: {
              id: docId,
              status: 'draft',
              title: 'Title',
              field_metadata: [
                {
                  id: 'signer-1',
                  type: 'signature',
                  pageIndex: 0,
                  xPercent: 10,
                  yPercent: 10,
                  widthPercent: 20,
                  heightPercent: 5,
                  label: 'Signature',
                  forSigner: true,
                  signerIndex: 0,
                },
              ],
            },
            error: null,
          },
          { data: { role: 'admin' }, error: null },
        ],
      })
    )
    const POST = await loadPost()
    const res = await POST(
      new NextRequest('http://localhost/api/documents/x/send', { method: 'POST' }),
      routeParams({ id: docId })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Signer 2/)
    expect(body.missing_signer_indexes).toEqual([1])
  })

  it('sets pending and logs audit', async () => {
    const signers = [
      {
        token: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        signer_email: 's@x.com',
        signer_name: 'S',
      },
    ]
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [{ data: signers, error: null }],
      })
    )
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [
          {
            data: {
              id: docId,
              status: 'draft',
              title: 'Title',
              field_metadata: [
                {
                  id: 'signer-1',
                  type: 'signature',
                  pageIndex: 0,
                  xPercent: 10,
                  yPercent: 10,
                  widthPercent: 20,
                  heightPercent: 5,
                  label: 'Signature',
                  forSigner: true,
                  signerIndex: 0,
                },
              ],
            },
            error: null,
          },
          { data: { role: 'admin' }, error: null },
          { data: null, error: null },
        ],
      })
    )
    const POST = await loadPost()
    const res = await POST(
      new NextRequest('http://localhost/api/documents/x/send', { method: 'POST' }),
      routeParams({ id: docId })
    )
    expect(res.status).toBe(200)
    expect(logAudit).toHaveBeenCalledWith(
      userId,
      'document_sent',
      'document',
      docId,
      expect.objectContaining({ signer_count: 1 })
    )
  })
})
