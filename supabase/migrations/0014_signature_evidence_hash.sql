-- Add tamper-evident hash columns to signatures table.
--
-- signature_image_hash: SHA-256 of the raw signature_data string (the captured ink).
--   Lets verifiers confirm the image hasn't been swapped without exposing the full data URL.
--
-- evidence_hash: SHA-256 of the canonical signing event —
--   signer_email, signer_name, signature_image_hash, original_document_hash,
--   document_hash, signed_at — joined with newlines.
--   If any field is mutated in the DB the hash will no longer match on re-computation.

alter table public.signatures
  add column if not exists signature_image_hash text,
  add column if not exists evidence_hash         text;
