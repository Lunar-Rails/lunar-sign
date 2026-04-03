import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { routeParams } from '../../helpers/mock-request'

const logAudit = vi.fn()
vi.mock('@/lib/audit', () => ({ logAudit }))

const createClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient }))

const userId = '11111111-1111-4111-8111-111111111111'
const docId = '22222222-2222-4222-8222-222222222222'

async function loadPost() {
  const { POST } = await import('@/app/api/documents/[id]/cancel/route')
  return POST
}

describe('POST /api/documents/[id]/cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({ user: null, queue: [] })
    )
    const POST = await loadPost()
    const res = await POST(
      new NextRequest('http://localhost/api/documents/x/cancel', { method: 'POST' }),
      routeParams({ id: docId })
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 when document not found for uploader', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [{ data: null, error: null }],
      })
    )
    const POST = await loadPost()
    const res = await POST(
      new NextRequest('http://localhost/api/documents/x/cancel', { method: 'POST' }),
      routeParams({ id: docId })
    )
    expect(res.status).toBe(404)
  })

  it('returns 400 when document not pending', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [
          {
            data: { id: docId, status: 'draft', uploaded_by: userId },
            error: null,
          },
        ],
      })
    )
    const POST = await loadPost()
    const res = await POST(
      new NextRequest('http://localhost/api/documents/x/cancel', { method: 'POST' }),
      routeParams({ id: docId })
    )
    expect(res.status).toBe(400)
  })

  it('cancels document and signature requests', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [
          {
            data: { id: docId, status: 'pending', uploaded_by: userId },
            error: null,
          },
          { data: null, error: null },
          { data: null, error: null },
        ],
      })
    )
    const POST = await loadPost()
    const res = await POST(
      new NextRequest('http://localhost/api/documents/x/cancel', { method: 'POST' }),
      routeParams({ id: docId })
    )
    expect(res.status).toBe(200)
    expect(logAudit).toHaveBeenCalledWith(
      userId,
      'document_cancelled',
      'document',
      docId,
      {}
    )
  })
})
