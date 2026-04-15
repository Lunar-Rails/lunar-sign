import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { formDataRequest } from '../../helpers/mock-request'

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }))

const createClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient }))

async function loadPost() {
  const { POST } = await import('@/app/api/templates/route')
  return POST
}

describe('POST /api/templates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    createClient.mockResolvedValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const POST = await loadPost()
    const form = new FormData()
    form.set('title', 'T')
    form.set('file', new File([Buffer.from('%PDF')], 'a.pdf', { type: 'application/pdf' }))
    const res = await POST(formDataRequest('http://localhost/api/templates', form))
    expect(res.status).toBe(401)
  })

  it('returns 400 when title empty', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({ user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }, queue: [] })
    )
    const POST = await loadPost()
    const form = new FormData()
    form.set('title', '')
    form.set('file', new File([Buffer.from('%PDF')], 'a.pdf', { type: 'application/pdf' }))
    const res = await POST(formDataRequest('http://localhost/api/templates', form))
    expect(res.status).toBe(400)
  })

  it('returns 400 when a required signer slot has no assigned fields', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
        queue: [],
      })
    )
    const POST = await loadPost()
    const form = new FormData()
    form.set('title', 'Two signer template')
    form.set('file', new File([Buffer.from('%PDF')], 'a.pdf', { type: 'application/pdf' }))
    form.set('signer_count', '2')
    form.set(
      'field_metadata',
      JSON.stringify([
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
      ])
    )
    const res = await POST(formDataRequest('http://localhost/api/templates', form))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Signer 2/)
    expect(body.missing_signer_indexes).toEqual([1])
  })
})
