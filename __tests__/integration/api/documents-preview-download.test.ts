import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { routeParams } from '../../helpers/mock-request'
import { userA, userB, adminUser, doc1, company1 } from '../../helpers/rbac-fixtures'
import {
  queueDocumentPreviewForbiddenNoLinks,
  queueDocumentPreviewOwnerSuccess,
  queueDocumentPreviewAdminSuccess,
  queueDocumentDownloadForbiddenNoLinks,
  queueDocumentDownloadOwnerSuccess,
  queueDocumentDownloadAdminSuccess,
  docStub,
} from '../../helpers/compose-route-queue'
import {
  queueCanAccessDocumentViaCompany,
  queueCanAccessDocumentDeniedNotMember,
} from '../../helpers/rbac-queue-builders'

const createClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient }))

const getServiceClient = vi.fn()
vi.mock('@/lib/supabase/service', () => ({ getServiceClient }))

function makeServiceClient() {
  return {
    storage: {
      from(_bucket: string) {
        return {
          download: async () => ({ data: new Blob([new Uint8Array([1])]), error: null }),
          createSignedUrl: async () => ({
            data: { signedUrl: 'https://signed.example/x.pdf' },
            error: null,
          }),
        }
      },
    },
  }
}

// ── GET /api/documents/[id]/preview ──────────────────────────────────────────

describe('GET /api/documents/[id]/preview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServiceClient.mockReturnValue(makeServiceClient())
  })

  it('returns 401 without auth', async () => {
    createClient.mockResolvedValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const { GET } = await import('@/app/api/documents/[id]/preview/route')
    const res = await GET(
      new NextRequest('http://localhost/preview'),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 when document does not exist', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        queue: [{ data: null, error: null }],
      })
    )
    const { GET } = await import('@/app/api/documents/[id]/preview/route')
    const res = await GET(
      new NextRequest('http://localhost/preview'),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(404)
  })

  it('returns 403 when member has no access (no company links)', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userB },
        queue: queueDocumentPreviewForbiddenNoLinks(),
      })
    )
    const { GET } = await import('@/app/api/documents/[id]/preview/route')
    const res = await GET(
      new NextRequest('http://localhost/preview'),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(403)
  })

  it('returns 403 when member is in a different company (not linked)', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userB },
        queue: [
          { data: docStub(), error: null },
          ...queueCanAccessDocumentDeniedNotMember(company1),
        ],
      })
    )
    const { GET } = await import('@/app/api/documents/[id]/preview/route')
    const res = await GET(
      new NextRequest('http://localhost/preview'),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(403)
  })

  it('returns 200 when the document owner requests preview', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        queue: queueDocumentPreviewOwnerSuccess(docStub({ uploaded_by: userA })),
      })
    )
    const { GET } = await import('@/app/api/documents/[id]/preview/route')
    const res = await GET(
      new NextRequest('http://localhost/preview'),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(200)
  })

  it('returns 200 when admin requests preview of any document', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: adminUser },
        queue: queueDocumentPreviewAdminSuccess(),
      })
    )
    const { GET } = await import('@/app/api/documents/[id]/preview/route')
    const res = await GET(
      new NextRequest('http://localhost/preview'),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(200)
  })

  it('returns 200 when a company member requests preview of a linked document', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userB },
        queue: [
          { data: docStub(), error: null },
          ...queueCanAccessDocumentViaCompany(company1),
        ],
      })
    )
    const { GET } = await import('@/app/api/documents/[id]/preview/route')
    const res = await GET(
      new NextRequest('http://localhost/preview'),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(200)
  })

  it('returns PDF from documents bucket for a draft document', async () => {
    const { client: svcClient, buckets } = (() => {
      const b: string[] = []
      return {
        client: { storage: { from(bucket: string) { b.push(bucket); return makeServiceClient().storage.from(bucket) } } },
        buckets: b,
      }
    })()
    getServiceClient.mockReturnValue(svcClient)
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        queue: queueDocumentPreviewOwnerSuccess(docStub({ status: 'draft', uploaded_by: userA })),
      })
    )
    const { GET } = await import('@/app/api/documents/[id]/preview/route')
    await GET(new NextRequest('http://localhost/preview'), routeParams({ id: doc1 }))
    expect(buckets).toContain('documents')
  })

  it('returns PDF from signed-documents bucket for a pending document with a signed artifact', async () => {
    const { client: svcClient, buckets } = (() => {
      const b: string[] = []
      return {
        client: { storage: { from(bucket: string) { b.push(bucket); return makeServiceClient().storage.from(bucket) } } },
        buckets: b,
      }
    })()
    getServiceClient.mockReturnValue(svcClient)
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        queue: queueDocumentPreviewOwnerSuccess(
          docStub({ status: 'pending', latest_signed_pdf_path: 'signed/a.pdf', uploaded_by: userA })
        ),
      })
    )
    const { GET } = await import('@/app/api/documents/[id]/preview/route')
    await GET(new NextRequest('http://localhost/preview'), routeParams({ id: doc1 }))
    expect(buckets).toContain('signed-documents')
  })
})

// ── GET /api/documents/[id]/download ─────────────────────────────────────────

describe('GET /api/documents/[id]/download', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServiceClient.mockReturnValue(makeServiceClient())
  })

  it('returns 401 without auth', async () => {
    createClient.mockResolvedValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const { GET } = await import('@/app/api/documents/[id]/download/route')
    const res = await GET(
      new NextRequest('http://localhost/download'),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 when member has no access (no company links)', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userB },
        queue: queueDocumentDownloadForbiddenNoLinks(),
      })
    )
    const { GET } = await import('@/app/api/documents/[id]/download/route')
    const res = await GET(
      new NextRequest('http://localhost/download'),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(403)
  })

  it('returns 404 when document is not completed', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        // completed doc queue but status = draft
        queue: [
          { data: docStub({ status: 'draft', uploaded_by: userA }), error: null },
          ...queueDocumentDownloadOwnerSuccess(docStub({ uploaded_by: userA })).slice(1),
        ],
      })
    )
    // Override to return a draft doc so we can verify 404 check
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        queue: [
          { data: docStub({ status: 'draft' }), error: null },
          ...([{ data: { role: 'member' }, error: null }, { data: { id: doc1 }, error: null }]),
        ],
      })
    )
    const { GET } = await import('@/app/api/documents/[id]/download/route')
    const res = await GET(
      new NextRequest('http://localhost/download'),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(404)
  })

  it('returns 307 (redirect to signed URL) when the document owner downloads a completed document', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        queue: queueDocumentDownloadOwnerSuccess(docStub({ uploaded_by: userA })),
      })
    )
    const { GET } = await import('@/app/api/documents/[id]/download/route')
    const res = await GET(
      new NextRequest('http://localhost/download'),
      routeParams({ id: doc1 })
    )
    // NextResponse.redirect returns 307 by default
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toMatch(/signed\.example/)
  })

  it('returns 307 (redirect to signed URL) when an admin downloads a completed document', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: adminUser },
        queue: queueDocumentDownloadAdminSuccess(),
      })
    )
    const { GET } = await import('@/app/api/documents/[id]/download/route')
    const res = await GET(
      new NextRequest('http://localhost/download'),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toMatch(/signed\.example/)
  })
})
