import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { routeParams } from '../../helpers/mock-request'

const createClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient }))

/** Service client is used for storage.download on preview; must be mocked like documents-send / signatures tests. */
const getServiceClient = vi.fn()
vi.mock('@/lib/supabase/service', () => ({ getServiceClient }))

const userId = '11111111-1111-4111-8111-111111111111'
const docId = '22222222-2222-4222-8222-222222222222'
const tokenA = 'token-aaaa'

/** Service client wrapper that tracks which storage bucket was used. */
function serviceClientWithBucketTracking() {
  const buckets: string[] = []
  const client = {
    storage: {
      from(bucket: string) {
        buckets.push(bucket)
        return {
          download: async () => ({
            data: new Blob([new Uint8Array([1])]),
            error: null,
          }),
          createSignedUrl: async () => ({
            data: { signedUrl: 'https://signed.example/x.pdf' },
            error: null,
          }),
        }
      },
    },
  }
  return { client, buckets }
}

describe('GET /api/documents/[id]/preview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({ user: null, queue: [] })
    )
  })

  it('returns 401 without auth', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({ user: null, queue: [] })
    )
    const { GET } = await import('@/app/api/documents/[id]/preview/route')
    const res = await GET(
      new NextRequest('http://localhost/preview'),
      routeParams({ id: docId })
    )
    expect(res.status).toBe(401)
  })

  it('returns PDF from documents bucket when no signed artifact exists', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [
          {
            data: {
              id: docId,
              title: 'Doc',
              file_path: 'path/to.pdf',
              uploaded_by: userId,
              status: 'draft',
              latest_signed_pdf_path: null,
            },
            error: null,
          },
          { data: { role: 'admin' }, error: null },
        ],
      })
    )
    const tracker = serviceClientWithBucketTracking()
    getServiceClient.mockReturnValue(tracker.client)

    const { GET } = await import('@/app/api/documents/[id]/preview/route')
    const res = await GET(
      new NextRequest('http://localhost/preview'),
      routeParams({ id: docId })
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('pdf')
    expect(tracker.buckets).toEqual(['documents'])
  })

  it('returns PDF from signed-documents bucket when status=pending with a signed artifact', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [
          {
            data: {
              id: docId,
              title: 'Doc',
              file_path: 'path/to.pdf',
              uploaded_by: userId,
              status: 'pending',
              latest_signed_pdf_path: 'docs/1/sig_signed.pdf',
            },
            error: null,
          },
          { data: { role: 'admin' }, error: null },
        ],
      })
    )
    const tracker = serviceClientWithBucketTracking()
    getServiceClient.mockReturnValue(tracker.client)

    const { GET } = await import('@/app/api/documents/[id]/preview/route')
    const res = await GET(
      new NextRequest('http://localhost/preview'),
      routeParams({ id: docId })
    )
    expect(res.status).toBe(200)
    expect(tracker.buckets).toEqual(['signed-documents'])
  })

  it('returns PDF from documents bucket for drafts even if latest_signed_pdf_path is set', async () => {
    // Drafts should never render a signed artifact (shouldn't happen in practice,
    // but guard against a stale column leaking through).
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [
          {
            data: {
              id: docId,
              title: 'Doc',
              file_path: 'path/to.pdf',
              uploaded_by: userId,
              status: 'draft',
              latest_signed_pdf_path: 'stale/path.pdf',
            },
            error: null,
          },
          { data: { role: 'admin' }, error: null },
        ],
      })
    )
    const tracker = serviceClientWithBucketTracking()
    getServiceClient.mockReturnValue(tracker.client)

    const { GET } = await import('@/app/api/documents/[id]/preview/route')
    const res = await GET(
      new NextRequest('http://localhost/preview'),
      routeParams({ id: docId })
    )
    expect(res.status).toBe(200)
    expect(tracker.buckets).toEqual(['documents'])
  })
})

describe('GET /api/documents/[id]/download', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 when document not completed', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [
          {
            data: {
              id: docId,
              status: 'pending',
              latest_signed_pdf_path: null,
            },
            error: null,
          },
          { data: { role: 'admin' }, error: null },
        ],
      })
    )
    const { GET } = await import('@/app/api/documents/[id]/download/route')
    const res = await GET(
      new NextRequest('http://localhost/dl'),
      routeParams({ id: docId })
    )
    expect(res.status).toBe(404)
  })

  it('redirects when completed', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [
          {
            data: {
              id: docId,
              status: 'completed',
              latest_signed_pdf_path: 'signed/x.pdf',
            },
            error: null,
          },
          { data: { role: 'admin' }, error: null },
        ],
      })
    )
    const { GET } = await import('@/app/api/documents/[id]/download/route')
    const res = await GET(
      new NextRequest('http://localhost/dl'),
      routeParams({ id: docId })
    )
    expect([302, 307]).toContain(res.status)
  })
})

describe('GET /api/download/[token]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 for an unknown token', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [{ data: null, error: null }],
      })
    )
    const { GET } = await import('@/app/api/download/[token]/route')
    const res = await GET(
      new NextRequest('http://localhost/api/download/x'),
      routeParams({ token: 'unknown' })
    )
    expect(res.status).toBe(404)
  })

  it('returns 403 when the signer has not signed yet', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          {
            data: {
              status: 'pending',
              documents: {
                id: docId,
                status: 'pending',
                latest_signed_pdf_path: 'signed/x.pdf',
              },
            },
            error: null,
          },
        ],
      })
    )
    const { GET } = await import('@/app/api/download/[token]/route')
    const res = await GET(
      new NextRequest('http://localhost/api/download/t'),
      routeParams({ token: tokenA })
    )
    expect(res.status).toBe(403)
  })

  it('redirects to signed URL for a signed signer while document is still pending (partial download)', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          {
            data: {
              status: 'signed',
              documents: {
                id: docId,
                status: 'pending',
                latest_signed_pdf_path: 'signed/partial.pdf',
              },
            },
            error: null,
          },
        ],
      })
    )
    const { GET } = await import('@/app/api/download/[token]/route')
    const res = await GET(
      new NextRequest('http://localhost/api/download/t'),
      routeParams({ token: tokenA })
    )
    expect([302, 307]).toContain(res.status)
  })

  it('redirects to signed URL when document is completed', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          {
            data: {
              status: 'signed',
              documents: {
                id: docId,
                status: 'completed',
                latest_signed_pdf_path: 'signed/final.pdf',
              },
            },
            error: null,
          },
        ],
      })
    )
    const { GET } = await import('@/app/api/download/[token]/route')
    const res = await GET(
      new NextRequest('http://localhost/api/download/t'),
      routeParams({ token: tokenA })
    )
    expect([302, 307]).toContain(res.status)
  })

  it('returns 404 when signer is signed but latest_signed_pdf_path is missing', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          {
            data: {
              status: 'signed',
              documents: {
                id: docId,
                status: 'pending',
                latest_signed_pdf_path: null,
              },
            },
            error: null,
          },
        ],
      })
    )
    const { GET } = await import('@/app/api/download/[token]/route')
    const res = await GET(
      new NextRequest('http://localhost/api/download/t'),
      routeParams({ token: tokenA })
    )
    expect(res.status).toBe(404)
  })
})
