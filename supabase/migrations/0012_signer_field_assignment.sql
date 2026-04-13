-- ─────────────────────────────────────────────────────────────────────────────
-- 0012_signer_field_assignment.sql
-- Adds explicit signer slot tracking to templates and signature_requests.
-- ─────────────────────────────────────────────────────────────────────────────

-- Number of distinct signer slots declared on the template (1 or 2).
-- Existing templates default to 1.
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS signer_count integer NOT NULL DEFAULT 1;

-- Which signer slot a signature request belongs to (0 = Signer 1, 1 = Signer 2).
-- NULL for legacy requests created before this migration.
ALTER TABLE public.signature_requests
  ADD COLUMN IF NOT EXISTS signer_index integer;

CREATE INDEX IF NOT EXISTS signature_requests_signer_index_idx
  ON public.signature_requests(signer_index);
