import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { jsonRequest } from '../../helpers/mock-request'

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({
  getServiceClient: () => ({
    storage: {
      from: () => ({
        download: vi.fn().mockResolvedValue({ data: new Blob(['%PDF']), error: null }),
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({}),
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          data: [],
          error: null,
        }),
      }),
    }),
  }),
}))
vi.mock('@/lib/email/client', () => ({ sendEmail: vi.fn() }))
vi.mock('@/lib/config', () => ({
  getConfig: () => ({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000' }),
}))

const createClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient }))

const TEMPLATE_ID = '550e8400-e29b-41d4-a716-446655440000'
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

const baseTemplate = {
  id: TEMPLATE_ID,
  title: 'Test Template',
  file_path: 'templates/x/original.pdf',
  field_metadata: [],
  document_type_id: null,
  signer_count: 1,
  template_companies: [],
}

const twoSignerTemplate = { ...baseTemplate, signer_count: 2 }

async function loadPost() {
  const { POST } = await import('@/app/api/templates/[id]/documents/route')
  return POST
}

describe('POST /api/templates/[id]/documents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns 401 when unauthenticated', async () => {
    createClient.mockResolvedValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const POST = await loadPost()
    const res = await POST(
      jsonRequest(`http://localhost/api/templates/${TEMPLATE_ID}/documents`, {
        title: 'D',
        signers: [{ signer_name: 'A', signer_email: 'a@b.co' }],
      }),
      { params: Promise.resolve({ id: TEMPLATE_ID }) }
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when wrong signer count (1 instead of 2)', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: USER_ID },
        queue: [
          // canAccessTemplate: isAdmin profiles check → not admin
          { data: null, error: null },
          // canAccessTemplate: templates ownership → is owner (returns access)
          { data: { id: TEMPLATE_ID }, error: null },
          // main route: template fetch with signer_count
          { data: twoSignerTemplate, error: null },
        ],
      })
    )
    const POST = await loadPost()
    const res = await POST(
      jsonRequest(`http://localhost/api/templates/${TEMPLATE_ID}/documents`, {
        title: 'D',
        signers: [{ signer_name: 'A', signer_email: 'a@b.co' }],
        field_values: {},
      }),
      { params: Promise.resolve({ id: TEMPLATE_ID }) }
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/2 signer/)
  })

  it('returns 400 when wrong signer count (2 instead of 1)', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: USER_ID },
        queue: [
          // canAccessTemplate: isAdmin profiles check → not admin
          { data: null, error: null },
          // canAccessTemplate: templates ownership → is owner
          { data: { id: TEMPLATE_ID }, error: null },
          // main route: template fetch with signer_count
          { data: baseTemplate, error: null },
        ],
      })
    )
    const POST = await loadPost()
    const res = await POST(
      jsonRequest(`http://localhost/api/templates/${TEMPLATE_ID}/documents`, {
        title: 'D',
        signers: [
          { signer_name: 'A', signer_email: 'a@b.co' },
          { signer_name: 'B', signer_email: 'b@b.co' },
        ],
        field_values: {},
      }),
      { params: Promise.resolve({ id: TEMPLATE_ID }) }
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/1 signer/)
  })
})
