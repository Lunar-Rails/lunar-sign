import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { jsonRequest, routeParams } from '../../helpers/mock-request'

const logAudit = vi.fn()
vi.mock('@/lib/audit', () => ({ logAudit }))

const createClient = vi.fn()
const getServiceClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient }))
vi.mock('@/lib/supabase/service', () => ({ getServiceClient }))

const adminId = '11111111-1111-4111-8111-111111111111'
const targetUserId = '22222222-2222-4222-8222-222222222222'
const inviteId = '33333333-3333-4333-8333-333333333333'

describe('DELETE /api/admin/invitations/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without session', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({ user: null, queue: [] })
    )
    const { DELETE } = await import('@/app/api/admin/invitations/[id]/route')
    const res = await DELETE(
      new NextRequest('http://localhost/x'),
      routeParams({ id: inviteId })
    )
    expect(res!.status).toBe(401)
  })

  it('revokes pending invitation', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: adminId },
        queue: [{ data: { role: 'admin' }, error: null }],
      })
    )
    getServiceClient.mockReturnValue({
      from: () => ({
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => ({
                maybeSingle: async () => ({
                  data: { id: inviteId, email: 'x@y.com' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    })
    const { DELETE } = await import('@/app/api/admin/invitations/[id]/route')
    const res = await DELETE(
      new NextRequest('http://localhost/x'),
      routeParams({ id: inviteId })
    )
    expect(res!.status).toBe(200)
    expect(logAudit).toHaveBeenCalledWith(
      adminId,
      'invitation_revoked',
      'invitation',
      inviteId,
      expect.any(Object)
    )
  })
})

describe('PATCH /api/admin/users/[id]/role', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 for invalid role', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: adminId },
        queue: [{ data: { role: 'admin' }, error: null }],
      })
    )
    const { PATCH } = await import('@/app/api/admin/users/[id]/role/route')
    const res = await PATCH(
      jsonRequest('http://localhost/role', { role: 'superuser' }),
      routeParams({ id: targetUserId })
    )
    expect(res!.status).toBe(400)
  })

  it('updates role via service client', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: adminId },
        queue: [{ data: { role: 'admin' }, error: null }],
      })
    )
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [{ data: null, error: null }],
      })
    )
    const { PATCH } = await import('@/app/api/admin/users/[id]/role/route')
    const res = await PATCH(
      jsonRequest('http://localhost/role', { role: 'member' }),
      routeParams({ id: targetUserId })
    )
    expect(res!.status).toBe(200)
    expect(logAudit).toHaveBeenCalled()
  })
})
