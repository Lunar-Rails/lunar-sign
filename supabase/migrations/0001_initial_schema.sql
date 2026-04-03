-- ─────────────────────────────────────────────────────────────────────────────
-- 0001_initial_schema.sql
-- Full schema for Lunar Sign: profiles, documents, signature_requests,
-- signatures, audit_log tables + storage buckets + RLS policies + triggers.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Profiles ─────────────────────────────────────────────────────────────────

create table public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  email      text        not null,
  full_name  text        not null default '',
  role       text        not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update any profile"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Users can update their own profile (non-role fields)"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
  );


-- ── Auto-create profile on sign-up ───────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── Documents ─────────────────────────────────────────────────────────────────

create table public.documents (
  id                   uuid        primary key default gen_random_uuid(),
  title                text        not null,
  description          text,
  file_path            text        not null,
  uploaded_by          uuid        not null references public.profiles(id),
  status               text        not null default 'draft'
                                   check (status in ('draft', 'pending', 'completed', 'cancelled')),
  latest_signed_pdf_path text,
  created_at           timestamptz not null default now(),
  completed_at         timestamptz
);

alter table public.documents enable row level security;

create policy "Users can read documents they uploaded"
  on public.documents for select
  using (uploaded_by = auth.uid());

create policy "Admins can read all documents"
  on public.documents for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Authenticated users can create documents"
  on public.documents for insert
  with check (auth.uid() = uploaded_by);

create policy "Document owner can update their documents"
  on public.documents for update
  using (uploaded_by = auth.uid());


-- ── Signature requests ────────────────────────────────────────────────────────

create table public.signature_requests (
  id           uuid        primary key default gen_random_uuid(),
  document_id  uuid        not null references public.documents(id) on delete cascade,
  signer_name  text        not null,
  signer_email text        not null,
  requested_by uuid        not null references public.profiles(id),
  status       text        not null default 'pending'
                           check (status in ('pending', 'signed', 'declined')),
  token        uuid        not null default gen_random_uuid(),
  signed_at    timestamptz,
  created_at   timestamptz not null default now()
);

create unique index signature_requests_token_idx on public.signature_requests(token);

alter table public.signature_requests enable row level security;

create policy "Requesters can read requests they created"
  on public.signature_requests for select
  using (requested_by = auth.uid());

create policy "Admins can read all requests"
  on public.signature_requests for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Authenticated users can create signature requests"
  on public.signature_requests for insert
  with check (auth.uid() = requested_by);

create policy "Requesters can update requests they created"
  on public.signature_requests for update
  using (requested_by = auth.uid());


-- ── Signatures ────────────────────────────────────────────────────────────────

create table public.signatures (
  id             uuid        primary key default gen_random_uuid(),
  request_id     uuid        not null references public.signature_requests(id) on delete cascade,
  signature_data text        not null,
  document_hash  text        not null,
  signed_pdf_path text       not null,
  ip_address     text,
  user_agent     text,
  signed_at      timestamptz not null default now()
);

alter table public.signatures enable row level security;

create policy "Document owners can read signatures on their documents"
  on public.signatures for select
  using (
    exists (
      select 1 from public.signature_requests sr
      where sr.id = signatures.request_id and sr.requested_by = auth.uid()
    )
  );

create policy "Admins can read all signatures"
  on public.signatures for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );


-- ── Audit log ─────────────────────────────────────────────────────────────────

create table public.audit_log (
  id          uuid        primary key default gen_random_uuid(),
  actor_id    uuid        references public.profiles(id),
  action      text        not null,
  entity_type text        not null,
  entity_id   uuid,
  metadata    jsonb       default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy "Admins can read audit logs"
  on public.audit_log for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Authenticated users can insert audit entries"
  on public.audit_log for insert
  with check (auth.uid() = actor_id);


-- ── Storage buckets ───────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values
  ('documents', 'documents', false),
  ('signed-documents', 'signed-documents', false)
on conflict (id) do nothing;

create policy "Authenticated users can upload documents"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents');

create policy "Users can read their own documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and owner_id = auth.uid()::text
  );

create policy "Authenticated users can upload signed documents"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'signed-documents');

create policy "Document owners can read signed documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'signed-documents'
    and exists (
      select 1 from public.documents d
      where d.latest_signed_pdf_path = name
      and d.uploaded_by = auth.uid()
    )
  );
