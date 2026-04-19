# Role-Based Access Control — Specification

This document specifies how **authorization** is modeled and enforced for Lunar Sign: portal users, companies, documents, templates, and non-portal signers.

## 1. Scope

This spec covers:

- **Portal users** authenticated via Supabase Auth (`profiles` and related tables).
- **Row Level Security (RLS)** policies and SQL helper functions in PostgreSQL.
- **Application checks** in Next.js route handlers and `[lib/authorization.ts](../lib/authorization.ts)`.
- **Signer access** via `signature_requests` tokens (no `profiles` row).

It does not define email content, PDF processing, or deployment configuration.

## 2. Roles (`profiles`)


| Column          | Values                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `profiles.role` | `admin` or `member` (default `member`). Defined in `[../supabase/migrations/0001_initial_schema.sql](../supabase/migrations/0001_initial_schema.sql)`. |


### 2.1 Admin (`role = 'admin'`)

Admins may:

- Access routes under `/admin` (layout guard: `[app/(authenticated)/admin/layout.tsx](../app/(authenticated)`/admin/layout.tsx)).
- Manage invitations and user roles (e.g. `[app/api/admin/](../app/api/admin/)`).
- Create, update, and delete **companies** and manage `**company_members`** (RLS uses `get_my_role() = 'admin'`; API routes enforce the same).
- Pass `**can_access_document**` and `**canAccessDocument**`, and `**can_access_template**` / `**canAccessTemplate**`, for every document and template, via the `**isAdmin**` branch in `[lib/authorization.ts](../lib/authorization.ts)` and the `**get_my_role() = 'admin'**` branch in SQL helpers such as `public.can_access_document` and `public.can_access_template` (`[0007_company_members.sql](../supabase/migrations/0007_company_members.sql)`, `[0011_templates.sql](../supabase/migrations/0011_templates.sql)`).

### 2.2 Member (`role = 'member'`)

Members use the main application (documents, templates, upload). Access to specific documents and templates is determined by `**can_access_document**` / `**can_access_template**` (and related checks), not by `member` alone.

## 3. Companies and membership

### 3.1 Companies (`companies`)

- **Insert, update, delete:** Authorized when `get_my_role() = 'admin'` (see `[0003_companies.sql](../supabase/migrations/0003_companies.sql)`, updated in later migrations as applicable).
- **Select:** Authorized for authenticated users who are **members** of that company **or** admins (`public.is_member_of_company(id)` in `[0007_company_members.sql](../supabase/migrations/0007_company_members.sql)`).

### 3.2 Company membership (`company_members`)

- **Select:** A user may read rows where `user_id = auth.uid()`, or admins may read all rows (policies in `[0007_company_members.sql](../supabase/migrations/0007_company_members.sql)`).
- **Insert, delete:** Authorized for `get_my_role() = 'admin'`.
- **API:** List, add, and remove members for a company are implemented under `[app/api/companies/[id]/members/](../app/api/companies/[id]/members/)` with `**profiles.role === 'admin'`** checks in the handler.

### 3.3 Helper: `is_member_of_company(company_id)`

SQL function `public.is_member_of_company(comp_id)` returns true when `auth.uid()` has a row in `company_members` for `comp_id`, or when `get_my_role() = 'admin'` (`[0007_company_members.sql](../supabase/migrations/0007_company_members.sql)`).

The application exposes `**isMemberOfCompany**` in `[lib/authorization.ts](../lib/authorization.ts)`, which queries `company_members` and returns true for admins without requiring a membership row.

## 4. Document access

### 4.1 SQL: `can_access_document(document_id)`

Function `public.can_access_document(doc_id)` (`[0007_company_members.sql](../supabase/migrations/0007_company_members.sql)`) returns true when **any** of the following holds:

1. `get_my_role() = 'admin'`, or
2. The document’s `uploaded_by` equals `auth.uid()`, or
3. There exists a row in `**document_companies`** for that document whose `**company_id**` appears in `**company_members**` for `auth.uid()`.

