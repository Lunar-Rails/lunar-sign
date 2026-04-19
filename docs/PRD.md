# Document Signing Portal – Product Requirements

This document describes the functional requirements for **Lunar Sign**, an internal document e-signing system used by Lunar Rails.

For **authorization behavior** (roles, companies, admin scope), see [RBAC.md](./RBAC.md).

---

## 1. Goals

End-to-end workflow:

1. User signs in
2. User uploads a document (and may associate it with one or more **companies** / workspaces)
3. User adds signers and (where applicable) prepares fields
4. User sends the document for signing
5. Signers receive email with a secure link
6. Signers complete identity checks and sign
7. Final signed PDF is produced and stored
8. Notifications go to relevant parties
9. Users can download completed documents and review audit history

---

## 2. Non-goals (not required for current product)

Features intentionally **out of scope** unless listed elsewhere as implemented:

- Per-customer white-label **company branding** of the signing experience
- **Bulk** send to large recipient lists / campaign-style sending
- Multi-step **approval workflow** before signing (routing, approvers)
- Public **HTTP API** for external systems to drive signing (beyond normal app + Supabase)
- **WhatsApp** or non-email primary notification channels
- **Payment** or billing per document
- **Google Drive** (or other cloud) as the system of record for PDFs
- **Sequential** signing order enforcement (signing is parallel; ordering is not a first-class rule)
- A **“manager”** role with permissions between global admin and member (only `admin` and `member` exist today)

---

## 3. Target users

| User | Description |
|------|-------------|
| **Portal user** | Authenticated employee (`profiles`): uploads documents, manages templates, sends for signature, downloads results. |
| **Signing party** | External signer: no portal account; accesses signing via **token link**, completes **consent** and **email OTP** (where enabled), signs or declines. |
| **Admin** | Authenticated user with `profiles.role = 'admin'`: user/company administration and system-wide views. See [RBAC.md](./RBAC.md). |

---

## 4. Functional requirements (current product)

### 4.1 User authentication and access

**Objective:** Only authorized people use the employee portal.

**Requirements:**

- Sign-in via **Google OAuth** (Supabase Auth), with access limited to the intended organization (e.g. company domain), as configured in deployment.
- Two **portal roles**: `admin` and `member` on `profiles` (see [RBAC.md](./RBAC.md)).
- **Document and template visibility** are **not** limited to “only documents I uploaded.” A user sees any document or template they are allowed to access under the **company-linked sharing model** and **ownership rules** enforced by the app and database (RLS). Global **admins** can access all documents/templates per current rules.
- Session lifecycle and sign-out behavior match the deployed auth configuration.

### 4.2 Companies (workspaces)

**Objective:** Organize users and shared access.

**Requirements:**

- **Companies** exist as first-class entities (name, slug, etc.).
- **Membership** links users to companies. **Adding, removing, and listing members** is restricted to **global admins**—there is **no** separate “company admin” role that only manages one company (see [RBAC.md](./RBAC.md)).
- Documents and templates may be **linked** to one or more companies; access for **members** follows those links plus membership.

### 4.3 Templates

**Objective:** Reusable contract PDFs and field layouts.

**Requirements:**

- Users can create and edit **templates** subject to access rules (creator and/or company-linked access).
- Templates can be linked to companies analogously to documents.

### 4.4 Document upload

**Objective:** Store an original PDF and metadata for a signing workflow.

**Requirements:**

- Upload **PDF** files with validation (type, size limits per deployment).
- Capture **title** and optional **description**.
- Associate the document with **zero or more** companies the uploader is allowed to use; uploads validate **membership** for selected companies.
- Persist storage paths and document identifiers; support **soft delete** where implemented.

### 4.5 Document lifecycle and status

**Objective:** Track progress from draft through completion or cancellation.

**Requirements:**

- Status values include at least: **draft**, **pending**, **completed**, **cancelled** (exact set per schema).
- **Send for signing** transitions from draft when business rules are satisfied (signers, fields, etc.).
- **Revocation / cancel** of an in-flight request: pending documents may be **cancelled** by users who **can access** the document (including company-linked access and global admin), with effects on signature requests per implementation.

### 4.6 Signing parties

**Objective:** Collect signatures from people without portal accounts.

**Requirements:**

- One or more **signature requests** per document (name, email, unique **token** link).
- Signers **do not** log into the employee portal.
- **Legal defensibility** features (as implemented): consent capture, **email OTP** verification where required, optional **decline** with reason, **expiry** and reminder behavior per deployment and schema.

### 4.7 Notifications

**Objective:** Inform users and signers at key events.

**Requirements:**

- Email (or configured channel) when documents are **sent** for signing.
- Email when signers **complete** or when the document is **fully signed**.
- **Reminder** emails for pending signatures where the product exposes that action.

### 4.8 Signing process

**Objective:** Capture legally meaningful signatures and integrity data.

**Requirements:**

- Supported capture modes as implemented in the signing UI (draw, type, upload image, etc.).
- Store signature-related metadata (e.g. hash, timestamps, IP/user agent where collected).
- Maintain an **audit trail** of relevant events (see 4.10).

### 4.9 Completed document access

**Objective:** Distribute the final artifact.

**Requirements:**

- Produce a **final** or latest signed PDF per workflow rules.
- **Download** paths for document owners and signers (token-based download where applicable).
- **Certificate of completion** or equivalent summary where implemented.

### 4.10 Audit trail

**Objective:** Support operational and compliance review.

**Requirements:**

- Record state-changing actions (upload, send, sign, decline, cancel, role changes, etc.) in an **append-only** audit log with actor, entity, and metadata as implemented.

### 4.11 Dashboard and navigation

**Objective:** Find and act on documents and templates.

**Requirements:**

- List documents with filters appropriate to the deployment (e.g. **all accessible** vs **per-company** view).
- Search and status summaries as implemented.
- **Admin** section for global administrators only (user management, invitations, cross-company views as implemented).

---

## 5. Deferred / future enhancements

*Examples of capabilities that may be expanded later; not commitments.*

- Deeper **retraction** workflows and richer cancellation notifications to all parties
- **Drive** or external archive integrations
- **Stricter** multi-tenant isolation or **company-scoped** admin roles (not present today)
- Additional **roles** or fine-grained permissions
