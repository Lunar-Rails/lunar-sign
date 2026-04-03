import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueuedSupabaseMock } from '../../helpers/mock-supabase'
import { jsonRequest } from '../../helpers/mock-request'

const logAudit = vi.fn()
vi.mock('@/lib/audit', () => ({ logAudit }))

const sendEmail = vi.fn()
vi.mock('@/lib/email/client', () => ({ sendEmail }))

const createClient = vi.fn()
const getServiceClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient }))
vi.mock('@/lib/supabase/service', () => ({ getServiceClient }))

const adminUserId = '11111111-1111-4111-8111-111111111111'

async function loadRoute() {
  return import('@/app/api/admin/invitations/route')
}

describe('admin invitations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sendEmail.mockResolvedValue(true)
  })

  it('POST returns 401 without session', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({ user: null, queue: [] })
    )
    const { POST } = await loadRoute()
    const res = await POST(
      jsonRequest('http://localhost/api/admin/invitations', {
        email: 'new@example.com',
        role: 'member',
      })
    )
    expect(res!.status).toBe(401)
  })

  it('POST returns 403 for non-admin', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: adminUserId },
        queue: [{ data: { role: 'member' }, error: null }],
      })
    )
    const { POST } = await loadRoute()
    const res = await POST(
      jsonRequest('http://localhost/api/admin/invitations', {
        email: 'new@example.com',
        role: 'member',
      })
    )
    expect(res!.status).toBe(403)
  })

  it('POST returns 400 for invalid email', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: adminUserId },
        queue: [{ data: { role: 'admin' }, error: null }],
      })
    )
    getServiceClient.mockReturnValue(createQueuedSupabaseMock({ user: null, queue: [] }))
    const { POST } = await loadRoute()
    const res = await POST(
      jsonRequest('http://localhost/api/admin/invitations', {
        email: 'not-an-email',
        role: 'member',
      })
    )
    expect(res!.status).toBe(400)
  })

  it('POST returns 409 when pending invitation exists', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: adminUserId },
        queue: [{ data: { role: 'admin' }, error: null }],
      })
    )
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [{ data: { id: 'inv-1' }, error: null }],
      })
    )
    const { POST } = await loadRoute()
    const res = await POST(
      jsonRequest('http://localhost/api/admin/invitations', {
        email: 'pending@example.com',
        role: 'member',
      })
    )
    expect(res!.status).toBe(409)
  })

  it('POST returns 409 when profile already exists', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: adminUserId },
        queue: [{ data: { role: 'admin' }, error: null }],
      })
    )
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          { data: null, error: null },
          { data: { id: 'existing' }, error: null },
        ],
      })
    )
    const { POST } = await loadRoute()
    const res = await POST(
      jsonRequest('http://localhost/api/admin/invitations', {
        email: 'exists@example.com',
        role: 'member',
      })
    )
    expect(res!.status).toBe(409)
  })

  it('POST rolls back invitation when email send fails', async () => {
    sendEmail.mockResolvedValue(false)
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: adminUserId },
        queue: [{ data: { role: 'admin' }, error: null }],
      })
    )
    const invitationRow = {
      id: '99999999-9999-4999-8999-999999999999',
      email: 'x@example.com',
      role: 'member',
      invited_by: adminUserId,
      status: 'pending',
      created_at: new Date().toISOString(),
    }
    const serviceQueue = [
      { data: null, error: null },
      { data: null, error: null },
      { data: invitationRow, error: null },
      { data: { full_name: 'Admin', email: 'a@x.com' }, error: null },
      { data: null, error: null },
    ]
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({ user: null, queue: serviceQueue })
    )
    const { POST } = await loadRoute()
    const res = await POST(
      jsonRequest('http://localhost/api/admin/invitations', {
        email: 'x@example.com',
        role: 'member',
      })
    )
    expect(res!.status).toBe(500)
    expect(sendEmail).toHaveBeenCalled()
  })

  it('POST creates invitation and sends email', async () => {
    createClient.mockResolvedValue(
      createQueuedSupabaseMock({
        user: { id: adminUserId },
        queue: [{ data: { role: 'admin' }, error: null }],
      })
    )
    const invitationRow = {
      id: '88888888-8888-4888-8888-888888888888',
      email: 'invite@example.com',
      role: 'member',
      invited_by: adminUserId,
      status: 'pending',
      created_at: new Date().toISOString(),
    }
    getServiceClient.mockReturnValue(
      createQueuedSupabaseMock({
        user: null,
        queue: [
          { data: null, error: null },
          { data: null, error: null },
          { data: invitationRow, error: null },
          { data: { full_name: 'Admin', email: 'a@x.com' }, error: null },
        ],
      })
    )
    const { POST } = await loadRoute()
    const res = await POST(
      jsonRequest('http://localhost/api/admin/invitations', {
        email: 'invite@example.com',
        role: 'member',
      })
    )
    expect(res!.status).toBe(201)
    expect(sendEmail).toHaveBeenCalled()
    expect(logAudit).toHaveBeenCalledWith(
      adminUserId,
      'user_invited',
      'invitation',
      invitationRow.id,
      expect.any(Object)
    )
  })
})
