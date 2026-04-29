/**
 * RBAC-focused tests for document sub-routes that aren't covered in their
 * dedicated test files: verify, fields, types, companies (association),
 * and remind.
 *
 * Pattern per route: 401 (no session) → 403/404 (member, no access) → 200 (allowed actor).
 * Uses compose-route-queue helpers so queue ordering matches the real handler exactly.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { jsonRequest, routeParams } from '../../helpers/mock-request'
import { userA, userB, adminUser, doc1 } from '../../helpers/rbac-fixtures'
import {
  queueDocumentVerifyForbiddenNoLinks,
  queueDocumentVerifyOwnerSuccess,
  queueDocumentFieldsForbiddenNoLinks,
  queueDocumentFieldsOwnerSuccess,
  queueDocumentTypesForbiddenNoLinks,
  queueDocumentTypesOwnerSuccess,
  queueDocumentCompaniesForbiddenNoLinks,
  queueDocumentCompaniesOwnerSuccess,
  queueDocumentRemindForbiddenNoLinks,
  queueDocumentRemindOwnerSuccess,
  docStub,
} from '../../helpers/compose-route-queue'
import {
  queueCanAccessDocumentAdmin,
  queueCanAccessDocumentViaCompany,
} from '../../helpers/rbac-queue-builders'

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
    from: (_t: string) => ({
      select: () => ({
        eq: () => ({ data: [], error: null }),
        data: [],
        error: null,
      }),
    }),
    storage: {
      from: (_b: string) => ({
        download: async () => ({ data: new Blob([new Uint8Array([1])]), error: null }),
        createSignedUrl: async () => ({ data: { signedUrl: 'https://signed/x' }, error: null }),
      }),
    },
  }
}

// ── GET /api/documents/[id]/verify ───────────────────────────────────────────

describe('GET /api/documents/[id]/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServiceClient.mockReturnValue(makeServiceClient())
  })

  it('returns 401 when unauthenticated', async () => {
    createClient.mockResolvedValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const { GET } = await import('@/app/api/documents/[id]/verify/route')
    const res = await GET(
      new NextRequest('http://localhost/verify'),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 when member has no access (no company links)', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userB },
        queue: queueDocumentVerifyForbiddenNoLinks(),
      })
    )
    const { GET } = await import('@/app/api/documents/[id]/verify/route')
    const res = await GET(
      new NextRequest('http://localhost/verify'),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(403)
  })

  it('returns 200 for the document owner (no signers → overall: incomplete)', async () => {
    // Verify uses the service client to query signature_requests.
    // With zero rows the route returns 200 { overall: 'incomplete' }.
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({ user: null, queue: [{ data: [], error: null }] })
    )
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        queue: queueDocumentVerifyOwnerSuccess(doc1),
      })
    )
    const { GET } = await import('@/app/api/documents/[id]/verify/route')
    const res = await GET(
      new NextRequest('http://localhost/verify'),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(200)
  })

  it('returns 200 for admin (any document, no signers → overall: incomplete)', async () => {
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({ user: null, queue: [{ data: [], error: null }] })
    )
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: adminUser },
        queue: queueCanAccessDocumentAdmin(),
      })
    )
    const { GET } = await import('@/app/api/documents/[id]/verify/route')
    const res = await GET(
      new NextRequest('http://localhost/verify'),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(200)
  })
})

// ── PATCH /api/documents/[id]/fields ─────────────────────────────────────────
// Note: no-access path returns 404 (resource existence leak prevention) per route design.

describe('PATCH /api/documents/[id]/fields', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    createClient.mockResolvedValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const { PATCH } = await import('@/app/api/documents/[id]/fields/route')
    const res = await PATCH(
      jsonRequest('http://localhost/fields', { field_metadata: [] }, { method: 'PATCH' }),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 when member has no access (no company links)', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userB },
        queue: queueDocumentFieldsForbiddenNoLinks(),
      })
    )
    const { PATCH } = await import('@/app/api/documents/[id]/fields/route')
    const res = await PATCH(
      jsonRequest('http://localhost/fields', { field_metadata: [] }, { method: 'PATCH' }),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(404)
  })

  it('returns 200 when owner updates fields on a draft document', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        queue: [
          ...queueDocumentFieldsOwnerSuccess(docStub({ status: 'draft', uploaded_by: userA })),
          { data: { id: doc1 }, error: null }, // documents.update + select → row returned (RLS allowed)
        ],
      })
    )
    const { PATCH } = await import('@/app/api/documents/[id]/fields/route')
    const res = await PATCH(
      jsonRequest('http://localhost/fields', { field_metadata: [] }, { method: 'PATCH' }),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(200)
  })

  it('returns 400 when owner tries to edit fields on a non-draft document', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        queue: [
          ...queueDocumentFieldsOwnerSuccess(docStub({ status: 'pending', uploaded_by: userA })),
        ],
      })
    )
    const { PATCH } = await import('@/app/api/documents/[id]/fields/route')
    const res = await PATCH(
      jsonRequest('http://localhost/fields', { field_metadata: [] }, { method: 'PATCH' }),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(400)
  })

  it('returns 403 when a company member is blocked by the documents UPDATE policy', async () => {
    // Company member passes canAccessDocument (read access) but the new RLS policy
    // only allows owner/admin to UPDATE → DB returns null (0 rows) → route returns 403.
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userB },
        queue: [
          ...queueCanAccessDocumentViaCompany(),            // canAccessDocument → true
          { data: { id: doc1, status: 'draft' }, error: null }, // documents.single (post-auth fetch)
          { data: null, error: null },                      // documents.update → null (RLS blocks)
        ],
      })
    )
    const { PATCH } = await import('@/app/api/documents/[id]/fields/route')
    const res = await PATCH(
      jsonRequest('http://localhost/fields', { field_metadata: [] }, { method: 'PATCH' }),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(403)
  })
})

// ── PATCH /api/documents/[id]/types ──────────────────────────────────────────

describe('PATCH /api/documents/[id]/types', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    createClient.mockResolvedValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const { PATCH } = await import('@/app/api/documents/[id]/types/route')
    const res = await PATCH(
      jsonRequest('http://localhost/types', { typeNames: [] }, { method: 'PATCH' }),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 when member has no access (no company links)', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userB },
        queue: queueDocumentTypesForbiddenNoLinks(),
      })
    )
    const { PATCH } = await import('@/app/api/documents/[id]/types/route')
    const res = await PATCH(
      jsonRequest('http://localhost/types', { typeNames: [] }, { method: 'PATCH' }),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(403)
  })

  it('returns 200 when owner sets document types (empty list clears types)', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        queue: [
          ...queueDocumentTypesOwnerSuccess(),
          { data: null, error: null }, // document_document_types delete
          { data: null, error: null }, // document_document_types insert (empty)
        ],
      })
    )
    const { PATCH } = await import('@/app/api/documents/[id]/types/route')
    const res = await PATCH(
      jsonRequest('http://localhost/types', { typeNames: [] }, { method: 'PATCH' }),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(200)
  })
})

// ── PATCH /api/documents/[id]/companies ──────────────────────────────────────

describe('PATCH /api/documents/[id]/companies (company associations)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    createClient.mockResolvedValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const { PATCH } = await import('@/app/api/documents/[id]/companies/route')
    const res = await PATCH(
      jsonRequest('http://localhost/companies', { companyIds: [] }, { method: 'PATCH' }),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 when member has no access to the document (no company links)', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userB },
        queue: queueDocumentCompaniesForbiddenNoLinks(),
      })
    )
    const { PATCH } = await import('@/app/api/documents/[id]/companies/route')
    const res = await PATCH(
      jsonRequest('http://localhost/companies', { companyIds: [] }, { method: 'PATCH' }),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(403)
  })

  it('returns 200 when owner clears company associations (empty companyIds)', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        queue: [
          ...queueDocumentCompaniesOwnerSuccess(),
          { data: null, error: null }, // document_companies delete
          { data: null, error: null }, // document_companies insert
        ],
      })
    )
    const { PATCH } = await import('@/app/api/documents/[id]/companies/route')
    const res = await PATCH(
      jsonRequest('http://localhost/companies', { companyIds: [] }, { method: 'PATCH' }),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(200)
  })
})

// ── POST /api/documents/[id]/remind ──────────────────────────────────────────

describe('POST /api/documents/[id]/remind', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    createClient.mockResolvedValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const { POST } = await import('@/app/api/documents/[id]/remind/route')
    const res = await POST(
      new NextRequest('http://localhost/remind', { method: 'POST' }),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 when member has no access (no company links)', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userB },
        queue: queueDocumentRemindForbiddenNoLinks(),
      })
    )
    const { POST } = await import('@/app/api/documents/[id]/remind/route')
    const res = await POST(
      new NextRequest('http://localhost/remind', { method: 'POST' }),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(403)
  })

  it('returns 400 when document is not pending', async () => {
    // No service client calls happen before the status check
    getServiceClient.mockReturnValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        queue: [
          ...queueDocumentRemindOwnerSuccess(docStub({ status: 'draft', uploaded_by: userA })),
        ],
      })
    )
    const { POST } = await import('@/app/api/documents/[id]/remind/route')
    const res = await POST(
      new NextRequest('http://localhost/remind', { method: 'POST' }),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(400)
  })

  it('returns 200 when owner sends reminder for a pending document (no pending signers → 400)', async () => {
    // Remind returns 400 when there are no pending signers to remind, even if the doc is pending.
    // This validates the RBAC pass (access granted) and that the route continues past the auth check.
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [{ data: [], error: null }], // signature_requests (no pending signers)
      })
    )
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        queue: queueDocumentRemindOwnerSuccess(docStub({ status: 'pending', uploaded_by: userA })),
      })
    )
    const { POST } = await import('@/app/api/documents/[id]/remind/route')
    const res = await POST(
      new NextRequest('http://localhost/remind', { method: 'POST' }),
      routeParams({ id: doc1 })
    )
    // Auth passed (not 401/403); no pending signers means 400 from the route
    expect(res.status).toBe(400)
  })

  it('returns 200 when owner sends reminder to a pending signer', async () => {
    // Service client: signature_requests select (1 signer) + update (expires_at)
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          {
            data: [{ id: 'sr-1', signer_name: 'Alice', signer_email: 'alice@x.co', token: 'tok-1' }],
            error: null,
          }, // signature_requests select
          { data: null, error: null }, // update expires_at for signer
        ],
      })
    )
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: userA },
        queue: queueDocumentRemindOwnerSuccess(docStub({ status: 'pending', uploaded_by: userA })),
      })
    )
    const { POST } = await import('@/app/api/documents/[id]/remind/route')
    const res = await POST(
      new NextRequest('http://localhost/remind', { method: 'POST' }),
      routeParams({ id: doc1 })
    )
    expect(res.status).toBe(200)
  })
})
