# Lunar Sign

Document e-signing platform built on Next.js, Supabase, and pdf-lib.

---

## Development

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm test         # Vitest unit + API integration tests (no DB)
pnpm test:watch   # Vitest watch mode
pnpm test:coverage
pnpm test:e2e     # Playwright (requires running dev server or CI=true)
```

---

## Deployment (Netlify)

Lunar Sign deploys to **Netlify** via the `@netlify/plugin-nextjs` plugin.

### Build settings

| Setting | Value |
|---|---|
| Build command | `pnpm build` |
| Publish directory | `.next` |
| Node version | 20 |

These are already specified in `netlify.toml` at the repo root.

### Scheduled Function — OTS upgrade

A Netlify Scheduled Function at `netlify/functions/ots-upgrade.ts` runs every
30 minutes to:
1. **Phase 1** — stamp new signatures on OTS calendars (Bitcoin blockchain anchoring).
2. **Phase 2** — upgrade pending proofs that have since been confirmed on Bitcoin.

The function calls `POST /api/internal/ots/upgrade` with the `x-cron-secret` header.

---

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in all values before running locally.

### Required

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `MAILTRAP_HOST` | SMTP host for transactional email |
| `MAILTRAP_PORT` | SMTP port |
| `MAILTRAP_USER` | SMTP username |
| `MAILTRAP_PASSWORD` | SMTP password |
| `EMAIL_FROM` | Sender address (e.g. `no-reply@yourdomain.com`) |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app (e.g. `https://app.lunarsign.com`) |
| `EVIDENCE_HMAC_KEY` | 64 hex chars — HMAC-SHA256 key for signing evidence records. Generate: `openssl rand -hex 32` |
| `OTS_CRON_SECRET` | 16+ char random string — shared secret for the OTS cron endpoint. Generate: `openssl rand -base64 24` |

### Optional

| Variable | Default | Description |
|---|---|---|
| `OTS_CALENDAR_URLS` | Alice/Bob/Finney defaults | Comma-separated OTS calendar URLs to submit timestamps to |
| `CONSENT_TEXT_VERSION` | `2026-04-16` | Version string included in the consent text hash (bump when copy changes) |

### Netlify environment variables

Set these in the Netlify UI under **Site configuration → Environment variables**:

- All of the above, plus
- `URL` — automatically set by Netlify (your site URL); used by the Scheduled Function to call the OTS upgrade endpoint.

---

## Signing flow

```
/sign/[token]
  → /sign/[token]/consent    (consent + disclosure)
  → /sign/[token]/otp        (6-digit email OTP identity check)
  → /sign/[token]            (sign document)
       ↓
  POST /api/signatures       (stores HMAC evidence, queues OTS stamp, builds CoC PDF)
       ↓
  completion emails          (PDF with Certificate of Completion attached)
```

### Legal defensibility features

| Feature | Implementation |
|---|---|
| Consent + intent | `/sign/[token]/consent` captures consent, `IntentConfirmDialog` gates submit |
| Email OTP | `signing_otps` table; gated on `verified_at` before signature accepted |
| HMAC evidence | `evidence_mac` = HMAC-SHA256 over canonical signing event, keyed by `EVIDENCE_HMAC_KEY` |
| Certificate of Completion | pdf-lib appends a CoC page listing all signers with HMAC evidence strings |
| PDF in email | Completion emails attach the CoC PDF (if ≤15 MB) |
| Link expiration | `expires_at` enforced on consent/OTP/decline/signature routes; remind bumps it +30 days |
| Decline flow | Signer can decline with optional reason; document cancelled; owner notified |
| OpenTimestamps | Bitcoin blockchain anchoring via OTS calendars; Netlify Scheduled Function upgrades proofs |

---

## Database migrations

Migrations live in `supabase/migrations/`. Run them in numeric order via the Supabase CLI or dashboard.

The migration `0016_legal_defensibility.sql` adds all columns and tables for the legal defensibility feature set:
- `signature_requests.consent_text_hash`, `consent_given_at`, `expires_at`, `declined_at`, `decline_reason`
- `signing_otps` table (OTP codes for identity verification)
- `signatures.evidence_mac`, `otp_verified`, `ots_proof`, `ots_pending`, `ots_upgraded_at`, `ots_bitcoin_block`
- `documents.certificate_pdf_path`, `final_document_hash`
