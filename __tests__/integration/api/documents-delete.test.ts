import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }))

const createClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient }))

async function loadDelete() {
  const { DELETE } = await import('@/app/api/documents/[id]/route')
  return DELETE
}

describe('DELETE /api/documents/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    createClient.mockResolvedValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const DELETE = await loadDelete()
    const res = await DELETE(
      new Request('http://localhost/api/documents/x'),
      { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) }
    )
    expect(res.status).toBe(401)
  })
})
