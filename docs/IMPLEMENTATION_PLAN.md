# Lunar Sign — MVP Implementation Plan

This plan covers the implementation of the Lunar Sign MVP as defined in the PRD and non-functional specification. All ambiguities identified during planning have been resolved and reconciled in the spec documents. See [Resolved Decisions](#resolved-decisions) at the end for the full list.

## System Summary

Lunar Sign is an internal document e-signing portal for Lunar Rails employees. Authorized users upload PDF documents, assign external signers (by name and email), and manage the signing lifecycle. Signers receive a secure email link, sign via a browser-based interface (draw, type, or upload), and signatures accumulate across signers into a single final PDF. The system records a full audit trail for compliance.

## Tech Stack

- **Frontend:** Next.js 15+ (App Router) + TypeScript
- **UI:** Tailwind CSS + shadcn/ui + Radix
- **Auth:** Supabase Auth (Google OAuth, domain-restricted)
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **File Storage:** Supabase Storage (private buckets)
- **PDF & Signing UX:** `@drvillo/react-browser-e-signing`
- **Email:** Mailtrap (SMTP/API)
- **Validation:** Zod
- **Deployment:** Vercel

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Next.js App Router                                   │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │ Auth Pages  │  │  Dashboard   │  │ Admin Panel │  │  │
│  │  │ (login,     │  │  (documents, │  │ (users,     │  │  │
│  │  │  callback)  │  │   upload)    │  │  audit log) │  │  │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ Signing Interface (public, token-authenticated) │  │  │
│  │  │ @drvillo/react-browser-e-signing                │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ API Routes (Next.js Route Handlers)             │  │  │
│  │  │ documents/ | signature-requests/ | signatures/  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
  ┌──────────────┐  ┌─────────────────┐  ┌──────────────┐
  │  Supabase    │  │ Supabase        │  │  Mailtrap    │
  │  Auth        │  │ Database +      │  │  (Email)     │
  │  (Google     │  │ Storage         │  │              │
  │   OAuth)     │  │                 │  │              │
  └──────────────┘  └─────────────────┘  └──────────────┘
```

**Key architectural decisions:**

- Signers are **unauthenticated** — they access the signing page via a unique token in the URL. No login required.
- The signing API routes use a **Supabase service role client** to write signature records, since signers don't have Supabase accounts.
- Signatures **accumulate** on the PDF — each signer receives the document with all prior signatures embedded. The `latest_signed_pdf_path` on the documents table tracks the current version.
- Only two roles exist: `admin` and `member`. The document owner is always the authenticated (logged-in) user.

---

## Implementation Phases

### Phase 1: Project Scaffolding (Days 1–2)

**Goal:** Set up the project skeleton with all dependencies, configuration, and dev tooling.

**Tasks:**

1. Initialize Next.js 15+ project with App Router, TypeScript, and Tailwind CSS
2. Install dependencies:
   - `@supabase/supabase-js`, `@supabase/ssr`
   - `@drvillo/react-browser-e-signing`
   - `shadcn/ui` components (Button, Input, DataTable, Dialog, Tabs, DropdownMenu, Card, Badge)
   - `zod` for validation
   - `nodemailer` (or Mailtrap SDK) for email
3. Create `.env.local` template with all required environment variables
4. Create `lib/config.ts` with Zod-validated environment variable access
5. Set up ESLint and Prettier
6. Create project directory structure:
   ```
   app/
     (authenticated)/
       dashboard/
       documents/[id]/
       upload/
       admin/
     login/
     auth/callback/
     sign/[token]/
     api/
       documents/
       signature-requests/
       signatures/
       emails/
   components/
   lib/
     supabase/
     email/
     audit.ts
     schemas.ts
   ```

**Deliverables:** Running dev server with empty route stubs.

---

### Phase 2: Supabase Setup & Authentication (Days 3–5)

**Goal:** Configure Supabase project, run schema migrations, and implement Google OAuth login.

**Tasks:**

1. Create Supabase project and configure Google OAuth (follow `supabase-cookbook.md` Parts 1–3)
2. Run all SQL migrations from the cookbook:
   - `profiles` table with RLS (roles: `admin`, `member`)
   - `documents` table with `description` and `latest_signed_pdf_path` columns
   - `signature_requests` table with `signer_name`, `signer_email`, `token` (no `order` field)
   - `signatures` table (no `signer_id` column)
   - `audit_log` table
   - Storage buckets: `documents`, `signed-documents`
   - All RLS policies
   - Profile auto-creation trigger
3. Create Supabase client utilities:
   - `lib/supabase/client.ts` (browser)
   - `lib/supabase/server.ts` (server components / route handlers)
   - `lib/supabase/service.ts` (service role client for unauthenticated signer operations)
   - `lib/supabase/proxy.ts` (middleware session refresh)
4. Create `middleware.ts` for session management and route protection
5. Implement login page (`app/login/page.tsx` + `GoogleSignInButton`)
6. Implement OAuth callback (`app/auth/callback/route.ts`)
7. Implement sign-out server action
8. Bootstrap first admin user

**Deliverables:** Working login/logout flow with Google OAuth. Authenticated users see a placeholder dashboard. Unauthenticated users are redirected to login.

---

### Phase 3: App Layout & Navigation (Days 6–7)

**Goal:** Build the authenticated shell — navbar, sidebar, and responsive layout.

**Tasks:**

1. Create `app/(authenticated)/layout.tsx` with navbar and content area
2. Build navbar component:
   - Lunar Sign logo/title
   - Navigation links: Dashboard, Upload Document
   - Admin link (visible only to admin role)
   - User menu dropdown (name, email, role badge, sign out)
3. Create shared UI components:
   - `PageHeader` (title + optional actions)
   - `StatusBadge` (colored badge for document/request statuses)
   - `EmptyState` (placeholder for empty lists)
4. Add responsive layout (sidebar collapses on smaller screens)

**Deliverables:** Navigable app shell with role-aware navigation.

---

### Phase 4: Document Upload (Days 8–10)

**Goal:** Users can upload PDF documents and see them in draft status.

**Tasks:**

1. Create upload page (`app/(authenticated)/upload/page.tsx`):
   - Form fields: document title (required), description (optional)
   - Drag-and-drop PDF file input with validation (PDF only, max 50MB)
   - Upload progress indicator
   - Success redirect to document detail page
2. Create upload API route (`app/api/documents/upload/route.ts`):
   - Validate authentication
   - Validate file type and size (Zod schema)
   - Upload PDF to Supabase Storage: `documents/{user_id}/{document_id}/original.pdf`
   - Insert document record with status `draft`
   - Create audit log entry (`document_uploaded`)
   - Return document object
3. Create `lib/audit.ts` utility:
   - `logAudit(actorId, action, entityType, entityId, metadata)` function
   - Inserts into `audit_log` table
4. Create `lib/schemas.ts` with Zod schemas:
   - `DocumentUploadSchema` (title, description)
   - `SignerSchema` (name, email)

**Deliverables:** User can upload a PDF, see it stored in Supabase, and the audit log records the upload.

---

### Phase 5: Signer Management & Document Sending (Days 11–14)

**Goal:** Users can add signers to a document and send it for signing.

**Tasks:**

1. Create document detail page (`app/(authenticated)/documents/[id]/page.tsx`):
   - Display document metadata (title, description, status, created date)
   - Show PDF preview (using library's `PdfViewer` in read-only mode)
   - Signer management section (add/remove signers when status is `draft`)
   - "Send for Signing" action button
   - Status timeline (draft → pending → completed)
2. Create signer management component:
   - Form to add signer: name (required), email (required, validated)
   - List of added signers with remove button
   - Disable editing when document status is not `draft`
3. Create signature request API route (`app/api/signature-requests/route.ts`):
   - POST: Create signature_request records for each signer
   - Each record gets an auto-generated `token` (UUID)
   - Generates signing URL: `/sign/{token}`
   - Create audit log entry (`signers_added`)
4. Create "send document" API route (`app/api/documents/[id]/send/route.ts`):
   - Validate document has at least one signer
   - Update document status from `draft` to `pending`
   - Trigger email notifications to all signers (see Phase 7)
   - Create audit log entry (`document_sent`)
5. Create documents list on dashboard (`app/(authenticated)/dashboard/page.tsx`):
   - Statistics cards: total, draft, pending, completed
   - Filterable/sortable data table of documents
   - Search by title
   - Filter by status and date range
   - Click to navigate to document detail

**Deliverables:** Full document management flow — upload, add signers, send. Dashboard shows all documents with filtering.

---

### Phase 6: Signing Interface (Days 15–20)

**Goal:** External signers can view and sign documents via a secure link.

This is the most complex phase and the core of the product.

**Tasks:**

1. Create signing page (`app/sign/[token]/page.tsx`):
   - This is a **public route** (no auth required)
   - Server component validates the token against `signature_requests` table
   - If token invalid or request already signed → show error/already-signed page
   - Fetch the PDF to sign:
     - If `latest_signed_pdf_path` exists on the document → fetch that (accumulated signatures)
     - Otherwise → fetch original from `file_path`
   - Pass PDF bytes to client signing component
   - Create audit log entry (`document_viewed`) — use service role client
2. Create `SigningInterface` client component (`components/SigningInterface.tsx`):
   - Initialize library: `configure({ pdfWorkerSrc: getPdfWorkerSrc() })`
   - Load PDF with `usePdfDocument` hook
   - Use `PatternA_desktopStickySidebar` layout:
     - Left: PDF viewer with `PdfViewer` + `PdfPageNavigator`
     - Right: Sidebar with signing controls
   - Field placement: `FieldOverlay` + `SignatureField` + `useFieldPlacement`
   - Signer details: `SignerDetailsPanel` (pre-filled with signer name from request)
   - Signature capture (three modes):
     - Freehand: `SignaturePad`
     - Typed: `SignaturePreview` with `useSignatureRenderer`
     - Upload: file input accepting image files
   - Confirm & Sign button
3. Create signing submission API route (`app/api/signatures/route.ts`):
   - Uses **service role** Supabase client (signer is unauthenticated)
   - Accepts: request token, signature data, field placements, signer details
   - Re-validates token and checks request is still `pending`
   - Calls `modifyPdf()` with the current PDF bytes + signature data
   - Uploads signed PDF to Supabase Storage: `signed-documents/{document_id}/{request_id}_signed.pdf`
   - Updates `documents.latest_signed_pdf_path` to the new signed PDF
   - Creates `signatures` record (hash, IP, user agent, signed PDF path)
   - Updates `signature_requests.status` to `signed` and sets `signed_at`
   - Creates audit log entry (`document_signed`)
   - Checks if all requests for this document are now `signed`:
     - If yes: update document status to `completed`, set `completed_at`
     - Create audit log entry (`document_completed`)
     - Trigger completion emails to all parties
   - Returns success with `SigningComplete` component data
4. Create signing complete page/state:
   - Use library's `SigningComplete` component
   - Show confirmation message and download link for the signed PDF
   - If document fully completed, indicate all parties have signed

**Deliverables:** End-to-end signing flow. Signer clicks link → views PDF → places signature → signs → PDF is modified and stored. Signatures accumulate across multiple signers.

---

### Phase 7: Email Notifications (Days 21–23)

**Goal:** Send transactional emails at key workflow events.

**Tasks:**

1. Create email client (`lib/email/client.ts`):
   - Configure Mailtrap SMTP connection
   - Environment variables: `MAILTRAP_HOST`, `MAILTRAP_PORT`, `MAILTRAP_USER`, `MAILTRAP_PASSWORD`, `EMAIL_FROM`
2. Create email templates (`lib/email/templates.ts`):
   - **Signature Request:** "You've been asked to sign [Document Title]"
     - Includes: document title, requester name, signing link, call-to-action button
   - **Signature Confirmation:** "[Signer Name] has signed [Document Title]"
     - Sent to document owner when each signer completes
   - **All Parties Signed:** "[Document Title] is fully signed"
     - Sent to document owner and all signers
     - Includes download link to final signed PDF
3. Create email API routes:
   - `app/api/emails/send-request/route.ts` — triggered when document is sent
   - `app/api/emails/send-completion/route.ts` — triggered when all signers finish
4. Integrate email triggers into existing flows:
   - Document send flow (Phase 5) → send request emails
   - Signing completion (Phase 6) → send confirmation and completion emails

**Deliverables:** Automated emails at document send, individual sign, and full completion.

---

### Phase 8: Admin Panel (Days 24–26)

**Goal:** Admin users can view all documents, manage user roles, and inspect audit logs.

**Tasks:**

1. Create admin layout with route guard (redirect non-admins):
   - `app/(authenticated)/admin/layout.tsx`
2. Admin dashboard (`app/(authenticated)/admin/page.tsx`):
   - System statistics: total users, total documents, documents by status
3. User management (`app/(authenticated)/admin/users/page.tsx`):
   - List all users from `profiles` table
   - Display: name, email, role, created date
   - Action: toggle role between `admin` and `member`
   - API route: `app/api/admin/users/[id]/role/route.ts`
   - Audit log entry (`user_role_changed`)
4. Audit log viewer (`app/(authenticated)/admin/audit-log/page.tsx`):
   - Paginated table of all audit events
   - Columns: timestamp, actor, action, entity type, entity ID
   - Expandable rows showing full metadata (JSON)
   - Filters: action type, date range
5. All documents view (`app/(authenticated)/admin/documents/page.tsx`):
   - Same as dashboard document table but shows ALL documents across users

**Deliverables:** Admin can manage users, view system-wide documents, and inspect the full audit trail.

---

### Phase 9: Document Completion & Download (Days 27–28)

**Goal:** Completed documents are downloadable by the owner and all signers receive the final copy.

**Tasks:**

1. Update document detail page for completed documents:
   - Show "Completed" status with completion date
   - Download button for final signed PDF
   - List all signers with their signing timestamps
   - View audit trail for this document
2. Create signed PDF download API route (`app/api/documents/[id]/download/route.ts`):
   - Validate document owner or admin
   - Generate signed URL for the final PDF from Supabase Storage
   - Return redirect to signed URL
3. Create public download route for signers (`app/api/download/[token]/route.ts`):
   - Validate token belongs to a completed document
   - Generate signed URL for the final PDF
   - Return redirect

**Deliverables:** Document owner and signers can download the final signed PDF.

---

### Phase 10: Error Handling & Polish (Days 29–31)

**Goal:** Robust error handling, loading states, and edge case coverage.

**Tasks:**

1. Create error boundaries:
   - `app/error.tsx` (global error boundary)
   - `app/not-found.tsx` (404 page)
   - `app/sign/[token]/error.tsx` (signing-specific errors)
2. Create standardized API error responses:
   - Consistent format: `{ success, data?, error?, message? }`
   - Proper HTTP status codes (400, 401, 403, 404, 500)
3. Add loading states:
   - Skeleton loaders for dashboard and document detail
   - Loading spinner for PDF rendering
   - Disabled buttons during submission
4. Edge case handling:
   - Duplicate signer email on same document → reject
   - Upload non-PDF file → client + server validation
   - Token for already-signed request → show "already signed" message
   - Token for non-existent request → 404
   - Concurrent signing (two signers submit at same time) → database transaction with row locking on `latest_signed_pdf_path` update
5. Accessibility pass:
   - Keyboard navigation on all interactive elements
   - ARIA labels on icons and action buttons
   - Focus management on modals and form submissions

**Deliverables:** Production-quality error handling and a polished user experience.

---

### Phase 11: Testing & Deployment (Days 32–35)

**Goal:** Validate the full flow and deploy to Vercel.

**Tasks:**

1. Manual testing checklist:
   - [ ] Login with Google OAuth → redirected to dashboard
   - [ ] Upload PDF → appears in dashboard as draft
   - [ ] Add 2+ signers → signers listed on document detail
   - [ ] Send document → status changes to pending, emails received
   - [ ] Signer 1 clicks link → views PDF with no prior signatures
   - [ ] Signer 1 signs (draw) → receives confirmation
   - [ ] Signer 2 clicks link → views PDF with Signer 1's signature visible
   - [ ] Signer 2 signs (type) → document status changes to completed
   - [ ] Completion email received by owner and both signers
   - [ ] Owner downloads final PDF → contains both signatures
   - [ ] Admin can view all documents and audit logs
   - [ ] Admin can change user roles
   - [ ] Non-admin cannot access admin panel
   - [ ] Invalid token shows error page
   - [ ] Already-signed token shows "already signed" message
2. Deployment preparation:
   - Set production environment variables in Vercel
   - Update Supabase redirect URLs for production domain
   - Update Google OAuth origins for production domain
   - Configure Mailtrap for production sending
3. Deploy to Vercel
4. Post-deployment verification:
   - Run through manual testing checklist on production
   - Verify audit logs are recording correctly
   - Verify emails are delivered

**Deliverables:** Deployed, validated MVP on Vercel.

---

## Resolved Decisions

These ambiguities were identified during planning and have been resolved. The PRD and non-functional spec have been updated to reflect these decisions.

| # | Issue | Resolution |
|---|---|---|
| 1 | Google Drive in workflow vs. post-MVP | **Removed from MVP workflow.** Step 8 now reads "Stored in Supabase Storage." Google Drive integration remains post-MVP. |
| 2 | `order` field on signature_requests | **Dropped from MVP schema.** Sequential signing is post-MVP. All signers receive the document in parallel. |
| 3 | Multi-signer PDF accumulation | **Signatures accumulate.** Each signer receives the PDF with all prior signatures. `documents.latest_signed_pdf_path` tracks the current version. Final PDF contains all signatures. |
| 4 | Manager role undefined | **Removed from MVP.** Only `admin` and `member` roles exist. Manager role is deferred to post-MVP. |
| 5 | Document decline flow | **Schema field kept, UI deferred.** The `declined` status remains in the `signature_requests` check constraint for future use, but no UI triggers it in MVP. |
| 6 | Reminder email timing | **Deferred to post-MVP.** MVP sends emails on document send and completion only. |
| 7 | Missing description column | **Added to data model.** `documents.description` (optional text) added to non-functional spec and Supabase cookbook. |
| 8 | Signing link expiry | **Deferred to post-MVP.** Signing links do not expire in MVP. Links become effectively invalid once the request status changes to `signed`. |
| 9 | Signers don't need accounts | **Confirmed.** `signature_requests` now stores `signer_name` and `signer_email` directly instead of a FK to profiles. Signing page is a public route authenticated by token only. Signature writes use a Supabase service role client. |
| 10 | Admin capabilities (MVP) | **Limited scope.** Admins can view all documents, view audit logs, and manage user roles. Admins cannot edit, delete, or cancel other users' documents. |
| 11 | Document statuses (PRD vs. spec) | **Aligned.** PRD now uses `draft`, `pending`, `completed` (matching the non-functional spec). `cancelled` remains in the schema check constraint for post-MVP use. |
| 12 | Audit log retention | **Indefinite for MVP.** Compliance review will determine formal retention policy post-MVP. |

---

## File Structure (Final)

```
lunar-sign/
├── app/
│   ├── (authenticated)/
│   │   ├── layout.tsx                    # Authenticated shell (navbar, sidebar)
│   │   ├── dashboard/
│   │   │   └── page.tsx                  # Document list + stats
│   │   ├── upload/
│   │   │   └── page.tsx                  # Upload form
│   │   ├── documents/
│   │   │   └── [id]/
│   │   │       └── page.tsx              # Document detail + signer management
│   │   └── admin/
│   │       ├── layout.tsx                # Admin route guard
│   │       ├── page.tsx                  # Admin dashboard
│   │       ├── users/
│   │       │   └── page.tsx              # User management
│   │       ├── documents/
│   │       │   └── page.tsx              # All documents (admin view)
│   │       └── audit-log/
│   │           └── page.tsx              # Audit log viewer
│   ├── login/
│   │   ├── page.tsx                      # Login page (server component)
│   │   └── google-sign-in-button.tsx     # OAuth button (client component)
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts                  # OAuth callback handler
│   ├── sign/
│   │   └── [token]/
│   │       ├── page.tsx                  # Public signing page
│   │       └── error.tsx                 # Signing error boundary
│   ├── api/
│   │   ├── documents/
│   │   │   ├── upload/
│   │   │   │   └── route.ts             # POST: upload document
│   │   │   └── [id]/
│   │   │       ├── send/
│   │   │       │   └── route.ts         # POST: send for signing
│   │   │       └── download/
│   │   │           └── route.ts         # GET: download signed PDF
│   │   ├── signature-requests/
│   │   │   └── route.ts                 # POST: create signature requests
│   │   ├── signatures/
│   │   │   └── route.ts                 # POST: submit signature (service role)
│   │   ├── download/
│   │   │   └── [token]/
│   │   │       └── route.ts             # GET: signer download (public)
│   │   ├── emails/
│   │   │   ├── send-request/
│   │   │   │   └── route.ts             # POST: send signing request emails
│   │   │   └── send-completion/
│   │   │       └── route.ts             # POST: send completion emails
│   │   └── admin/
│   │       └── users/
│   │           └── [id]/
│   │               └── role/
│   │                   └── route.ts     # PATCH: update user role
│   ├── error.tsx                         # Global error boundary
│   ├── not-found.tsx                     # 404 page
│   └── layout.tsx                        # Root layout
├── components/
│   ├── SigningInterface.tsx              # Main signing UI (client component)
│   ├── DocumentTable.tsx                 # Reusable document data table
│   ├── SignerForm.tsx                    # Add signer form
│   ├── StatusBadge.tsx                   # Document/request status badge
│   ├── PageHeader.tsx                    # Page title + actions
│   └── EmptyState.tsx                    # Empty list placeholder
├── lib/
│   ├── supabase/
│   │   ├── client.ts                    # Browser client
│   │   ├── server.ts                    # Server component client
│   │   ├── service.ts                   # Service role client
│   │   └── proxy.ts                     # Middleware session refresh
│   ├── email/
│   │   ├── client.ts                    # Mailtrap connection
│   │   └── templates.ts                 # Email HTML templates
│   ├── audit.ts                         # Audit logging utility
│   ├── schemas.ts                       # Zod validation schemas
│   └── config.ts                        # Environment variable validation
├── middleware.ts                         # Auth + session middleware
├── docs/
│   ├── PRD.md
│   ├── non-functional-spec.md
│   ├── supabase-cookbook.md
│   └── IMPLEMENTATION_PLAN.md           # This file
└── .env.local.example                   # Environment variable template
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email (Mailtrap)
MAILTRAP_HOST=
MAILTRAP_PORT=
MAILTRAP_USER=
MAILTRAP_PASSWORD=
EMAIL_FROM=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Estimated Timeline

| Phase | Description | Days | Cumulative |
|---|---|---|---|
| 1 | Project Scaffolding | 2 | 2 |
| 2 | Supabase Setup & Authentication | 3 | 5 |
| 3 | App Layout & Navigation | 2 | 7 |
| 4 | Document Upload | 3 | 10 |
| 5 | Signer Management & Document Sending | 4 | 14 |
| 6 | Signing Interface | 6 | 20 |
| 7 | Email Notifications | 3 | 23 |
| 8 | Admin Panel | 3 | 26 |
| 9 | Document Completion & Download | 2 | 28 |
| 10 | Error Handling & Polish | 3 | 31 |
| 11 | Testing & Deployment | 4 | 35 |
| **Total** | | **35 days** | |
