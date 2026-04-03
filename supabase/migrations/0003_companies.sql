-- ─────────────────────────────────────────────────────────────────────────────
-- 0003_companies.sql
-- Add multi-company support for documents via a workspace-like company model.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Companies ────────────────────────────────────────────────────────────────

create table public.companies (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  slug       text        not null unique,
  created_by uuid        not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.companies enable row level security;

create policy "Authenticated users can read companies"
  on public.companies for select
  to authenticated
  using (true);

create policy "Admins can create companies"
  on public.companies for insert
  to authenticated
  with check (public.get_my_role() = 'admin');

create policy "Admins can update companies"
  on public.companies for update
  to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create policy "Admins can delete companies"
  on public.companies for delete
  to authenticated
  using (public.get_my_role() = 'admin');


-- ── Document Companies (many-to-many) ────────────────────────────────────────

create table public.document_companies (
  document_id uuid not null references public.documents(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (document_id, company_id)
);

create index document_companies_document_id_idx on public.document_companies(document_id);
create index document_companies_company_id_idx on public.document_companies(company_id);

alter table public.document_companies enable row level security;

create policy "Users can read document companies for accessible documents"
  on public.document_companies for select
  to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_companies.document_id
      and (d.uploaded_by = auth.uid() or public.get_my_role() = 'admin')
    )
  );

create policy "Users can insert document companies for their documents"
  on public.document_companies for insert
  to authenticated
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_companies.document_id
      and (d.uploaded_by = auth.uid() or public.get_my_role() = 'admin')
    )
  );

create policy "Users can delete document companies for their documents"
  on public.document_companies for delete
  to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_companies.document_id
      and (d.uploaded_by = auth.uid() or public.get_my_role() = 'admin')
    )
  );
