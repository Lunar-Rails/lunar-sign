-- ─────────────────────────────────────────────────────────────────────────────
-- 0005_audit_log_rls.sql
-- Let document owners read audit_log for their documents; fix admin SELECT
-- to use get_my_role() (avoids recursive profiles RLS like migration 0002).
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "Admins can read audit logs" on public.audit_log;
drop policy if exists "Document owners can read audit logs for their documents"
  on public.audit_log;

create policy "Admins can read audit logs"
  on public.audit_log for select
  using (public.get_my_role() = 'admin');

create policy "Document owners can read audit logs for their documents"
  on public.audit_log for select
  using (
    entity_type = 'document'
    and exists (
      select 1 from public.documents d
      where d.id = audit_log.entity_id
      and d.uploaded_by = auth.uid()
    )
  );
