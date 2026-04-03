import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { jsonRequest, routeParams } from '../../helpers/mock-request'

const logAudit = vi.fn()
vi.mock('@/lib/audit', () => ({ logAudit }))

const createClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient }))

const userId = '11111111-1111-4111-8111-111111111111'
const docId = '22222222-2222-4222-8222-222222222222'

describe('PATCH /api/documents/[id]/types', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({ user: null, queue: [] })
    )
    const { PATCH } = await import('@/app/api/documents/[id]/types/route')
    const res = await PATCH(
      jsonRequest('http://localhost/api/documents/x/types', { typeNames: [] }),
      routeParams({ id: docId })
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid type names', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({ user: { id: userId }, queue: [] })
    )
    const { PATCH } = await import('@/app/api/documents/[id]/types/route')
    const res = await PATCH(
      jsonRequest('http://localhost/api/documents/x/types', {
        typeNames: ['   '],
      }),
      routeParams({ id: docId })
    )
    expect(res.status).toBe(400)
  })

  it('clears types when empty list', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [
          { data: { id: docId }, error: null },
          { data: { role: 'admin' }, error: null },
          { data: null, error: null },
        ],
      })
    )
    const { PATCH } = await import('@/app/api/documents/[id]/types/route')
    const res = await PATCH(
      jsonRequest('http://localhost/api/documents/x/types', { typeNames: [] }),
      routeParams({ id: docId })
    )
    expect(res.status).toBe(200)
    expect(logAudit).toHaveBeenCalled()
  })
})

describe('PATCH /api/documents/[id]/companies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 403 when forbidden', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [
          { data: { id: docId }, error: null },
          { data: { role: 'member' }, error: null },
          { data: null, error: null },
          { data: [], error: null },
        ],
      })
    )
    const { PATCH } = await import('@/app/api/documents/[id]/companies/route')
    const res = await PATCH(
      jsonRequest('http://localhost/api/documents/x/companies', {
        companyIds: [],
      }),
      routeParams({ id: docId })
    )
    expect(res.status).toBe(403)
  })

  it('updates companies when admin', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [
          { data: { id: docId }, error: null },
          { data: { role: 'admin' }, error: null },
          { data: null, error: null },
        ],
      })
    )
    const { PATCH } = await import('@/app/api/documents/[id]/companies/route')
    const res = await PATCH(
      jsonRequest('http://localhost/api/documents/x/companies', { companyIds: [] }),
      routeParams({ id: docId })
    )
    expect(res.status).toBe(200)
  })
})
