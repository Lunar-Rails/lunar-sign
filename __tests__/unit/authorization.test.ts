import { describe, expect, it } from 'vitest'
import { canAccessDocument, canAccessTemplate, isMemberOfCompany } from '@/lib/authorization'

function thenable<T>(value: T) {
  return {
    then: (onFulfilled: (v: T) => unknown) => Promise.resolve(value).then(onFulfilled),
  }
}

function mockClient(handlers: {
  profileRole?: 'admin' | 'member' | null
  membershipRow?: { company_id: string } | null
  ownedDocument?: { id: string } | null
  documentCompanyLinks?: { company_id: string }[]
  userMemberships?: { company_id: string }[]
  ownedTemplate?: { id: string } | null
  templateCompanyLinks?: { company_id: string }[]
}) {
  return {
    from(table: string) {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data:
                  handlers.profileRole != null
                    ? { role: handlers.profileRole }
                    : null,
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'company_members') {
        return {
          select: () => ({
            eq: (col: string) => {
              if (col === 'company_id') {
                return {
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: handlers.membershipRow ?? null,
                      error: null,
                    }),
                  }),
                }
              }
              if (col === 'user_id') {
                return {
                  in: () =>
                    thenable({
                      data: handlers.userMemberships ?? [],
                      error: null,
                    }),
                }
              }
              return {
                maybeSingle: async () => ({ data: null, error: null }),
              }
            },
          }),
        }
      }
      if (table === 'documents') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: handlers.ownedDocument ?? null,
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'document_companies') {
        return {
          select: () => ({
            eq: () =>
              thenable({
                data: handlers.documentCompanyLinks ?? [],
                error: null,
              }),
          }),
        }
      }
      if (table === 'templates') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({
                  maybeSingle: async () => ({
                    data: handlers.ownedTemplate ?? null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'template_companies') {
        return {
          select: () => ({
            eq: () =>
              thenable({
                data: handlers.templateCompanyLinks ?? [],
                error: null,
              }),
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
  } as never
}

const userId = 'user-1'
const companyId = '550e8400-e29b-41d4-a716-446655440001'
const docId = '550e8400-e29b-41d4-a716-446655440002'
const tmplId = '550e8400-e29b-41d4-a716-446655440003'

describe('isMemberOfCompany', () => {
  it('returns true for admin', async () => {
    const supabase = mockClient({ profileRole: 'admin' })
    expect(
      await isMemberOfCompany({ supabase, userId, companyId })
    ).toBe(true)
  })

  it('returns true when membership row exists', async () => {
    const supabase = mockClient({
      profileRole: 'member',
      membershipRow: { company_id: companyId },
    })
    expect(
      await isMemberOfCompany({ supabase, userId, companyId })
    ).toBe(true)
  })

  it('returns false without membership', async () => {
    const supabase = mockClient({
      profileRole: 'member',
      membershipRow: null,
    })
    expect(
      await isMemberOfCompany({ supabase, userId, companyId })
    ).toBe(false)
  })
})

describe('canAccessDocument', () => {
  it('returns true for admin', async () => {
    const supabase = mockClient({ profileRole: 'admin' })
    expect(
      await canAccessDocument({ supabase, userId, documentId: docId })
    ).toBe(true)
  })

  it('returns true for document owner', async () => {
    const supabase = mockClient({
      profileRole: 'member',
      ownedDocument: { id: docId },
    })
    expect(
      await canAccessDocument({ supabase, userId, documentId: docId })
    ).toBe(true)
  })

  it('returns true when user is member of linked company', async () => {
    const supabase = mockClient({
      profileRole: 'member',
      ownedDocument: null,
      documentCompanyLinks: [{ company_id: companyId }],
      userMemberships: [{ company_id: companyId }],
    })
    expect(
      await canAccessDocument({ supabase, userId, documentId: docId })
    ).toBe(true)
  })

  it('returns false for non-owner without company link', async () => {
    const supabase = mockClient({
      profileRole: 'member',
      ownedDocument: null,
      documentCompanyLinks: [],
    })
    expect(
      await canAccessDocument({ supabase, userId, documentId: docId })
    ).toBe(false)
  })

  it('returns false when document has companies but user not member', async () => {
    const supabase = mockClient({
      profileRole: 'member',
      ownedDocument: null,
      documentCompanyLinks: [{ company_id: companyId }],
      userMemberships: [],
    })
    expect(
      await canAccessDocument({ supabase, userId, documentId: docId })
    ).toBe(false)
  })
})

describe('canAccessTemplate', () => {
  it('returns true for admin', async () => {
    const supabase = mockClient({ profileRole: 'admin' })
    expect(await canAccessTemplate({ supabase, userId, templateId: tmplId })).toBe(true)
  })

  it('returns true for template owner (created_by)', async () => {
    const supabase = mockClient({
      profileRole: 'member',
      ownedTemplate: { id: tmplId },
    })
    expect(await canAccessTemplate({ supabase, userId, templateId: tmplId })).toBe(true)
  })

  it('returns true when user is member of linked company', async () => {
    const supabase = mockClient({
      profileRole: 'member',
      ownedTemplate: null,
      templateCompanyLinks: [{ company_id: companyId }],
      userMemberships: [{ company_id: companyId }],
    })
    expect(await canAccessTemplate({ supabase, userId, templateId: tmplId })).toBe(true)
  })

  it('returns false for non-owner without company link', async () => {
    const supabase = mockClient({
      profileRole: 'member',
      ownedTemplate: null,
      templateCompanyLinks: [],
    })
    expect(await canAccessTemplate({ supabase, userId, templateId: tmplId })).toBe(false)
  })

  it('returns false when template has companies but user not member', async () => {
    const supabase = mockClient({
      profileRole: 'member',
      ownedTemplate: null,
      templateCompanyLinks: [{ company_id: companyId }],
      userMemberships: [],
    })
    expect(await canAccessTemplate({ supabase, userId, templateId: tmplId })).toBe(false)
  })
})
