/**
 * Stable UUIDs and lightweight record factories for RBAC-focused tests.
 *
 * Conventions:
 *   - All IDs are v4-format UUIDs where the last octet group encodes the entity
 *     type, making log output easy to read without a lookup table.
 *   - "userA"  → member who owns documents/templates used in tests.
 *   - "userB"  → member of company2 only (used for cross-tenant deny cases).
 *   - "adminUser" → global admin (role = 'admin').
 */

// ── Actors ───────────────────────────────────────────────────────────────────

export const userA     = '11111111-1111-4111-8111-000000000001'
export const userB     = '11111111-1111-4111-8111-000000000002'
export const adminUser = '11111111-1111-4111-8111-000000000099'

// ── Resources ────────────────────────────────────────────────────────────────

export const company1 = '22222222-2222-4222-8222-000000000001'
export const company2 = '22222222-2222-4222-8222-000000000002'
export const doc1     = '33333333-3333-4333-8333-000000000001'
export const tmpl1    = '44444444-4444-4444-8444-000000000001'

// ── Profile row factories ─────────────────────────────────────────────────────

export function profileRow(userId: string, role: 'admin' | 'member' = 'member') {
  return { id: userId, role }
}

export const adminProfile  = profileRow(adminUser, 'admin')
export const memberAProfile = profileRow(userA, 'member')
export const memberBProfile = profileRow(userB, 'member')

// ── Document row factory ─────────────────────────────────────────────────────

export function documentRow(overrides?: Partial<{
  id: string
  title: string
  status: 'draft' | 'pending' | 'completed' | 'cancelled'
  uploaded_by: string
  deleted_at: string | null
  latest_signed_pdf_path: string | null
  file_path: string
  field_metadata: unknown[]
}>) {
  return {
    id: doc1,
    title: 'Test Doc',
    status: 'draft' as const,
    uploaded_by: userA,
    deleted_at: null,
    latest_signed_pdf_path: null,
    file_path: `documents/${userA}/${doc1}/original.pdf`,
    field_metadata: [],
    ...overrides,
  }
}

// ── Template row factory ─────────────────────────────────────────────────────

export function templateRow(overrides?: Partial<{
  id: string
  title: string
  created_by: string
  deleted_at: string | null
  signer_count: number
  field_metadata: unknown[]
}>) {
  return {
    id: tmpl1,
    title: 'Test Template',
    created_by: userA,
    deleted_at: null,
    signer_count: 1,
    field_metadata: [],
    ...overrides,
  }
}

// ── Link / membership row factories ──────────────────────────────────────────

export function documentCompanyLink(documentId = doc1, companyId = company1) {
  return { document_id: documentId, company_id: companyId }
}

export function templateCompanyLink(templateId = tmpl1, companyId = company1) {
  return { template_id: templateId, company_id: companyId }
}

export function companyMemberRow(userId: string, companyId = company1) {
  return { user_id: userId, company_id: companyId }
}
