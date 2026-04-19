import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { jsonRequest } from '../../helpers/mock-request'
import { userA, userB, adminUser, doc1 } from '../../helpers/rbac-fixtures'
import {
  queueSignatureRequestPostForbiddenNoLinks,
  queueSignatureRequestDeleteForbiddenNoLinks,
  docStub,
} from '../../helpers/compose-route-queue'
import {
  queueCanAccessDocumentAdmin,
  queueCanAccessDocumentDeniedNotMember,
} from '../../helpers/rbac-queue-builders'

const logAudit = vi.fn()
vi.mock('@/lib/audit', () => ({ logAudit }))

const createClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient }))

const getServiceClient = vi.fn()
vi.mock('@/lib/supabase/service', () => ({ getServiceClient }))

vi.mock('crypto', async (importOriginal) => {
  const mod = await importOriginal<typeof import('crypto')>()
  return { ...mod, randomUUID: () => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }
})

const userId = userA
const docId = doc1

async function loadRoute() {
  return import('@/app/api/signature-requests/route')
}

describe('signature-requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST', () => {
    it('returns 401 without auth', async () => {
      createClient.mockResolvedValue(
        createQueuedSupabaseMock({ user: null, queue: [] })
      )
      const { POST } = await loadRoute()
      const res = await POST(
        jsonRequest('http://localhost/api/signature-requests', {
          document_id: docId,
          signer_name: 'A',
          signer_email: 'a@b.co',
        })
      )
      expect(res.status).toBe(401)
    })

    it('returns 400 for invalid signer', async () => {
      createClient.mockResolvedValue(
        createQueuedSupabaseMock({ user: { id: userId }, queue: [] })
      )
      const { POST } = await loadRoute()
      const res = await POST(
        jsonRequest('http://localhost/api/signature-requests', {
          document_id: docId,
          signer_name: '',
          signer_email: 'a@b.co',
        })
      )
      expect(res.status).toBe(400)
    })

    it('returns 404 when document missing', async () => {
      createClient.mockResolvedValue(
        createQueuedSupabaseMock({
          user: { id: userId },
          queue: [{ data: null, error: null }],
        })
      )
      const { POST } = await loadRoute()
      const res = await POST(
        jsonRequest('http://localhost/api/signature-requests', {
          document_id: docId,
          signer_name: 'A',
          signer_email: 'a@b.co',
        })
      )
      expect(res.status).toBe(404)
    })

    it('returns 403 when member has no access to the document (no company links)', async () => {
      createClient.mockResolvedValue(
        createQueuedSupabaseMock({
          user: { id: userB },
          queue: queueSignatureRequestPostForbiddenNoLinks(docStub({ status: 'draft' })),
        })
      )
      const { POST } = await loadRoute()
      const res = await POST(
        jsonRequest('http://localhost/api/signature-requests', {
          document_id: docId,
          signer_name: 'A',
          signer_email: 'a@b.co',
        })
      )
      expect(res.status).toBe(403)
    })

    it('returns 403 when member is in a different company (not linked to doc)', async () => {
      createClient.mockResolvedValue(
        createQueuedSupabaseMock({
          user: { id: userB },
          queue: [
            { data: docStub({ status: 'draft' }), error: null },
            ...queueCanAccessDocumentDeniedNotMember(),
          ],
        })
      )
      const { POST } = await loadRoute()
      const res = await POST(
        jsonRequest('http://localhost/api/signature-requests', {
          document_id: docId,
          signer_name: 'A',
          signer_email: 'a@b.co',
        })
      )
      expect(res.status).toBe(403)
    })

    it('returns 201 and creates request with signer_index = 0 when no existing signers', async () => {
      const row = {
        id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
        document_id: docId,
        signer_name: 'A',
        signer_email: 'a@b.co',
      }
      const insertSpy = vi.fn()
      const client = createQueuedSupabaseMock({
        user: { id: userId },
        queue: [
          { data: { id: docId, status: 'draft' }, error: null },
          { data: { role: 'admin' }, error: null },
          { data: null, error: null, count: 0 } as never,
          { data: row, error: null },
        ],
      })
      const originalFrom = client.from
      ;(client as { from: (t: string) => unknown }).from = (table: string) => {
        const base = originalFrom(table) as { insert: (p?: unknown) => unknown }
        const originalInsert = base.insert
        base.insert = (payload?: unknown) => {
          insertSpy(payload)
          return (originalInsert as () => unknown)()
        }
        return base
      }
      createClient.mockResolvedValue(client)
      const { POST } = await loadRoute()
      const res = await POST(
        jsonRequest('http://localhost/api/signature-requests', {
          document_id: docId,
          signer_name: 'A',
          signer_email: 'a@b.co',
        })
      )
      expect(res.status).toBe(201)
      expect(logAudit).toHaveBeenCalled()
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ signer_index: 0 })
      )
    })

    it('assigns signer_index = N when N signers already exist', async () => {
      const row = {
        id: 'cccccccc-cccc-4ccc-cccc-cccccccccccc',
        document_id: docId,
        signer_name: 'B',
        signer_email: 'b@b.co',
      }
      const insertSpy = vi.fn()
      const client = createQueuedSupabaseMock({
        user: { id: userId },
        queue: [
          { data: { id: docId, status: 'draft' }, error: null },
          { data: { role: 'admin' }, error: null },
          { data: null, error: null, count: 1 } as never,
          { data: row, error: null },
        ],
      })
      const originalFrom = client.from
      ;(client as { from: (t: string) => unknown }).from = (table: string) => {
        const base = originalFrom(table) as { insert: (p?: unknown) => unknown }
        const originalInsert = base.insert
        base.insert = (payload?: unknown) => {
          insertSpy(payload)
          return (originalInsert as () => unknown)()
        }
        return base
      }
      createClient.mockResolvedValue(client)
      const { POST } = await loadRoute()
      const res = await POST(
        jsonRequest('http://localhost/api/signature-requests', {
          document_id: docId,
          signer_name: 'B',
          signer_email: 'b@b.co',
        })
      )
      expect(res.status).toBe(201)
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ signer_index: 1 })
      )
    })
  })

  describe('DELETE', () => {
    it('returns 401 without auth', async () => {
      createClient.mockResolvedValue(
        createQueuedSupabaseMock({ user: null, queue: [] })
      )
      const { DELETE } = await loadRoute()
      const res = await DELETE(
        jsonRequest('http://localhost/api/signature-requests', {
          request_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
        })
      )
      expect(res.status).toBe(401)
    })

    it('returns 400 when member has no access to the document (no links → access denied + non-draft path)', async () => {
      const reqId = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'
      // DELETE returns 400 when "no access OR not draft" per route handler
      createClient.mockResolvedValue(
        createQueuedSupabaseMock({
          user: { id: userB },
          queue: queueSignatureRequestDeleteForbiddenNoLinks(docStub({ status: 'draft' })),
        })
      )
      const { DELETE } = await loadRoute()
      const res = await DELETE(
        jsonRequest('http://localhost/api/signature-requests', { request_id: reqId })
      )
      expect(res.status).toBe(400)
    })

    it('removes signer when document draft and accessible', async () => {
      const reqId = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'
      createClient.mockResolvedValue(
        createQueuedSupabaseMock({
          user: { id: userId },
          queue: [
            {
              data: { document_id: docId, signer_email: 's@x.com' },
              error: null,
            },
            { data: { id: docId, status: 'draft' }, error: null },
            { data: { role: 'admin' }, error: null },
            { data: null, error: null },
          ],
        })
      )
      getServiceClient.mockReturnValue(
        createQueuedSupabaseMock({
          user: null,
          queue: [{ data: [], error: null }],
        })
      )
      const { DELETE } = await loadRoute()
      const res = await DELETE(
        jsonRequest('http://localhost/api/signature-requests', { request_id: reqId })
      )
      expect(res.status).toBe(200)
      expect(logAudit).toHaveBeenCalled()
    })

    it('renumbers remaining signers after removal', async () => {
      const reqId = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'
      createClient.mockResolvedValue(
        createQueuedSupabaseMock({
          user: { id: userId },
          queue: [
            {
              data: { document_id: docId, signer_email: 's@x.com' },
              error: null,
            },
            { data: { id: docId, status: 'draft' }, error: null },
            { data: { role: 'admin' }, error: null },
            { data: null, error: null },
          ],
        })
      )
      const updateSpy = vi.fn()
      const serviceClient = createQueuedSupabaseMock({
        user: null,
        queue: [
          {
            data: [
              { id: 'r1', created_at: '2025-01-01T00:00:00Z' },
              { id: 'r2', created_at: '2025-01-02T00:00:00Z' },
            ],
            error: null,
          },
          { data: null, error: null },
          { data: null, error: null },
        ],
      })
      const originalFrom = serviceClient.from
      ;(serviceClient as { from: (t: string) => unknown }).from = (
        table: string
      ) => {
        const base = originalFrom(table) as { update: (p?: unknown) => unknown }
        const originalUpdate = base.update
        base.update = (payload?: unknown) => {
          updateSpy(payload)
          return (originalUpdate as () => unknown)()
        }
        return base
      }
      getServiceClient.mockReturnValue(serviceClient)
      const { DELETE } = await loadRoute()
      const res = await DELETE(
        jsonRequest('http://localhost/api/signature-requests', { request_id: reqId })
      )
      expect(res.status).toBe(200)
      expect(updateSpy).toHaveBeenNthCalledWith(1, { signer_index: 0 })
      expect(updateSpy).toHaveBeenNthCalledWith(2, { signer_index: 1 })
    })
  })
})
