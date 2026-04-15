-- ─────────────────────────────────────────────────────────────────────────────
-- 0013_cancel_accessible_document.sql
-- Atomic cancel for pending documents + signature requests for any user who may
-- access the document (uploader, company member, admin). Client updates were
-- blocked for non-requesters by RLS on signature_requests (requested_by = uid);
-- this function runs as security definer and reuses can_access_document().
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.cancel_accessible_pending_document(p_document_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_doc_updated int;
begin
  if not public.can_access_document(p_document_id) then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select d.status into v_status
  from public.documents d
  where d.id = p_document_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_status is distinct from 'pending' then
    return jsonb_build_object('ok', false, 'error', 'not_pending');
  end if;

  update public.documents
  set status = 'cancelled'
  where id = p_document_id
  and status = 'pending';

  get diagnostics v_doc_updated = row_count;
  if v_doc_updated = 0 then
    return jsonb_build_object('ok', false, 'error', 'concurrent_update');
  end if;

  update public.signature_requests
  set status = 'cancelled'
  where document_id = p_document_id
  and status = 'pending';

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.cancel_accessible_pending_document(uuid) from public;
grant execute on function public.cancel_accessible_pending_document(uuid) to authenticated;
