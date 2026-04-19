import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { jsonRequest, routeParams } from '../../helpers/mock-request'
import { userA, userB, adminUser, company1 } from '../../helpers/rbac-fixtures'
import { queueAdminRouteSuccess, queueAdminRouteForbidden } from '../../helpers/compose-route-queue'

const logAudit = vi.fn()
vi.mock('@/lib/audit', () => ({ logAudit }))

const createClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient }))

const userId = userA
const companyId = company1

describe('POST /api/companies', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without auth', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({ user: null, queue: [] })
    )
    const { POST } = await import('@/app/api/companies/route')
    const res = await POST(
      jsonRequest('http://localhost/api/companies', { name: 'Acme' })
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [{ data: { role: 'member' }, error: null }],
      })
    )
    const { POST } = await import('@/app/api/companies/route')
    const res = await POST(
      jsonRequest('http://localhost/api/companies', { name: 'Acme' })
    )
    expect(res.status).toBe(403)
  })

  it('creates company for admin', async () => {
    const row = {
      id: companyId,
      name: 'Acme',
      slug: 'acme',
      created_by: userId,
    }
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [
          { data: { role: 'admin' }, error: null },
          { data: null, error: null },
          { data: row, error: null },
        ],
      })
    )
    const { POST } = await import('@/app/api/companies/route')
    const res = await POST(
      jsonRequest('http://localhost/api/companies', { name: 'Acme' })
    )
    expect(res.status).toBe(201)
    expect(logAudit).toHaveBeenCalled()
  })
})

describe('PATCH /api/companies/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 403 for non-admin', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [{ data: { role: 'member' }, error: null }],
      })
    )
    const { PATCH } = await import('@/app/api/companies/[id]/route')
    const res = await PATCH(
      jsonRequest('http://localhost/api/companies/x', { name: 'X' }),
      routeParams({ id: companyId })
    )
    expect(res.status).toBe(403)
  })
})

describe('GET /api/companies/[id]/members', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without auth', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({ user: null, queue: [] })
    )
    const { GET } = await import('@/app/api/companies/[id]/members/route')
    const res = await GET(
      new NextRequest('http://localhost/members'),
      routeParams({ id: companyId })
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin member', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userB },
        queue: queueAdminRouteForbidden(),
      })
    )
    const { GET } = await import('@/app/api/companies/[id]/members/route')
    const res = await GET(
      new NextRequest('http://localhost/members'),
      routeParams({ id: companyId })
    )
    expect(res.status).toBe(403)
  })

  it('returns 200 for admin', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: adminUser },
        queue: [
          ...queueAdminRouteSuccess(),
          { data: [], error: null }, // company_members select
        ],
      })
    )
    const { GET } = await import('@/app/api/companies/[id]/members/route')
    const res = await GET(
      new NextRequest('http://localhost/members'),
      routeParams({ id: companyId })
    )
    expect(res.status).toBe(200)
  })
})

describe('POST /api/companies/[id]/members', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without auth', async () => {
    createClient.mockResolvedValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const { POST } = await import('@/app/api/companies/[id]/members/route')
    const res = await POST(
      jsonRequest('http://localhost/members', { email: 'a@b.co' }),
      routeParams({ id: companyId })
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin member', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userB },
        queue: queueAdminRouteForbidden(),
      })
    )
    const { POST } = await import('@/app/api/companies/[id]/members/route')
    const res = await POST(
      jsonRequest('http://localhost/members', { email: 'a@b.co' }),
      routeParams({ id: companyId })
    )
    expect(res.status).toBe(403)
  })

  it('returns 404 when target user profile does not exist', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: adminUser },
        queue: [
          ...queueAdminRouteSuccess(),
          { data: { id: companyId, name: 'Acme' }, error: null }, // company lookup
          { data: null, error: null },                             // profiles lookup (not found)
        ],
      })
    )
    const { POST } = await import('@/app/api/companies/[id]/members/route')
    const res = await POST(
      jsonRequest('http://localhost/members', { email: 'unknown@b.co' }),
      routeParams({ id: companyId })
    )
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/companies/[id]/members/[userId]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without auth', async () => {
    createClient.mockResolvedValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const { DELETE } = await import('@/app/api/companies/[id]/members/[userId]/route')
    const res = await DELETE(
      new NextRequest('http://localhost/members/x'),
      routeParams({ id: companyId, userId: userB })
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin member', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userB },
        queue: queueAdminRouteForbidden(),
      })
    )
    const { DELETE } = await import('@/app/api/companies/[id]/members/[userId]/route')
    const res = await DELETE(
      new NextRequest('http://localhost/members/x'),
      routeParams({ id: companyId, userId: userA })
    )
    expect(res.status).toBe(403)
  })
})
