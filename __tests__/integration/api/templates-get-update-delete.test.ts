import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }))

const createClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient }))

async function loadGet() {
  const { GET } = await import('@/app/api/templates/[id]/route')
  return GET
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
