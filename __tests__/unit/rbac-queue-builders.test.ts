/**
 * Contract tests for rbac-queue-builders.ts.
 *
 * These guard against refactors that silently change queue length or entry
 * order, which would cause integration tests to consume the wrong DB result and
 * produce misleading failures.
 *
 * Rules asserted per builder:
 *   - queue.length === expected_length
 *   - each entry has { data, error } shape
 *   - first entry is always the profiles row (isAdmin check)
 */

import { describe, expect, it } from 'vitest'
import {
  queueCanAccessDocumentAdmin,
  queueCanAccessDocumentOwner,
  queueCanAccessDocumentViaCompany,
  queueCanAccessDocumentDeniedNoLinks,
  queueCanAccessDocumentDeniedNotMember,
  queueCanAccessTemplateAdmin,
  queueCanAccessTemplateCreator,
  queueCanAccessTemplateViaCompany,
  queueCanAccessTemplateDeniedNoLinks,
  queueCanAccessTemplateDeniedNotMember,
  queueIsMemberOfCompanyAdmin,
  queueIsMemberOfCompanyYes,
  queueIsMemberOfCompanyNo,
  queueEnsureAdminYes,
  queueEnsureAdminNo,
} from '../helpers/rbac-queue-builders'
import { company1 } from '../helpers/rbac-fixtures'

const docId = '33333333-3333-4333-8333-000000000001'
const tmplId = '44444444-4444-4444-8444-000000000001'

function hasShape(entry: unknown) {
  expect(entry).toMatchObject({ data: expect.anything(), error: null })
}

// ── canAccessDocument ────────────────────────────────────────────────────────

describe('queueCanAccessDocumentAdmin', () => {
  it('has 1 entry — profiles (admin short-circuit)', () => {
    const q = queueCanAccessDocumentAdmin()
    expect(q).toHaveLength(1)
    hasShape(q[0])
    expect(q[0].data).toMatchObject({ role: 'admin' })
  })
})

describe('queueCanAccessDocumentOwner', () => {
  it('has 2 entries — profiles (member) + documents (owner match)', () => {
    const q = queueCanAccessDocumentOwner(docId)
    expect(q).toHaveLength(2)
    expect(q[0].data).toMatchObject({ role: 'member' })
    expect(q[1].data).toMatchObject({ id: docId })
  })
})

describe('queueCanAccessDocumentViaCompany', () => {
  it('has 4 entries — profiles, documents (no match), document_companies, company_members', () => {
    const q = queueCanAccessDocumentViaCompany(company1)
    expect(q).toHaveLength(4)
    expect(q[0].data).toMatchObject({ role: 'member' })
    expect(q[1].data).toBeNull()
    expect(q[2].data).toEqual([{ company_id: company1 }])
    expect(q[3].data).toEqual([{ company_id: company1 }])
  })
})

describe('queueCanAccessDocumentDeniedNoLinks', () => {
  it('has 3 entries — profiles, documents (no match), document_companies (empty)', () => {
    const q = queueCanAccessDocumentDeniedNoLinks()
    expect(q).toHaveLength(3)
    expect(q[0].data).toMatchObject({ role: 'member' })
    expect(q[1].data).toBeNull()
    expect(q[2].data).toEqual([])
  })
})

describe('queueCanAccessDocumentDeniedNotMember', () => {
  it('has 4 entries — profiles, documents, document_companies (links exist), company_members (no overlap)', () => {
    const q = queueCanAccessDocumentDeniedNotMember(company1)
    expect(q).toHaveLength(4)
    expect(q[0].data).toMatchObject({ role: 'member' })
    expect(q[3].data).toEqual([])
  })
})

// ── canAccessTemplate ────────────────────────────────────────────────────────

describe('queueCanAccessTemplateAdmin', () => {
  it('has 1 entry — profiles (admin short-circuit)', () => {
    const q = queueCanAccessTemplateAdmin()
    expect(q).toHaveLength(1)
    expect(q[0].data).toMatchObject({ role: 'admin' })
  })
})

describe('queueCanAccessTemplateCreator', () => {
  it('has 2 entries — profiles (member) + templates (creator match)', () => {
    const q = queueCanAccessTemplateCreator(tmplId)
    expect(q).toHaveLength(2)
    expect(q[0].data).toMatchObject({ role: 'member' })
    expect(q[1].data).toMatchObject({ id: tmplId })
  })
})

