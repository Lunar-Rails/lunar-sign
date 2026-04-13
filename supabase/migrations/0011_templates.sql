-- ─────────────────────────────────────────────────────────────────────────────
-- 0011_templates.sql
-- Contract templates, template–company links, document template fields, soft delete.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Templates ────────────────────────────────────────────────────────────────

create table public.templates (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  document_type_id uuid references public.document_types(id) on delete set null,
  file_path        text not null,
  field_metadata   jsonb not null default '[]'::jsonb,
  created_by       uuid not null references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index templates_created_by_idx on public.templates(created_by);
create index templates_document_type_id_idx on public.templates(document_type_id);
create index templates_deleted_at_idx on public.templates(deleted_at) where deleted_at is null;

alter table public.templates enable row level security;

-- ── Template Companies (M2M) ──────────────────────────────────────────────────

create table public.template_companies (
  template_id uuid not null references public.templates(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (template_id, company_id)
);

create index template_companies_company_id_idx on public.template_companies(company_id);

alter table public.template_companies enable row level security;

-- ── Documents: template link, field snapshot, soft delete ───────────────────

alter table public.documents
  add column if not exists template_id uuid references public.templates(id) on delete set null,
  add column if not exists field_metadata jsonb,
  add column if not exists deleted_at timestamptz;

create index documents_template_id_idx on public.documents(template_id);
create index documents_deleted_at_idx on public.documents(deleted_at) where deleted_at is null;

-- ── Access helper (mirrors can_access_document) ──────────────────────────────

create or replace function public.can_access_template(tmpl_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.get_my_role() = 'admin'
    or exists (
      select 1 from public.templates t
      where t.id = tmpl_id
      and t.deleted_at is null
      and t.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.templates t
      join public.template_companies tc on tc.template_id = t.id
      join public.company_members cm on cm.company_id = tc.company_id
      where t.id = tmpl_id
      and t.deleted_at is null
      and cm.user_id = auth.uid()
    )
$$;

-- ── Templates RLS ────────────────────────────────────────────────────────────

create policy "Users can read accessible templates"
  on public.templates for select
  to authenticated
  using (deleted_at is null and public.can_access_template(id));

create policy "Users can create templates"
  on public.templates for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Users can update accessible templates"
  on public.templates for update
  to authenticated
  using (deleted_at is null and public.can_access_template(id))
  with check (deleted_at is null and public.can_access_template(id));

-- ── Template Companies RLS ───────────────────────────────────────────────────

create policy "Users can read template companies for accessible templates"
  on public.template_companies for select
  to authenticated
  using (public.can_access_template(template_id));

create policy "Users can insert template companies for accessible templates"
  on public.template_companies for insert
  to authenticated
  with check (
    public.can_access_template(template_id)
    and public.is_member_of_company(company_id)
  );

create policy "Users can delete template companies for accessible templates"
  on public.template_companies for delete
  to authenticated
  using (
    public.can_access_template(template_id)
    and public.is_member_of_company(company_id)
  );

-- ── Storage: template PDF uploads under templates/{userId}/... ───────────────

create policy "Users can upload to their template folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'templates'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can read their template PDFs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'templates'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can update their template PDFs"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'templates'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can delete their template PDFs"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'templates'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
