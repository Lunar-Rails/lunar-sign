# E-Signature Scheme

This document describes how Lunar Sign generates, validates, and records electronic signatures after the P0/P1 legal-defensibility hardening.

---

## Overview

Lunar Sign implements a **bearer-token-gated e-signature scheme** with a layered legal-defensibility stack:

| Layer | Mechanism |
|---|---|
| Consent | Explicit consent + disclosure before any signing action |
| Identity | Email OTP verification (6-digit, 15-min TTL, 5-attempt lockout) |
| Document integrity | SHA-256 of the original and signed PDFs |
| Evidence integrity | HMAC-SHA256 over the canonical signing event, keyed by `EVIDENCE_HMAC_KEY` |
| Certificate | pdf-lib Certificate of Completion page appended to the final PDF |
| Timestamping | Bitcoin blockchain anchoring via OpenTimestamps (async, cron-driven) |
| Audit trail | Append-only `audit_log` table, immutable via RLS |

---

## Signing Flow

```
Signer opens /sign/[token]
  ↓
Expiry check  → 410 if link expired
  ↓
Consent gate  → redirect to /consent if not yet consented
  ↓
OTP gate      → redirect to /otp if OTP not yet verified
  ↓
Signing UI    (place fields, draw/type signature)
  ↓
Intent dialog → confirm intent to sign
  ↓
POST /api/signatures
  ├─ Validate: token, OTP verified, link not expired
  ├─ Download original PDF → SHA-256 (originalDocumentHash)
  ├─ Hash signed PDF → SHA-256 (signedDocumentHash)
  ├─ Hash signature image → SHA-256 (signatureImageHash)
  ├─ Compute evidence_mac = HMAC-SHA256(canonical_fields, EVIDENCE_HMAC_KEY)
  ├─ Upload signed PDF to signed-documents bucket
  ├─ Insert signature row (ots_pending=true, otp_verified=true)
  ├─ Update signature_request (status=signed)
  └─ If all signers signed:
       ├─ Fetch all signature rows for CoC
       ├─ Append Certificate of Completion page (pdf-lib)
       ├─ Upload CoC PDF, store certificate_pdf_path + final_document_hash
       ├─ Mark document completed
       └─ Send completion emails (PDF attached if ≤15 MB)
```

---

## Data Model

```
documents
  id, title, file_path, status, latest_signed_pdf_path, uploaded_by
  certificate_pdf_path  ← path to the CoC PDF (set on completion)
  final_document_hash   ← SHA-256 of the CoC PDF

signature_requests                              ← one row per signer per document
  id, document_id, signer_name, signer_email
  status       : pending | signed | cancelled
  token        : uuid (gen_random_uuid())       ← the bearer credential
  consent_given_at, consent_text_hash           ← records which copy was agreed to
  expires_at                                    ← default now()+30d, bumped on remind
  declined_at, decline_reason                   ← set when signer declines

signing_otps                                    ← one row per signature_request
  request_id (FK), code_hash (SHA-256), sent_to
  expires_at, verified_at, attempts

signatures                                      ← one row written at signing time
  id, request_id
  signature_data        : base64 image of the drawn/typed signature
  original_document_hash: sha256 of the source PDF (pre-signing)
  document_hash         : sha256 of the signed PDF (post-signing)
  signature_image_hash  : sha256 of the raw signature image bytes
  evidence_hash         : plain SHA-256 (legacy; kept for one release)
  evidence_mac          : HMAC-SHA256 keyed by EVIDENCE_HMAC_KEY (canonical)
  otp_verified          : bool (true when signer passed email OTP)
  signed_pdf_path       : storage path of the baked PDF
  ip_address, user_agent, signed_at
  ots_proof             : serialized OTS proof bytes (bytea)
  ots_pending           : true while awaiting Bitcoin confirmation
  ots_upgraded_at       : when Bitcoin block was confirmed
  ots_bitcoin_block     : Bitcoin block height of attestation

audit_log                                       ← immutable append-only
  id, actor_id, action, resource_type, resource_id, metadata, created_at
```

---

## Evidence MAC

The evidence MAC is computed as:

```
HMAC-SHA256(
  key = EVIDENCE_HMAC_KEY (64 hex chars = 32 bytes),
  message = join('\n', [
    signerEmail,
    signerName,
    signatureImageHash,
    originalDocumentHash,
    signedDocumentHash,
    signedAt (ISO 8601),
    consentTextHash (sha256 of version+copy),
    otpVerified ('true'|'false'),
  ])
)
```

The key is stored outside the database as an environment variable. A verifier who possesses the key can independently recompute the MAC and confirm the signing event was not tampered with.

---

## Certificate of Completion

When every signer has signed, Lunar Sign:

1. Downloads the latest signed PDF (with all signature ink layers).
2. Appends a **Certificate of Completion** page using pdf-lib containing:
   - Document title and ID
   - SHA-256 of the original (unsigned) document
   - SHA-256 of the final signed document
   - Per-signer table: name, email, signed timestamp, IP address, OTP status, `evidence_mac`
3. Uploads the CoC PDF and stores `certificate_pdf_path` + `final_document_hash` on the document.
4. Both download routes (`/api/documents/[id]/download` and `/api/download/[token]`) serve the CoC PDF in preference to the plain signed PDF.

---

## OpenTimestamps

Every signature row is inserted with `ots_pending = true`. A Netlify Scheduled Function
(every 30 minutes) calls `POST /api/internal/ots/upgrade`:

- **Phase 1** — for rows where `ots_pending=true AND ots_proof IS NULL`:
  stamps `evidence_mac` on the configured OTS calendars and stores the
  serialized proof in `ots_proof`.
- **Phase 2** — for rows where `ots_pending=true AND ots_proof IS NOT NULL`:
  attempts to upgrade the proof from the calendars. When a Bitcoin block
  attestation is found, sets `ots_pending=false`, `ots_upgraded_at`, and
  `ots_bitcoin_block`.

The OTS proof is independently verifiable using the [OpenTimestamps client](https://opentimestamps.org/).

---

## Security Properties

| Property | Guaranteed | Mechanism |
|---|---|---|
| Document not altered after upload | Yes | Original SHA-256 stored at signature time |
| Signed PDF matches what signer saw | Yes | SHA-256 of signed PDF stored |
| Signer identity | Probable | Email delivery of OTP code |
| Tamper-evident evidence record | Yes | HMAC-SHA256 with external key |
| Timestamp integrity | Yes (after upgrade) | Bitcoin blockchain via OpenTimestamps |
| Audit log immutability | Yes | RLS: INSERT only, no UPDATE/DELETE |
| Link expiration | Yes | `expires_at` enforced server-side |
| Consent recorded | Yes | `consent_given_at` + `consent_text_hash` |

---

## Not in scope (by design)

- **PKI digital signatures** — not required for Simple Electronic Signature (SES) under ESIGN/eIDAS.
- **Qualified Electronic Signature (QES)** — would require a qualified trust service provider.
- **Video/biometric identity verification** — beyond MVP scope.