describe('queueCanAccessTemplateViaCompany', () => {
  it('has 4 entries — profiles, templates (no match), template_companies, company_members', () => {
    const q = queueCanAccessTemplateViaCompany(company1)
    expect(q).toHaveLength(4)
    expect(q[0].data).toMatchObject({ role: 'member' })
    expect(q[1].data).toBeNull()
    expect(q[2].data).toEqual([{ company_id: company1 }])
    expect(q[3].data).toEqual([{ company_id: company1 }])
  })
})

describe('queueCanAccessTemplateDeniedNoLinks', () => {
  it('has 3 entries — profiles, templates (no match), template_companies (empty)', () => {
    const q = queueCanAccessTemplateDeniedNoLinks()
    expect(q).toHaveLength(3)
    expect(q[0].data).toMatchObject({ role: 'member' })
    expect(q[2].data).toEqual([])
  })
})

describe('queueCanAccessTemplateDeniedNotMember', () => {
  it('has 4 entries — profiles, templates, template_companies (links exist), company_members (no overlap)', () => {
    const q = queueCanAccessTemplateDeniedNotMember(company1)
    expect(q).toHaveLength(4)
    expect(q[3].data).toEqual([])
  })
})

// ── isMemberOfCompany ────────────────────────────────────────────────────────

describe('queueIsMemberOfCompanyAdmin', () => {
  it('has 1 entry — profiles (admin short-circuit)', () => {
    const q = queueIsMemberOfCompanyAdmin()
    expect(q).toHaveLength(1)
    expect(q[0].data).toMatchObject({ role: 'admin' })
  })
})

describe('queueIsMemberOfCompanyYes', () => {
  it('has 2 entries — profiles (member) + company_members (match)', () => {
    const q = queueIsMemberOfCompanyYes()
    expect(q).toHaveLength(2)
    expect(q[0].data).toMatchObject({ role: 'member' })
    expect(q[1].data).toMatchObject({ company_id: company1 })
  })
})

describe('queueIsMemberOfCompanyNo', () => {
  it('has 2 entries — profiles (member) + company_members (no match)', () => {
    const q = queueIsMemberOfCompanyNo()
    expect(q).toHaveLength(2)
    expect(q[0].data).toMatchObject({ role: 'member' })
    expect(q[1].data).toBeNull()
  })
})

// ── ensureAdmin ───────────────────────────────────────────────────────────────

describe('queueEnsureAdminYes', () => {
  it('has 1 entry — profiles returning admin role', () => {
    const q = queueEnsureAdminYes()
    expect(q).toHaveLength(1)
    expect(q[0].data).toMatchObject({ role: 'admin' })
  })
})

describe('queueEnsureAdminNo', () => {
  it('has 1 entry — profiles returning member role', () => {
    const q = queueEnsureAdminNo()
    expect(q).toHaveLength(1)
    expect(q[0].data).toMatchObject({ role: 'member' })
  })
})

// ── Contract: every builder entry has {data, error} shape ────────────────────

describe('all builders satisfy {data, error} shape contract', () => {
  const allBuilders = [
    ['admin', queueCanAccessDocumentAdmin()],
    ['owner', queueCanAccessDocumentOwner(docId)],
    ['viaCompany', queueCanAccessDocumentViaCompany()],
    ['deniedNoLinks', queueCanAccessDocumentDeniedNoLinks()],
    ['deniedNotMember', queueCanAccessDocumentDeniedNotMember()],
    ['tmplAdmin', queueCanAccessTemplateAdmin()],
    ['tmplCreator', queueCanAccessTemplateCreator(tmplId)],
    ['tmplViaCompany', queueCanAccessTemplateViaCompany()],
    ['tmplDeniedNoLinks', queueCanAccessTemplateDeniedNoLinks()],
    ['tmplDeniedNotMember', queueCanAccessTemplateDeniedNotMember()],
    ['memberAdmin', queueIsMemberOfCompanyAdmin()],
    ['memberYes', queueIsMemberOfCompanyYes()],
    ['memberNo', queueIsMemberOfCompanyNo()],
    ['ensureAdminYes', queueEnsureAdminYes()],
    ['ensureAdminNo', queueEnsureAdminNo()],
  ] as const

  it.each(allBuilders)('%s: every entry has error: null', (_name, queue) => {
    for (const entry of queue) {
      expect(entry.error).toBeNull()
      expect('data' in entry).toBe(true)
    }
  })
})