RLS on `**documents**`, `**document_companies**`, and related tables uses this function (and follow-on migrations) for `SELECT` / `UPDATE` where applicable.

### 4.2 Application: `canAccessDocument`

`[canAccessDocument](../lib/authorization.ts)` mirrors the same three cases using the Supabase client: admin profile, ownership via `documents.uploaded_by`, then `**document_companies**` joined to `**company_members**`.

Route handlers that operate on a document by id call `**canAccessDocument**` (or rely on RLS through the user-scoped client) before performing mutations; examples include `[app/api/documents/[id]/send/route.ts](../app/api/documents/[id]/send/route.ts)`, `[app/api/documents/[id]/route.ts](../app/api/documents/[id]/route.ts)` (delete), `[app/api/signature-requests/route.ts](../app/api/signature-requests/route.ts)`.

### 4.3 Cancel pending document

`[cancel_accessible_pending_document](../supabase/migrations/0013_cancel_accessible_document.sql)` runs as `SECURITY DEFINER` and allows the operation when `public.can_access_document(p_document_id)` is true and the document is in `**pending**` status.

## 5. Template access

### 5.1 SQL: `can_access_template(template_id)`

Function `public.can_access_template(tmpl_id)` (`[0011_templates.sql](../supabase/migrations/0011_templates.sql)`) returns true when **any** of the following holds:

1. `get_my_role() = 'admin'`, or
2. The template exists, `deleted_at` is null, and `created_by = auth.uid()`, or
3. The template is linked via `**template_companies`** to a `**company_id**` that appears in `**company_members**` for `auth.uid()`.

RLS on `**templates**` and `**template_companies**` uses this function.

### 5.2 Application: `canAccessTemplate`

`[canAccessTemplate](../lib/authorization.ts)` implements the same logic for the Supabase server client.

## 6. Enforcement architecture

### 6.1 Row Level Security

Authenticated Supabase clients (browser and server helpers using the user’s JWT) are subject to **RLS**. Policies reference `auth.uid()`, `get_my_role()`, `can_access_document`, `can_access_template`, and `is_member_of_company` as defined in migrations under `[../supabase/migrations/](../supabase/migrations/)`.

### 6.2 Route handlers

API routes obtain the current user via `**supabase.auth.getUser()`**, then apply `**profiles.role**` checks for admin-only endpoints or `**canAccessDocument` / `canAccessTemplate` / `isMemberOfCompany**` for resource-scoped operations.

### 6.3 Service role client

Operations that run without an end-user JWT (e.g. some signer flows, storage or email orchestration, `[getServiceClient()](../lib/supabase/service.ts)`) execute with **service role** privileges. Authorization for those entry points is implemented **in application code** for each route.

## 7. Signers (no portal account)

Signers are not represented in `**profiles`**. A signer is bound to a `**signature_requests**` row with a unique `**token**`. The signing UI and `**/api/sign/***` routes validate the token, request state, consent, OTP, and expiry per route implementation. Writes that must bypass RLS use the **service** Supabase client under server-side validation.

## 8. Internal jobs

HTTP endpoints intended for automation (e.g. `[app/api/internal/ots/upgrade/route.ts](../app/api/internal/ots/upgrade/route.ts)`) authenticate callers with a **shared secret** header (`x-cron-secret`), not with `profiles.role`.

## 9. Summary matrix


| Concept            | Behavior                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| Portal roles       | `profiles.role` ∈ { `admin`, `member` }                                                          |
| Admin              | Full document/template access via SQL and TS helpers; company CRUD; membership CRUD; `/admin` UI |
| Member             | Document/template access via `uploaded_by` / `created_by` or company links + `company_members`   |
| Company visibility | `companies` readable when `is_member_of_company(id)` or admin                                    |
| Document sharing   | `document_companies` links documents to companies; access via `can_access_document`              |
| Template sharing   | `template_companies` links templates to companies; access via `can_access_template`              |
| Signers            | Token-based; service client after validation                                                     |
| Cron / internal    | Shared-secret authentication                                                                     |


