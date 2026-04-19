/**
 * RBAC-focused tests for template routes: preview, documents (create from template),
 * and the template GET/PUT (403/access paths).
 *
 * Pattern: 401 (no session) → 403 (no access) → 200/201 (allowed actor).
 */
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { jsonRequest, routeParams } from '../../helpers/mock-request'
import { userA, userB, adminUser, tmpl1 } from '../../helpers/rbac-fixtures'
import {
  queueTemplatePreviewForbiddenNoLinks,
  queueTemplatePreviewCreatorSuccess,
  queueTemplatePreviewAdminSuccess,
  queueTemplatePreviewViaCompanySuccess,
  queueTemplateCreateDocForbiddenNoLinks,
  queueTemplateCreateDocAdminSuccess,
  tmplStub,
} from '../../helpers/compose-route-queue'
import { queueCanAccessTemplateDeniedNotMember } from '../../helpers/rbac-queue-builders'

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }))
vi.mock('@/lib/email/client', () => ({ sendEmail: vi.fn().mockResolvedValue(true) }))

vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn(() => ({ sendMail: vi.fn().mockResolvedValue(undefined) })) },
}))

vi.mock('@/lib/config', () => ({
  getConfig: () => ({
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    EMAIL_FROM: 'noreply@example.com',
    EVIDENCE_HMAC_KEY: 'a'.repeat(64),
    CONSENT_TEXT_VERSION: '2026-04-16',
    OTS_CRON_SECRET: 'test-secret',
  }),
}))

const createClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient }))

const getServiceClient = vi.fn()
vi.mock('@/lib/supabase/service', () => ({ getServiceClient }))

function makeServiceClient() {
  return {
    storage: {
      from: (_b: string) => ({
        download: async () => ({ data: new Blob([new Uint8Array([1])]), error: null }),
        upload: async () => ({ data: { path: 'mock' }, error: null }),
        copy: async () => ({ data: { path: 'mock' }, error: null }),
        remove: async () => ({ data: null, error: null }),
        createSignedUrl: async () => ({ data: { signedUrl: 'https://signed/x' }, error: null }),
      }),
    },
    from: (_t: string) => ({
      select: () => ({ eq: () => ({ data: [], error: null }), data: [], error: null }),
      insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'new-doc' }, error: null }) }) }),
      update: () => ({ eq: () => ({ data: null, error: null }) }),
    }),
  }
}

// ── GET /api/templates/[id]/preview ──────────────────────────────────────────

describe('GET /api/templates/[id]/preview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServiceClient.mockReturnValue(makeServiceClient())
  })

  it('returns 401 when unauthenticated', async () => {
    createClient.mockResolvedValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const { GET } = await import('@/app/api/templates/[id]/preview/route')
    const res = await GET(
      new Request('http://localhost/preview'),
      routeParams({ id: tmpl1 })
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 when template does not exist', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        queue: [{ data: null, error: null }],
      })
    )
    const { GET } = await import('@/app/api/templates/[id]/preview/route')
    const res = await GET(
      new Request('http://localhost/preview'),
      routeParams({ id: tmpl1 })
    )
    expect(res.status).toBe(404)
  })

  it('returns 403 when member has no access (no company links)', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userB },
        queue: queueTemplatePreviewForbiddenNoLinks(),
      })
    )
    const { GET } = await import('@/app/api/templates/[id]/preview/route')
    const res = await GET(
      new Request('http://localhost/preview'),
      routeParams({ id: tmpl1 })
    )
    expect(res.status).toBe(403)
  })

  it('returns 403 when member is in a different company (not linked to template)', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userB },
        queue: [
          { data: tmplStub(), error: null },
          ...queueCanAccessTemplateDeniedNotMember(),
        ],
      })
    )
    const { GET } = await import('@/app/api/templates/[id]/preview/route')
    const res = await GET(
      new Request('http://localhost/preview'),
      routeParams({ id: tmpl1 })
    )
    expect(res.status).toBe(403)
  })

  it('returns 200 for the template creator', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        queue: queueTemplatePreviewCreatorSuccess(tmplStub({ created_by: userA })),
      })
    )
    const { GET } = await import('@/app/api/templates/[id]/preview/route')
    const res = await GET(
      new Request('http://localhost/preview'),
      routeParams({ id: tmpl1 })
    )
    expect(res.status).toBe(200)
  })

  it('returns 200 for admin (any template)', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: adminUser },
        queue: queueTemplatePreviewAdminSuccess(),
      })
    )
    const { GET } = await import('@/app/api/templates/[id]/preview/route')
    const res = await GET(
      new Request('http://localhost/preview'),
      routeParams({ id: tmpl1 })
    )
    expect(res.status).toBe(200)
  })

  it('returns 200 for a company member linked to the template', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userB },
        queue: queueTemplatePreviewViaCompanySuccess(),
      })
    )
    const { GET } = await import('@/app/api/templates/[id]/preview/route')
    const res = await GET(
      new Request('http://localhost/preview'),
      routeParams({ id: tmpl1 })
    )
    expect(res.status).toBe(200)
  })
})

