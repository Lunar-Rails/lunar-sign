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

  it('returns PDF when allowed', async () => {
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
            },
            error: null,
          },
          { data: { role: 'admin' }, error: null },
        ],
      })
    )
    const { GET } = await import('@/app/api/documents/[id]/preview/route')
    const res = await GET(
      new NextRequest('http://localhost/preview'),
      routeParams({ id: docId })
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('pdf')
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
