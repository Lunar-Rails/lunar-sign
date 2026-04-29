import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { userA, userB, adminUser, tmpl1 } from '../../helpers/rbac-fixtures'
import {
  queueTemplateDeleteForbiddenNoLinks,
  queueTemplateDeleteCreatorSuccess,
  queueTemplateDeleteAdminSuccess,
  queueTemplateDeleteViaCompanyDenied,
  tmplStub,
} from '../../helpers/compose-route-queue'

const logAudit = vi.fn()
vi.mock('@/lib/audit', () => ({ logAudit }))

const createClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient }))

async function loadGet() {
  const { GET } = await import('@/app/api/templates/[id]/route')
  return GET
}

async function loadPut() {
  const { PUT } = await import('@/app/api/templates/[id]/route')
  return PUT
}

async function loadDelete() {
  const { DELETE } = await import('@/app/api/templates/[id]/route')
  return DELETE
}

describe('GET /api/templates/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    createClient.mockResolvedValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const GET = await loadGet()
    const res = await GET(
      new NextRequest('http://localhost/api/templates/x'),
      { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) }
    )
    expect(res.status).toBe(401)
  })
})

// ── DELETE /api/templates/[id] ───────────────────────────────────────────────

describe('DELETE /api/templates/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    createClient.mockResolvedValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const DELETE = await loadDelete()
    const res = await DELETE(
      new NextRequest('http://localhost/api/templates/x', { method: 'DELETE' }),
      { params: Promise.resolve({ id: tmpl1 }) }
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 when member has no access (no company links)', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userB },
        queue: queueTemplateDeleteForbiddenNoLinks(),
      })
    )
    const DELETE = await loadDelete()
    const res = await DELETE(
      new NextRequest('http://localhost/api/templates/x', { method: 'DELETE' }),
      { params: Promise.resolve({ id: tmpl1 }) }
    )
    expect(res.status).toBe(403)
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('returns 200 when the template creator soft-deletes their template', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        queue: queueTemplateDeleteCreatorSuccess(tmplStub({ created_by: userA })),
      })
    )
    const DELETE = await loadDelete()
    const res = await DELETE(
      new NextRequest('http://localhost/api/templates/x', { method: 'DELETE' }),
      { params: Promise.resolve({ id: tmpl1 }) }
    )
    expect(res.status).toBe(200)
    expect(logAudit).toHaveBeenCalledWith(
      userA,
      'template_deleted',
      'template',
      tmpl1,
      expect.any(Object)
    )
  })

  it('returns 200 when an admin soft-deletes any template', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: adminUser },
        queue: queueTemplateDeleteAdminSuccess(),
      })
    )
    const DELETE = await loadDelete()
    const res = await DELETE(
      new NextRequest('http://localhost/api/templates/x', { method: 'DELETE' }),
      { params: Promise.resolve({ id: tmpl1 }) }
    )
    expect(res.status).toBe(200)
    expect(logAudit).toHaveBeenCalledWith(
      adminUser,
      'template_deleted',
      'template',
      tmpl1,
      expect.any(Object)
    )
  })

  it('returns 403 when a company member is blocked by the templates UPDATE policy', async () => {
    // Company member has read access (canAccessTemplate returns true) but the new RLS
    // policy only allows the creator or admin to UPDATE → route returns 403.
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userB },
        queue: queueTemplateDeleteViaCompanyDenied(),
      })
    )
    const DELETE = await loadDelete()
    const res = await DELETE(
      new NextRequest('http://localhost/api/templates/x', { method: 'DELETE' }),
      { params: Promise.resolve({ id: tmpl1 }) }
    )
    expect(res.status).toBe(403)
    expect(logAudit).not.toHaveBeenCalled()
  })
})

// ── PUT /api/templates/[id] ───────────────────────────────────────────────────

describe('PUT /api/templates/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when updating to a signer count with an empty signer slot', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
        queue: [
          { data: null, error: null },
          { data: { id: '550e8400-e29b-41d4-a716-446655440000' }, error: null },
          {
            data: {
              signer_count: 1,
              field_metadata: [
                {
                  id: 'signer-1',
                  type: 'signature',
                  pageIndex: 0,
                  xPercent: 10,
                  yPercent: 10,
                  widthPercent: 20,
                  heightPercent: 5,
                  label: 'Signer 1 Signature',
                  forSigner: true,
                  signerIndex: 0,
                },
              ],
            },
            error: null,
          },
        ],
      })
    )
    const PUT = await loadPut()
    const res = await PUT(
      new NextRequest('http://localhost/api/templates/x', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signer_count: 2 }),
      }),
      { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) }
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Signer 2/)
    expect(body.missing_signer_indexes).toEqual([1])
  })
})
