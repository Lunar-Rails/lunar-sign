-- ─────────────────────────────────────────────────────────────────────────────
-- 0008_invitations.sql
-- Add admin-managed invitations for pre-provisioned access assignments.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Invitations ──────────────────────────────────────────────────────────────

create table public.invitations (
  id         uuid        primary key default gen_random_uuid(),
  email      text        not null,
  role       text        not null default 'member' check (role in ('admin', 'member')),
  invited_by uuid        not null references public.profiles(id),
  status     text        not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now()
);

create unique index invitations_email_pending_idx
  on public.invitations(lower(email))
  where status = 'pending';

alter table public.invitations enable row level security;

create policy "Admins can read invitations"
  on public.invitations for select
  to authenticated
  using (public.get_my_role() = 'admin');

create policy "Admins can create invitations"
  on public.invitations for insert
  to authenticated
  with check (public.get_my_role() = 'admin');

create policy "Admins can update invitations"
  on public.invitations for update
  to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create policy "Admins can delete invitations"
  on public.invitations for delete
  to authenticated
  using (public.get_my_role() = 'admin');


-- ── Invitation Companies ─────────────────────────────────────────────────────

create table public.invitation_companies (
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  company_id    uuid not null references public.companies(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (invitation_id, company_id)
);

create index invitation_companies_invitation_id_idx
  on public.invitation_companies(invitation_id);
create index invitation_companies_company_id_idx
  on public.invitation_companies(company_id);

alter table public.invitation_companies enable row level security;

create policy "Admins can read invitation companies"
  on public.invitation_companies for select
  to authenticated
  using (public.get_my_role() = 'admin');

create policy "Admins can create invitation companies"
  on public.invitation_companies for insert
  to authenticated
  with check (public.get_my_role() = 'admin');

create policy "Admins can delete invitation companies"
  on public.invitation_companies for delete
  to authenticated
  using (public.get_my_role() = 'admin');
