-- ─────────────────────────────────────────────────────────────────────────────
-- 0016_legal_defensibility.sql
-- Schema additions for legal-grade e-signature compliance.
--
-- Changes:
--   signature_requests: consent tracking, link expiry, decline fields
--   signing_otps:       new table for email OTP verification
--   signatures:         HMAC evidence, OTP flag, OpenTimestamps columns
--   documents:          Certificate of Completion path + final hash
-- ─────────────────────────────────────────────────────────────────────────────

-- ── signature_requests additions ─────────────────────────────────────────────

alter table public.signature_requests
  add column if not exists consent_text_hash text,
  add column if not exists consent_given_at  timestamptz,
  -- 30-day expiry window; existing rows get 30 days from migration time
  add column if not exists expires_at        timestamptz
                                             not null
                                             default (now() + interval '30 days'),
  add column if not exists declined_at       timestamptz,
  add column if not exists decline_reason    text;

-- ── signing_otps ─────────────────────────────────────────────────────────────
-- One row per signature_request. Upserted each time a new OTP is issued.
-- Service-role only — revoked from all other roles.

create table if not exists public.signing_otps (
  request_id  uuid        primary key
                          references public.signature_requests(id)
                          on delete cascade,
  code_hash   text        not null,
  sent_to     text        not null,
  expires_at  timestamptz not null,
  verified_at timestamptz,
  attempts    int         not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.signing_otps enable row level security;
revoke all on public.signing_otps from authenticated, anon;

-- ── signatures additions ──────────────────────────────────────────────────────

alter table public.signatures
  -- HMAC-SHA256 over canonical signing event fields (replaces evidence_hash).
  -- Keyed with EVIDENCE_HMAC_KEY env var — tamper-evident even if DB is compromised.
  add column if not exists evidence_mac       text,
  -- Whether the signer completed email OTP verification before signing.
  add column if not exists otp_verified       boolean     not null default false,
  -- OpenTimestamps proof bytes (incomplete until Bitcoin confirms, ~1h).
  add column if not exists ots_proof          bytea,
  -- True once the signature row is eligible for OTS submission (set at insert).
  add column if not exists ots_pending        boolean     not null default false,
  add column if not exists ots_upgraded_at    timestamptz,
  add column if not exists ots_bitcoin_block  integer;

-- Index used by the OTS cron job to find rows needing phase-1 stamp or phase-2 upgrade.
create index if not exists signatures_ots_queue_idx
  on public.signatures (ots_pending, ots_upgraded_at, created_at);

-- ── documents additions ───────────────────────────────────────────────────────

alter table public.documents
  -- Path to the final composite PDF (signed content + Certificate of Completion page).
  add column if not exists certificate_pdf_path text,
  -- SHA-256 of the final composite PDF, computed after CoC is appended.
  add column if not exists final_document_hash  text;
