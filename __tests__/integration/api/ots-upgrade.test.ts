import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { jsonRequest } from '../../helpers/mock-request'

const logAudit = vi.fn()
const getServiceClient = vi.fn()

vi.mock('@/lib/audit', () => ({ logAudit }))
vi.mock('@/lib/supabase/service', () => ({ getServiceClient }))
vi.mock('@/lib/config', () => ({
  getConfig: () => ({
    OTS_CRON_SECRET: 'super-secret-token-1234',
    OTS_CALENDAR_URLS: undefined,
    EVIDENCE_HMAC_KEY: 'a'.repeat(64),
  }),
}))

// Mock the timestamps module to avoid real network calls.
vi.mock('@/lib/esigning/timestamps', () => ({
  stampHash: vi.fn().mockResolvedValue(Buffer.from('mock-proof-bytes')),
  upgradeProof: vi.fn().mockResolvedValue({
    proofBytes: Buffer.from('mock-upgraded-proof'),
    confirmed: true,
    bitcoinBlock: 800000,
  }),
}))

async function loadPost() {
  const { POST } = await import('@/app/api/internal/ots/upgrade/route')
  return POST
}

function authRequest() {
  return jsonRequest('http://localhost/api/internal/ots/upgrade', {}, {
    headers: { 'x-cron-secret': 'super-secret-token-1234' },
  })
}

function unauthRequest() {
  return jsonRequest('http://localhost/api/internal/ots/upgrade', {})
}

describe('POST /api/internal/ots/upgrade', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without correct x-cron-secret', async () => {
    getServiceClient.mockReturnValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const POST = await loadPost()
    const res = await POST(unauthRequest())
    expect(res.status).toBe(401)
  })

  it('runs phase 1 (stamp) and phase 2 (upgrade) and returns results', async () => {
    const sigId = 'sig-111'
    const docId = 'doc-222'

    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          // Phase 1 fetch (unstamped)
          {
            data: [{ id: sigId, evidence_mac: 'a'.repeat(64), signature_requests: { document_id: docId } }],
            error: null,
          },
          // Phase 1 update (store proof)
          { data: null, error: null },
          // Phase 2 fetch (pending upgrade) — none
          { data: [], error: null },
        ],
      })
    )

    const POST = await loadPost()
    const res = await POST(authRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.results.phase1).toBe(1)
    expect(body.results.phase2_confirmed).toBe(0)
    expect(logAudit).toHaveBeenCalledWith(null, 'ots_stamped', 'document', docId, expect.any(Object))
  })

  it('handles phase 2 confirmation (bitcoinBlock present)', async () => {
    const sigId = 'sig-333'
    const docId = 'doc-444'

    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          // Phase 1 fetch — none
          { data: [], error: null },
          // Phase 2 fetch (has proof, pending)
          {
            data: [{ id: sigId, ots_proof: '\\x' + Buffer.from('pending-proof').toString('hex'), signature_requests: { document_id: docId } }],
            error: null,
          },
          // Phase 2 update (confirmed)
          { data: null, error: null },
        ],
      })
    )

    const POST = await loadPost()
    const res = await POST(authRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results.phase2_confirmed).toBe(1)
    expect(logAudit).toHaveBeenCalledWith(null, 'ots_confirmed', 'document', docId, expect.objectContaining({ bitcoin_block: 800000 }))
  })
})
