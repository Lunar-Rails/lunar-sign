/**
 * Composable FIFO queue chunks for Supabase DB calls that authorization helpers
 * in lib/authorization.ts emit.  Each builder returns an ordered array of
 * { data, error } objects that createQueuedSupabaseMock() will consume.
 *
 * CRITICAL: the mock pops entries in insertion order, so the chunks here must
 * exactly mirror the runtime call sequence in lib/authorization.ts.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * canAccessDocument call sequence (lib/authorization.ts:34)
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. profiles  → maybeSingle  (isAdmin check)
 *      If admin → STOP (return true).
 *   2. documents → maybeSingle  (owner check via uploaded_by)
 *      If owned  → STOP (return true).
 *   3. document_companies → then (select company_id list)
 *      If empty  → STOP (return false).
 *   4. company_members → then (select company_id in list)
 *      Returns true if any row exists.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * canAccessTemplate call sequence (lib/authorization.ts:71)
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. profiles  → maybeSingle  (isAdmin check)
 *      If admin → STOP.
 *   2. templates → maybeSingle  (creator check via created_by + deleted_at IS NULL)
 *      If owned  → STOP.
 *   3. template_companies → then (select company_id list)
 *      If empty  → STOP.
 *   4. company_members → then (select company_id in list)
 *      Returns true if any row exists.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * isMemberOfCompany call sequence (lib/authorization.ts:13)
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. profiles  → maybeSingle  (isAdmin check)
 *      If admin → STOP.
 *   2. company_members → maybeSingle (membership row lookup)
 */

import type { SupabaseOpResult } from './mock-supabase'
import { company1 } from './rbac-fixtures'

// ── canAccessDocument ────────────────────────────────────────────────────────

/** Admin short-circuits after 1 profiles read — returns true immediately. */
export function queueCanAccessDocumentAdmin(): SupabaseOpResult[] {
  return [
    { data: { role: 'admin' }, error: null }, // 1. profiles (isAdmin → true)
  ]
}

/** Non-admin user who IS the document uploader — returns true after 2 reads. */
export function queueCanAccessDocumentOwner(docId: string): SupabaseOpResult[] {
  return [
    { data: { role: 'member' }, error: null },    // 1. profiles (isAdmin → false)
    { data: { id: docId }, error: null },          // 2. documents (owner match)
  ]
}

/**
 * Non-admin, non-owner but member of a company linked to the document.
 * Passes all 4 checks and returns true.
 */
export function queueCanAccessDocumentViaCompany(
  companyId = company1
): SupabaseOpResult[] {
  return [
    { data: { role: 'member' }, error: null },               // 1. profiles
    { data: null, error: null },                              // 2. documents (no owner match)
    { data: [{ company_id: companyId }], error: null },      // 3. document_companies (has links)
    { data: [{ company_id: companyId }], error: null },      // 4. company_members (user is member)
  ]
}

/**
 * Non-admin, non-owner, document has no company links — returns false after 3 reads.
 */
export function queueCanAccessDocumentDeniedNoLinks(): SupabaseOpResult[] {
  return [
    { data: { role: 'member' }, error: null }, // 1. profiles
    { data: null, error: null },               // 2. documents (not owner)
    { data: [], error: null },                 // 3. document_companies (no links → early return false)
  ]
}

/**
 * Non-admin, non-owner, document has company links but user is NOT a member.
 * Returns false after all 4 reads.
 */
export function queueCanAccessDocumentDeniedNotMember(
  companyId = company1
): SupabaseOpResult[] {
  return [
    { data: { role: 'member' }, error: null },               // 1. profiles
    { data: null, error: null },                              // 2. documents (not owner)
    { data: [{ company_id: companyId }], error: null },      // 3. document_companies (has links)
    { data: [], error: null },                                // 4. company_members (no membership)
  ]
}

// ── canAccessTemplate ────────────────────────────────────────────────────────

/** Admin short-circuits after 1 profiles read — returns true immediately. */
export function queueCanAccessTemplateAdmin(): SupabaseOpResult[] {
  return [
    { data: { role: 'admin' }, error: null }, // 1. profiles (isAdmin → true)
  ]
}

/** Non-admin user who created the template — returns true after 2 reads. */
export function queueCanAccessTemplateCreator(tmplId: string): SupabaseOpResult[] {
  return [
    { data: { role: 'member' }, error: null }, // 1. profiles (isAdmin → false)
    { data: { id: tmplId }, error: null },      // 2. templates (creator match)
  ]
}

/**
 * Non-admin, non-creator but member of a linked company — returns true after 4 reads.
 */
export function queueCanAccessTemplateViaCompany(
  companyId = company1
): SupabaseOpResult[] {
  return [
    { data: { role: 'member' }, error: null },               // 1. profiles
    { data: null, error: null },                              // 2. templates (not creator)
    { data: [{ company_id: companyId }], error: null },      // 3. template_companies (has links)
    { data: [{ company_id: companyId }], error: null },      // 4. company_members (user is member)
  ]
}

/** Non-admin, non-creator, no company links — returns false after 3 reads. */
export function queueCanAccessTemplateDeniedNoLinks(): SupabaseOpResult[] {
  return [
    { data: { role: 'member' }, error: null }, // 1. profiles
    { data: null, error: null },               // 2. templates (not creator)
    { data: [], error: null },                 // 3. template_companies (no links → false)
  ]
}

/** Non-admin, non-creator, has links but user not a member — returns false after 4 reads. */
export function queueCanAccessTemplateDeniedNotMember(
  companyId = company1
): SupabaseOpResult[] {
  return [
    { data: { role: 'member' }, error: null },               // 1. profiles
    { data: null, error: null },                              // 2. templates (not creator)
    { data: [{ company_id: companyId }], error: null },      // 3. template_companies (has links)
    { data: [], error: null },                                // 4. company_members (no membership)
  ]
}

// ── isMemberOfCompany ────────────────────────────────────────────────────────

/** Admin — always a member, short-circuits after profiles read. */
export function queueIsMemberOfCompanyAdmin(): SupabaseOpResult[] {
  return [
    { data: { role: 'admin' }, error: null }, // 1. profiles (isAdmin → true)
  ]
}

/** Member who has a row in company_members — returns true. */
export function queueIsMemberOfCompanyYes(): SupabaseOpResult[] {
  return [
    { data: { role: 'member' }, error: null },       // 1. profiles (isAdmin → false)
    { data: { company_id: company1 }, error: null }, // 2. company_members (member row found)
  ]
}

/** Member who does NOT have a membership row — returns false. */
export function queueIsMemberOfCompanyNo(): SupabaseOpResult[] {
  return [
    { data: { role: 'member' }, error: null }, // 1. profiles
    { data: null, error: null },               // 2. company_members (no row)
  ]
}

// ── ensureAdmin (inline profile check used in several routes) ─────────────────

/** Single profiles read returning admin — the route continues. */
export function queueEnsureAdminYes(): SupabaseOpResult[] {
  return [{ data: { role: 'admin' }, error: null }]
}

/** Single profiles read returning member — the route returns 403. */
export function queueEnsureAdminNo(): SupabaseOpResult[] {
  return [{ data: { role: 'member' }, error: null }]
}
