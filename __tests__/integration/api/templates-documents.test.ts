import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { jsonRequest } from '../../helpers/mock-request'

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }))

const createClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient }))

async function loadPost() {
  const { POST } = await import('@/app/api/templates/[id]/documents/route')
  return POST
}

describe('POST /api/templates/[id]/documents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    createClient.mockResolvedValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const POST = await loadPost()
    const res = await POST(
      jsonRequest('http://localhost/api/templates/x/documents', {
        title: 'D',
        signers: [{ signer_name: 'A', signer_email: 'a@b.co' }],
      }),
      { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) }
    )
    expect(res.status).toBe(401)
  })
})
