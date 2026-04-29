-- ─────────────────────────────────────────────────────────────────────────────
-- 0017_security_hardening.sql
-- Defence-in-depth hardening for the public schema.
--
-- Changes:
--   1. Revoke anonymous role table privileges (all public tables).
--   2. Revoke _migrations access from anon and authenticated.
--   3. Tighten documents UPDATE policy: accessible → owner or admin only.
--   4. Tighten templates UPDATE policy: accessible → creator or admin only.
--   5. Harden SECURITY DEFINER helper functions:
--      - Explicit revoke/grant on cancel RPC.
--      - Consistent set search_path on all definer functions.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Revoke all anonymous table privileges ─────────────────────────────────
-- RLS policies already restrict effective access, but broad anon grants mean
-- any future permissive policy instantly exposes the table via PostgREST.
-- Remove at the privilege layer so the anon role has no table access at all.

revoke all privileges on all tables in schema public from anon;


-- ── 2. Revoke migration bookkeeping from anon and authenticated ───────────────
-- _migrations is internal scaffolding and must never be reachable via the API.
-- signing_otps was already locked in 0016; include it here for completeness.

revoke all privileges on public._migrations from anon, authenticated;
revoke all privileges on public.signing_otps from anon, authenticated;


-- ── 3. Tighten documents UPDATE policy ───────────────────────────────────────
-- Old policy allowed any user who could *read* the document (company members,
-- admins, owner) to write back to the same row — effectively a full-row write
-- for anyone with read access.
--
-- New policy: only the uploading user (owner) or a global admin may UPDATE.
-- Company members retain SELECT via the existing read policy; they can trigger
-- specific mutations through purpose-built RPCs (e.g. cancel_accessible_pending_document).
-- Routes that need elevated writes use the service client after route-level auth.

drop policy if exists "Users can update accessible documents" on public.documents;

create policy "Owners and admins can update documents"
  on public.documents
  for update
  to authenticated
  using (uploaded_by = auth.uid() or public.get_my_role() = 'admin')
  with check (uploaded_by = auth.uid() or public.get_my_role() = 'admin');


-- ── 4. Tighten templates UPDATE policy ───────────────────────────────────────
-- Same issue as documents: accessible → creator or admin only.

drop policy if exists "Users can update accessible templates" on public.templates;

create policy "Owners and admins can update templates"
  on public.templates
  for update
  to authenticated
  using (
    deleted_at is null
    and (created_by = auth.uid() or public.get_my_role() = 'admin')
  )
  with check (
    deleted_at is null
    and (created_by = auth.uid() or public.get_my_role() = 'admin')
  );


-- ── 5. Harden SECURITY DEFINER functions ────────────────────────────────────
-- Explicit search_path on every SECURITY DEFINER function prevents a rogue
-- object earlier in the path from hijacking the function's behaviour.
--
-- cancel_accessible_pending_document: revoke from public (removes implicit
-- execute that Postgres grants to public by default), then re-grant only to
-- authenticated — matching the intent already present in 0013.

revoke all on function public.handle_new_user() from public;

revoke all on function public.cancel_accessible_pending_document(uuid) from public;
grant execute on function public.cancel_accessible_pending_document(uuid) to authenticated;

alter function public.get_my_role()
  set search_path = pg_catalog, public;

alter function public.is_member_of_company(uuid)
  set search_path = pg_catalog, public;

alter function public.can_access_document(uuid)
  set search_path = pg_catalog, public;

alter function public.can_access_template(uuid)
  set search_path = pg_catalog, public;

alter function public.cancel_accessible_pending_document(uuid)
  set search_path = pg_catalog, public;
