import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'

const createClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient }))

const userId = '11111111-1111-4111-8111-111111111111'

describe('GET /api/document-types', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without auth', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({ user: null, queue: [] })
    )
    const { GET } = await import('@/app/api/document-types/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns document types', async () => {
    const types = [{ id: 't1', name: 'A', created_by: userId, created_at: '' }]
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [{ data: types, error: null }],
      })
    )
    const { GET } = await import('@/app/api/document-types/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.documentTypes).toEqual(types)
  })
})
