import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { routeParams } from '../../helpers/mock-request'
import { userA, adminUser, doc1 } from '../../helpers/rbac-fixtures'
import {
  queueDocumentDeleteForbiddenNoLinks,
  queueDocumentDeleteOwnerSuccess,
  queueDocumentDeleteAdminSuccess,
  docStub,
} from '../../helpers/compose-route-queue'

const logAudit = vi.fn()
vi.mock('@/lib/audit', () => ({ logAudit }))

const createClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient }))

async function loadDelete() {
  const { DELETE } = await import('@/app/api/documents/[id]/route')
  return DELETE
}

describe('DELETE /api/documents/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    createClient.mockResolvedValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const DELETE = await loadDelete()
    const res = await DELETE(
      new Request('http://localhost/api/documents/x'),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 when document does not exist', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        queue: [{ data: null, error: null }], // documents.maybeSingle → not found
      })
    )
    const DELETE = await loadDelete()
    const res = await DELETE(
      new Request('http://localhost/api/documents/x'),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(404)
  })

  it('returns 403 when member has no access (no company links)', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        queue: queueDocumentDeleteForbiddenNoLinks(),
      })
    )
    const DELETE = await loadDelete()
    const res = await DELETE(
      new Request('http://localhost/api/documents/x'),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(403)
  })

  it('returns 200 when the document owner soft-deletes their document', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        queue: queueDocumentDeleteOwnerSuccess(docStub({ uploaded_by: userA })),
      })
    )
    const DELETE = await loadDelete()
    const res = await DELETE(
      new Request('http://localhost/api/documents/x'),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(200)
    expect(logAudit).toHaveBeenCalledWith(
      userA,
      'document_deleted',
      'document',
      doc1,
      expect.any(Object)
    )
  })

  it('returns 200 when an admin soft-deletes any document', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: adminUser },
        queue: queueDocumentDeleteAdminSuccess(),
      })
    )
    const DELETE = await loadDelete()
    const res = await DELETE(
      new Request('http://localhost/api/documents/x'),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(200)
    expect(logAudit).toHaveBeenCalledWith(
      adminUser,
      'document_deleted',
      'document',
      doc1,
      expect.any(Object)
    )
  })
})
