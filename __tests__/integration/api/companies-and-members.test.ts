import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { jsonRequest, routeParams } from '../../helpers/mock-request'

const logAudit = vi.fn()
vi.mock('@/lib/audit', () => ({ logAudit }))

const createClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient }))

const userId = '11111111-1111-4111-8111-111111111111'
const companyId = '22222222-2222-4222-8222-222222222222'

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
})
