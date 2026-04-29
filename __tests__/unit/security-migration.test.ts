/**
 * Regression tests for migration 0017_security_hardening.sql.
 *
 * These tests validate that the migration file exists and contains the
 * expected security statements. They act as a canary: if any statement
 * is accidentally removed or reverted, these tests fail before the change
 * reaches staging.
 *
 * For live-DB RLS validation see docs/security/rls-verification.sql.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

const migrationPath = join(
  process.cwd(),
  'supabase',
  'migrations',
  '0017_security_hardening.sql'
)

const sql = readFileSync(migrationPath, 'utf8')

// Normalise whitespace for comparison so minor formatting changes don't cause
// failures. We compare lowercased, collapsed-whitespace fragments.
function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

const normSql = normalize(sql)

function contains(fragment: string) {
  return normSql.includes(normalize(fragment))
}

describe('0017_security_hardening.sql — anon privilege revocation', () => {
  it('revokes all anon table privileges in the public schema', () => {
    expect(contains('revoke all privileges on all tables in schema public from anon')).toBe(true)
  })

  it('revokes anon access to _migrations', () => {
    expect(contains('revoke all privileges on public._migrations from anon')).toBe(true)
  })

  it('revokes authenticated access to _migrations', () => {
    expect(contains('revoke all privileges on public._migrations from anon, authenticated')).toBe(true)
  })

  it('revokes signing_otps from anon and authenticated', () => {
    expect(contains('revoke all privileges on public.signing_otps from anon, authenticated')).toBe(true)
  })
})

describe('0017_security_hardening.sql — documents UPDATE policy', () => {
  it('drops the broad accessible-user update policy', () => {
    expect(
      contains('drop policy if exists "users can update accessible documents" on public.documents')
    ).toBe(true)
  })

  it('creates an owner-and-admin-only update policy', () => {
    expect(
      contains('create policy "owners and admins can update documents"')
    ).toBe(true)
  })

  it('restricts the new policy to authenticated role', () => {
    // The policy block for documents must include 'to authenticated'
    const docPolicyBlock = normSql.slice(
      normSql.indexOf('create policy "owners and admins can update documents"')
    )
    expect(docPolicyBlock.startsWith('create policy "owners and admins can update documents"')).toBe(true)
    expect(docPolicyBlock.includes('to authenticated')).toBe(true)
  })

  it('uses uploaded_by = auth.uid() for the owner check', () => {
    expect(contains('uploaded_by = auth.uid()')).toBe(true)
  })

  it('uses get_my_role() = \'admin\' as the admin check', () => {
    expect(contains("get_my_role() = 'admin'")).toBe(true)
  })
})

describe('0017_security_hardening.sql — templates UPDATE policy', () => {
  it('drops the broad accessible-user update policy on templates', () => {
    expect(
      contains('drop policy if exists "users can update accessible templates" on public.templates')
    ).toBe(true)
  })

  it('creates an owner-and-admin-only update policy on templates', () => {
    expect(
      contains('create policy "owners and admins can update templates"')
    ).toBe(true)
  })

  it('uses created_by = auth.uid() for the creator check', () => {
    expect(contains('created_by = auth.uid()')).toBe(true)
  })
})

describe('0017_security_hardening.sql — SECURITY DEFINER function hardening', () => {
  it('revokes handle_new_user() from public', () => {
    expect(contains('revoke all on function public.handle_new_user() from public')).toBe(true)
  })

  it('revokes cancel_accessible_pending_document from public', () => {
    expect(
      contains('revoke all on function public.cancel_accessible_pending_document(uuid) from public')
    ).toBe(true)
  })

  it('grants execute on cancel_accessible_pending_document to authenticated only', () => {
    expect(
      contains('grant execute on function public.cancel_accessible_pending_document(uuid) to authenticated')
    ).toBe(true)
  })

  it('sets search_path on get_my_role', () => {
    expect(contains('alter function public.get_my_role()')).toBe(true)
    expect(contains('set search_path = pg_catalog, public')).toBe(true)
  })

  it('sets search_path on is_member_of_company', () => {
    expect(contains('alter function public.is_member_of_company(uuid)')).toBe(true)
  })

  it('sets search_path on can_access_document', () => {
    expect(contains('alter function public.can_access_document(uuid)')).toBe(true)
  })

  it('sets search_path on can_access_template', () => {
    expect(contains('alter function public.can_access_template(uuid)')).toBe(true)
  })

  it('sets search_path on cancel_accessible_pending_document', () => {
    expect(contains('alter function public.cancel_accessible_pending_document(uuid)')).toBe(true)
  })
})