// ── GET /api/templates/[id] ───────────────────────────────────────────────────

describe('GET /api/templates/[id] — RBAC paths', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    createClient.mockResolvedValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const { GET } = await import('@/app/api/templates/[id]/route')
    const res = await GET(
      new NextRequest('http://localhost/api/templates/x'),
      routeParams({ id: tmpl1 })
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 when template does not exist', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        // GET template/[id]: first query is templates.maybeSingle, returns null
        queue: [{ data: null, error: null }],
      })
    )
    const { GET } = await import('@/app/api/templates/[id]/route')
    const res = await GET(
      new NextRequest('http://localhost/api/templates/x'),
      routeParams({ id: tmpl1 })
    )
    expect(res.status).toBe(404)
  })

  it('returns 403 when member has no access (no company links)', async () => {
    // GET /api/templates/[id]: templates.maybeSingle → canAccessTemplate
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userB },
        queue: [
          { data: tmplStub(), error: null },          // templates.maybeSingle
          ...queueTemplatePreviewForbiddenNoLinks().slice(1), // canAccessTemplate (skip first which is the tmpl stub)
        ],
      })
    )
    // Rebuild: template fetch + access denied
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userB },
        queue: [
          { data: tmplStub(), error: null },
          { data: { role: 'member' }, error: null },  // profiles
          { data: null, error: null },                 // templates (not creator)
          { data: [], error: null },                   // template_companies (no links)
        ],
      })
    )
    const { GET } = await import('@/app/api/templates/[id]/route')
    const res = await GET(
      new NextRequest('http://localhost/api/templates/x'),
      routeParams({ id: tmpl1 })
    )
    expect(res.status).toBe(403)
  })
})

// ── POST /api/templates/[id]/documents ───────────────────────────────────────

describe('POST /api/templates/[id]/documents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServiceClient.mockReturnValue(makeServiceClient())
  })

  it('returns 401 when unauthenticated', async () => {
    createClient.mockResolvedValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const { POST } = await import('@/app/api/templates/[id]/documents/route')
    const res = await POST(
      jsonRequest('http://localhost/api/templates/x/documents', {
        title: 'Test',
        field_values: {},
        signers: [{ signer_name: 'A', signer_email: 'a@b.co' }],
        send_now: false,
      }),
      routeParams({ id: tmpl1 })
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 when member has no access to the template (no company links)', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userB },
        queue: queueTemplateCreateDocForbiddenNoLinks(),
      })
    )
    const { POST } = await import('@/app/api/templates/[id]/documents/route')
    const res = await POST(
      jsonRequest('http://localhost/api/templates/x/documents', {
        title: 'Test',
        field_values: {},
        signers: [{ signer_name: 'A', signer_email: 'a@b.co' }],
        send_now: false,
      }),
      routeParams({ id: tmpl1 })
    )
    expect(res.status).toBe(403)
  })

  it('returns 400 when admin sends invalid body (admin has template access)', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: adminUser },
        queue: queueTemplateCreateDocAdminSuccess(),
      })
    )
    const { POST } = await import('@/app/api/templates/[id]/documents/route')
    const res = await POST(
      jsonRequest('http://localhost/api/templates/x/documents', {}),
      routeParams({ id: tmpl1 })
    )
    // Body is invalid (missing required fields) → 400 after auth passes
    expect(res.status).toBe(400)
  })
})
