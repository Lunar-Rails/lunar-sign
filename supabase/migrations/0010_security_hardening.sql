-- ─────────────────────────────────────────────────────────────────────────────
-- 0010_security_hardening.sql
-- Critical/high security hardening for tokens, storage policies, and RLS.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Signature Requests: protect token column from authenticated/anon ─────────

revoke select (token) on public.signature_requests from authenticated;
revoke select (token) on public.signature_requests from anon;


-- ── Signature Requests: add explicit update/delete policies ──────────────────

drop policy if exists "Requesters can update their signature requests"
  on public.signature_requests;
drop policy if exists "Requesters can delete their draft signature requests"
  on public.signature_requests;

create policy "Requesters can update their signature requests"
  on public.signature_requests for update
  to authenticated
  using (requested_by = auth.uid())
  with check (requested_by = auth.uid());

create policy "Requesters can delete their draft signature requests"
  on public.signature_requests for delete
  to authenticated
  using (
    requested_by = auth.uid()
    and exists (
      select 1 from public.documents d
      where d.id = document_id
      and d.status = 'draft'
    )
  );


-- ── Signatures: preserve original document hash alongside signed output ──────

alter table public.signatures
  add column if not exists original_document_hash text;


-- ── Storage: tighten INSERT paths for documents bucket ───────────────────────

drop policy if exists "Authenticated users can upload documents"
  on storage.objects;
drop policy if exists "Users can upload to their own document folder"
  on storage.objects;

create policy "Users can upload to their own document folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[2] = auth.uid()::text
  );


-- ── Storage: remove broad upload permissions for signed artifacts ────────────

drop policy if exists "Authenticated users can upload signed documents"
  on storage.objects;
