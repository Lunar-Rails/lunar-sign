-- ─────────────────────────────────────────────────────────────────────────────
-- 0009_document_types.sql
-- Add document types and links between documents and types.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Document Types ───────────────────────────────────────────────────────────

create table public.document_types (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  created_by uuid        not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create unique index document_types_name_unique_idx
  on public.document_types(lower(name));

alter table public.document_types enable row level security;

create policy "Authenticated users can read document types"
  on public.document_types for select
  to authenticated
  using (true);

create policy "Authenticated users can create document types"
  on public.document_types for insert
  to authenticated
  with check (auth.uid() = created_by);


-- ── Document Document Types (many-to-many) ──────────────────────────────────

create table public.document_document_types (
  document_id      uuid not null references public.documents(id) on delete cascade,
  document_type_id uuid not null references public.document_types(id) on delete cascade,
  created_at       timestamptz not null default now(),
  primary key (document_id, document_type_id)
);

create index document_document_types_document_id_idx
  on public.document_document_types(document_id);
create index document_document_types_document_type_id_idx
  on public.document_document_types(document_type_id);

alter table public.document_document_types enable row level security;

create policy "Users can read document types for accessible documents"
  on public.document_document_types for select
  to authenticated
  using (public.can_access_document(document_id));

create policy "Users can insert document types for accessible documents"
  on public.document_document_types for insert
  to authenticated
  with check (public.can_access_document(document_id));

create policy "Users can delete document types for accessible documents"
  on public.document_document_types for delete
  to authenticated
  using (public.can_access_document(document_id));
