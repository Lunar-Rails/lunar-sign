-- ─────────────────────────────────────────────────────────────────────────────
-- 0007_company_members.sql
-- Add per-company membership and enforce membership-aware access policies.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Company Members ──────────────────────────────────────────────────────────

create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create index if not exists company_members_user_id_idx
  on public.company_members(user_id);
create index if not exists company_members_company_id_idx
  on public.company_members(company_id);

alter table public.company_members enable row level security;

drop policy if exists "Users can read their own company memberships"
  on public.company_members;
drop policy if exists "Admins can read all company memberships"
  on public.company_members;
drop policy if exists "Admins can manage company memberships"
  on public.company_members;

create policy "Users can read their own company memberships"
  on public.company_members for select
  to authenticated
  using (user_id = auth.uid());

create policy "Admins can read all company memberships"
  on public.company_members for select
  to authenticated
  using (public.get_my_role() = 'admin');

create policy "Admins can insert company memberships"
  on public.company_members for insert
  to authenticated
  with check (public.get_my_role() = 'admin');

create policy "Admins can delete company memberships"
  on public.company_members for delete
  to authenticated
  using (public.get_my_role() = 'admin');


-- ── Helper functions ─────────────────────────────────────────────────────────

create or replace function public.is_member_of_company(comp_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    exists (
      select 1 from public.company_members cm
      where cm.company_id = comp_id
      and cm.user_id = auth.uid()
    )
    or public.get_my_role() = 'admin'
$$;

create or replace function public.can_access_document(doc_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    exists (
      select 1 from public.documents d
      where d.id = doc_id
      and d.uploaded_by = auth.uid()
    )
    or exists (
      select 1
      from public.document_companies dc
      join public.company_members cm on cm.company_id = dc.company_id
      where dc.document_id = doc_id
      and cm.user_id = auth.uid()
    )
    or public.get_my_role() = 'admin'
$$;


-- ── Companies policies ───────────────────────────────────────────────────────

drop policy if exists "Authenticated users can read companies"
  on public.companies;

create policy "Members and admins can read companies"
  on public.companies for select
  to authenticated
  using (public.is_member_of_company(id));


-- ── Documents policies ───────────────────────────────────────────────────────

drop policy if exists "Users can read documents they uploaded"
  on public.documents;
drop policy if exists "Admins can read all documents"
  on public.documents;
drop policy if exists "Document owner can update their documents"
  on public.documents;

create policy "Users can read accessible documents"
  on public.documents for select
  to authenticated
  using (public.can_access_document(id));

create policy "Users can update accessible documents"
  on public.documents for update
  to authenticated
  using (public.can_access_document(id))
  with check (public.can_access_document(id));


-- ── Document Companies policies ──────────────────────────────────────────────

drop policy if exists "Users can read document companies for accessible documents"
  on public.document_companies;
drop policy if exists "Users can insert document companies for their documents"
  on public.document_companies;
drop policy if exists "Users can delete document companies for their documents"
  on public.document_companies;

create policy "Users can read document companies for accessible documents"
  on public.document_companies for select
  to authenticated
  using (public.can_access_document(document_id));

create policy "Users can insert document companies for accessible documents"
  on public.document_companies for insert
  to authenticated
  with check (
    public.can_access_document(document_id)
    and public.is_member_of_company(company_id)
  );

create policy "Users can delete document companies for accessible documents"
  on public.document_companies for delete
  to authenticated
  using (
    public.can_access_document(document_id)
    and public.is_member_of_company(company_id)
  );


-- ── Signature Requests policies ──────────────────────────────────────────────

drop policy if exists "Requesters can read requests they created"
  on public.signature_requests;
drop policy if exists "Admins can read all requests"
  on public.signature_requests;
drop policy if exists "Authenticated users can create signature requests"
  on public.signature_requests;

create policy "Users can read accessible signature requests"
  on public.signature_requests for select
  to authenticated
  using (public.can_access_document(document_id));

create policy "Users can create signature requests for accessible documents"
  on public.signature_requests for insert
  to authenticated
  with check (
    auth.uid() = requested_by
    and public.can_access_document(document_id)
  );


-- ── Signatures policies ───────────────────────────────────────────────────────

drop policy if exists "Document owners can read signatures on their documents"
  on public.signatures;
drop policy if exists "Admins can read all signatures"
  on public.signatures;

create policy "Users can read signatures for accessible documents"
  on public.signatures for select
  to authenticated
  using (
    exists (
      select 1 from public.signature_requests sr
      where sr.id = signatures.request_id
      and public.can_access_document(sr.document_id)
    )
  );


-- ── Audit Log policy adjustment ──────────────────────────────────────────────

drop policy if exists "Document owners can read audit logs for their documents"
  on public.audit_log;

create policy "Users can read audit logs for accessible documents"
  on public.audit_log for select
  to authenticated
  using (
    entity_type = 'document'
    and entity_id is not null
    and public.can_access_document(entity_id)
  );
