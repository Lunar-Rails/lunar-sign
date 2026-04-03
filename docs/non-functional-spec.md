# Lunar Sign — Non-Functional Specification

## System Overview

Lunar Sign is an internal document signing application for BCOMM employees. It allows authorized users to upload documents, request signatures from other employees, and track signing status. It is not customer-facing and does not handle regulated transactions.

**Owner:** _[To be assigned before deployment — required by vibe coding guidelines]_

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | Approved internal tool stack |
| UI | Tailwind CSS + shadcn/ui + Radix | Accessible component library, rapid development |
| Auth | Supabase Auth (Google OAuth) | Domain-restricted SSO, zero custom auth code |
| Database | Supabase (PostgreSQL) | RLS for row-level authorization |
| File Storage | Supabase Storage | Same SDK, RLS on buckets, S3-compatible |
| PDF & Signing UX | `@drvillo/react-browser-e-signing` | See [Signing Library](#signing-library) |
| Deployment | Vercel | Confirm with IT & Design before go-live |
| Email | Mailtrap (SMTP/API) | Transactional email delivery for signature notifications |
| Validation | Zod | Schema validation for all inputs and API responses |

## Signing Library

All PDF rendering, field placement, signature capture, and PDF modification MUST use [`@drvillo/react-browser-e-signing`](https://github.com/drvillo/react-browser-e-signing). This application MUST NOT reimplement any logic that the library already provides.

### What the library provides (do not reimplement)

| Capability | Library surface |
|---|---|
| PDF viewing with zoom and page navigation | `PdfViewer`, `PdfPageNavigator`, `usePdfDocument` |
| Signature field placement (drag, resize) | `FieldOverlay`, `SignatureField`, `FieldPalette`, `useFieldPlacement` |
| Typed signatures with handwriting fonts | `SignaturePreview`, `useSignatureRenderer` |
| Freehand drawn signatures | `SignaturePad` |
| Signer details capture (name, title) | `SignerDetailsPanel` |
| PDF modification (embedding signatures) | `modifyPdf` utility |
| SHA-256 document hash for integrity | `sha256` utility |
| Completion summary with download | `SigningComplete` |

### What this application owns (not in the library)

| Capability | Application responsibility |
|---|---|
| Authentication and session management | Supabase Auth + Google OAuth |
| Document upload and storage | Supabase Storage |
| Signature request workflow (create, assign, track) | Application database + API routes |
| Multi-signer orchestration | Application state + database |
| Role-based access control | Supabase RLS + profiles table |
| Audit logging | Application database |
| Email notifications | Mailtrap (signature requests, reminders, completion) |
| Layout, routing, navigation | Next.js App Router |

### Integration approach

- The library is browser-only. All signing UX components must be loaded client-side (`'use client'` or `dynamic(..., { ssr: false })`).
- PDF worker setup: call `configure({ pdfWorkerSrc: getPdfWorkerSrc() })` once on the client, not during SSR.
- Use `PatternA_desktopStickySidebar` from the library's integration guidelines for the primary signing view (desktop-first internal tool).
- Style library components using `[data-slot]` selectors with Tailwind or by importing `@drvillo/react-browser-e-signing/styles.css` as a baseline.
- Signature fonts: use `fontMode: 'local-only'` if the deployment environment restricts outbound network requests; otherwise default `'network'` mode is acceptable for an internal Vercel deployment.

### Data flow between application and library

```
1. Application fetches PDF from Supabase Storage → ArrayBuffer
2. ArrayBuffer passed to usePdfDocument → pdfData, pageDimensions
3. User places fields via FieldOverlay + useFieldPlacement → FieldPlacement[]
4. User configures signature via SignaturePreview/SignaturePad → signatureDataUrl
5. User confirms → application calls modifyPdf({ pdfBytes, fields, signer, signatureDataUrl, pageDimensions })
6. modifyPdf returns signed PDF bytes + sha256 hash
7. Application uploads signed PDF to Supabase Storage
8. Application records signature metadata (hash, timestamp, IP, user agent) in database
```

## Authentication & Authorization

| Requirement | Implementation |
|---|---|
| Only BCOMM employees can access the system | Google OAuth restricted to company domain |
| Session management | Supabase Auth handles JWT + refresh tokens |
| Role-based access | `role` column on `profiles` table, enforced via Supabase RLS |
| Initial roles | `admin`, `manager`, `member` |
| Role assignment | Admins assign roles via admin panel; first user bootstrapped as admin |

## Data Model

```
profiles
  id            uuid (FK to auth.users)
  email         text
  full_name     text
  role          text ('admin' | 'manager' | 'member')
  created_at    timestamptz

documents
  id            uuid
  title         text
  file_path     text (Supabase Storage path)
  uploaded_by   uuid (FK to profiles)
  status        text ('draft' | 'pending' | 'completed' | 'cancelled')
  created_at    timestamptz
  completed_at  timestamptz

signature_requests
  id            uuid
  document_id   uuid (FK to documents)
  signer_id     uuid (FK to profiles)
  requested_by  uuid (FK to profiles)
  status        text ('pending' | 'signed' | 'declined')
  order         int (signing order, if sequential)
  signed_at     timestamptz
  created_at    timestamptz

signatures
  id            uuid
  request_id    uuid (FK to signature_requests)
  signer_id     uuid (FK to profiles)
  signature_data text (base64 PNG or SVG path data)
  document_hash text (SHA-256 from library's sha256 utility)
  signed_pdf_path text (Supabase Storage path to modified PDF)
  ip_address    text
  user_agent    text
  signed_at     timestamptz

audit_log
  id            uuid
  actor_id      uuid (FK to profiles)
  action        text
  entity_type   text
  entity_id     uuid
  metadata      jsonb
  created_at    timestamptz
```

## Non-Functional Requirements

### Performance

- Page load (LCP) < 2s on corporate network
- PDF render < 3s for documents up to 10MB (handled by library's `PdfViewer` + pdf.js)
- Signature capture latency < 50ms (handled by library's `SignaturePad` canvas)
- `modifyPdf` execution < 2s for typical documents (handled by library's pdf-lib integration)

### Security

- All traffic over HTTPS (Vercel default)
- Supabase RLS enforces row-level authorization at the database layer
- File access via signed URLs with short expiry (1 hour)
- Signature records include IP address, user agent, and document SHA-256 hash for non-repudiation
- Document integrity verifiable via stored SHA-256 hash (produced by library's `sha256` utility)
- Audit log captures all state-changing operations
- No PII stored beyond what Supabase Auth already holds (name, email)
- Secrets stored in environment variables, never in code or repositories

### Availability

- Vercel + Supabase managed infrastructure; no SLA commitment for MVP
- Acceptable downtime: best-effort during business hours

### Scalability

- MVP targets < 50 concurrent users (BCOMM internal)
- Supabase free/pro tier is sufficient
- No architectural blockers to scaling if needed

### Auditability

- Every document upload, signature request, signing event, and status change is logged in `audit_log`
- Satisfies the Compliance team's requirement that operational tools maintain audit trails
- Logs are append-only; no delete operations on audit records

### Data Retention

- Signed documents retained indefinitely (or per policy set by Compliance/Legal)
- Audit logs retained for minimum 7 years (confirm with Compliance)
- Draft documents older than 90 days can be auto-archived

### Observability

- Vercel built-in analytics for web vitals
- Supabase dashboard for database and storage metrics
- Library warnings surfaced via `configure({ onWarning })` and logged to console/error tracker

## Governance Alignment

Per BCOMM vibe coding guidelines and approved tech stack:

- **Named owner required** — designate a person as the tool owner before deploying
- **README** — must document what the tool does, what data it touches, and how to stop it
- **Hosting approval** — confirm Vercel deployment with IT & Design before go-live
- **Data storage approval** — confirm Supabase as the data store with IT & Design
- **No regulated data** — this tool signs internal documents (policies, agreements, approvals), not regulated financial transactions
- **6-month review** — if the tool is still in use after 6 months, IT & Design should review for graduation to a formally maintained system
- **No customer data** — the system handles only employee identities and internal documents

## Deferred to v2+

| Feature | Why Deferred |
|---|---|
| Google Drive integration (import/export) | High complexity, not needed for core signing flow |
| Slack notifications | Email covers MVP notification needs |
| Sequential signing workflows | MVP supports parallel signing; sequential adds ordering logic |
| Document templates | MVP is upload-and-sign; templates are a workflow enhancement |
| Advanced RBAC (team-scoped permissions) | Role enum is sufficient for < 50 users |
| Mobile-optimized signing (`pageMode: 'single'`) | Desktop-first for internal use; library supports this when needed |
| Digital certificate-based signatures (eIDAS/PKI) | Visual e-signatures with SHA-256 integrity are sufficient for internal documents |
