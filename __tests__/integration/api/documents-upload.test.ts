import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { formDataRequest } from '../../helpers/mock-request'

const { fixedDocId } = vi.hoisted(() => ({
  fixedDocId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
}))

vi.mock('crypto', async (importOriginal) => {
  const mod = await importOriginal<typeof import('crypto')>()
  return { ...mod, randomUUID: () => fixedDocId }
})

const logAudit = vi.fn()
vi.mock('@/lib/audit', () => ({ logAudit }))

const createClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient }))

async function loadPost() {
  const { POST } = await import('@/app/api/documents/upload/route')
  return POST
}

const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const companyId = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'

function buildForm(overrides: {
  title?: string
  file?: File
  companyIds?: string[]
  typeNames?: string[]
  omitFile?: boolean
}) {
  const form = new FormData()
  form.set('title', overrides.title ?? 'My doc')
  form.set('description', '')
  if (!overrides.omitFile && overrides.file)
    form.set('file', overrides.file)
  for (const id of overrides.companyIds ?? []) form.append('companyIds', id)
  for (const n of overrides.typeNames ?? []) form.append('typeNames', n)
  return form
}

describe('POST /api/documents/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({ user: null, queue: [] })
    )
    const POST = await loadPost()
    const file = new File([Buffer.from('%PDF-1.4')], 'x.pdf', {
      type: 'application/pdf',
    })
    const res = await POST(
      formDataRequest('http://localhost/api/documents/upload', buildForm({ file }))
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when title empty', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [],
      })
    )
    const POST = await loadPost()
    const file = new File([Buffer.from('%PDF-1.4')], 'x.pdf', {
      type: 'application/pdf',
    })
    const res = await POST(
      formDataRequest(
        'http://localhost/api/documents/upload',
        buildForm({ title: '', file })
      )
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when no file', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({ user: { id: userId }, queue: [] })
    )
    const POST = await loadPost()
    const res = await POST(
      formDataRequest(
        'http://localhost/api/documents/upload',
        buildForm({ omitFile: true })
      )
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when file is not PDF', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({ user: { id: userId }, queue: [] })
    )
    const POST = await loadPost()
    const file = new File([Buffer.from('text')], 'x.txt', { type: 'text/plain' })
    const res = await POST(
      formDataRequest('http://localhost/api/documents/upload', buildForm({ file }))
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when file too large', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({ user: { id: userId }, queue: [] })
    )
    const POST = await loadPost()
    const big = new Uint8Array(50 * 1024 * 1024 + 1)
    const file = new File([big], 'x.pdf', { type: 'application/pdf' })
    const res = await POST(
      formDataRequest('http://localhost/api/documents/upload', buildForm({ file }))
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when selected company does not exist', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [{ data: [], error: null }],
      })
    )
    const POST = await loadPost()
    const file = new File([Buffer.from('%PDF-1.4')], 'x.pdf', {
      type: 'application/pdf',
    })
    const badId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
    const res = await POST(
      formDataRequest(
        'http://localhost/api/documents/upload',
        buildForm({ file, companyIds: [badId] })
      )
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/company|exist/i)
  })

  it('returns 403 when user not member of company', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [
          { data: [{ id: companyId }], error: null },
          { data: { role: 'member' }, error: null },
          { data: null, error: null },
        ],
      })
    )
    const POST = await loadPost()
    const file = new File([Buffer.from('%PDF-1.4')], 'x.pdf', {
      type: 'application/pdf',
    })
    const res = await POST(
      formDataRequest(
        'http://localhost/api/documents/upload',
        buildForm({ file, companyIds: [companyId] })
      )
    )
    expect(res.status).toBe(403)
  })

  it('returns 201 and creates document without companies or types', async () => {
    const newRow = {
      id: fixedDocId,
      title: 'My doc',
      status: 'draft',
      uploaded_by: userId,
    }
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userId },
        queue: [{ data: newRow, error: null }],
      })
    )
    const POST = await loadPost()
    const file = new File([Buffer.from('%PDF-1.4')], 'x.pdf', {
      type: 'application/pdf',
    })
    const res = await POST(
      formDataRequest('http://localhost/api/documents/upload', buildForm({ file }))
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(logAudit).toHaveBeenCalledWith(
      userId,
      'document_uploaded',
      'document',
      fixedDocId,
      expect.any(Object)
    )
  })
})
