-- ─────────────────────────────────────────────────────────────────────────────
-- 0014_backfill_signer_index.sql
-- Backfill signer_index for pre-existing signature_requests created via the
-- manual POST /api/signature-requests flow (which did not set signer_index).
-- Without this, multi-signer documents created before the fix fall into
-- legacy (null) mode where every signer-assigned field is treated as the
-- current signer's, letting one signer overwrite another's slot in the PDF.
--
-- Contiguous indexes (0, 1, ...) per document, ordered by created_at to match
-- the order signers were originally added.
-- ─────────────────────────────────────────────────────────────────────────────

-- Only touch rows with NULL signer_index; template-based requests already have
-- an authoritative index we must not clobber.
with ranked as (
  select
    id,
    row_number() over (
      partition by document_id
      order by created_at asc, id asc
    ) - 1 as rn
  from public.signature_requests
  where status <> 'cancelled'
    and signer_index is null
)
update public.signature_requests sr
set signer_index = ranked.rn
from ranked
where sr.id = ranked.id;
