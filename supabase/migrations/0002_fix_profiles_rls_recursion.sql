-- ─────────────────────────────────────────────────────────────────────────────
-- 0002_fix_profiles_rls_recursion.sql
-- The admin policies on public.profiles query public.profiles inside an EXISTS
-- subquery, causing infinite recursion (PG error 42P17). Fix by introducing a
-- security-definer helper function that reads the caller's role bypassing RLS,
-- then rewriting all self-referential policies to use it.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Helper: read caller's role without triggering RLS ────────────────────────

create or replace function public.get_my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;


-- ── Drop recursive policies on profiles ──────────────────────────────────────

drop policy if exists "Admins can read all profiles"                    on public.profiles;
drop policy if exists "Admins can update any profile"                   on public.profiles;
drop policy if exists "Users can update their own profile (non-role fields)" on public.profiles;


-- ── Re-create policies using the non-recursive helper ────────────────────────

create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.get_my_role() = 'admin');

create policy "Admins can update any profile"
  on public.profiles for update
  using (public.get_my_role() = 'admin');

create policy "Users can update their own profile (non-role fields)"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = public.get_my_role()
  );
