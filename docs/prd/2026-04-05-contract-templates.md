# PRD: Contract Templates

## 1. Context

### Problem

LunarSign currently supports a single document lifecycle: upload a PDF → add signers → send for signature → collect signatures. Every contract starts from scratch — users must upload a fully-prepared PDF each time. Organizations that repeatedly sign similar contracts (NDAs, employment agreements, service contracts) have no way to maintain reusable document templates within the platform.

### Why now

This is a foundational capability for any e-signing product. Without templates, LunarSign is a signing utility rather than a document management platform. Templates unlock:
- Reduced time-to-signature for recurring contract types
- Consistency across contracts of the same type
- A natural organizational hierarchy (company → templates → contracts)

### Assumptions

- Users have access to pre-formatted PDF documents they want to use as templates
- The existing `@drvillo/react-browser-e-signing` library will remain the signing engine; template features are built around it, not inside it
- `pdf-lib` (already an indirect dependency via the signing library) is suitable for server-side PDF manipulation
- The current Supabase + PostgreSQL stack is sufficient for metadata storage

---

## 2. Goals

### Goals

- Allow admins to upload PDF-based contract templates with defined field placeholders
- Support two field categories: **owner-fill** (filled at contract creation) and **signer-fill** (filled during signing)
- Enable members to create signature-ready contracts from templates by filling owner-fill fields
- Provide clear navigation: company → templates → contracts, with lineage tracking
- Migrate the existing `document_types` concept from documents to templates; contracts inherit type via their template relationship

### Non-goals

- Template versioning (future consideration)
- Template duplication/cloning
- Import/export of templates between companies
- Bulk contract creation from a single template
- HTML/JSON-based template editing or rich text template authoring
- Modifying the `@drvillo/react-browser-e-signing` library

---

## 3. Users & Use cases

### Personas

| Persona | Role | Key activities |
|---------|------|---------------|
| **Company Admin** | `admin` + company member | Creates, edits, deletes templates; defines fields; creates contracts from templates; manages template metadata |
| **Company Member** | `member` + company member | Browses company templates; creates contracts from templates; manages own contracts |
| **External Signer** | Unauthenticated (via token) | Signs contracts (unchanged from current flow) |

### User stories

1. **As an admin**, I want to upload a PDF and define placeholder fields on it so that my team can reuse it for future contracts.
2. **As an admin**, I want to specify which fields are filled by the contract creator vs. by signers, and how many signers are required, so the template encodes the full signing workflow.
3. **As a member**, I want to select a template from my company's library, fill in the contract-specific fields, and immediately create a signature-ready document.
4. **As a member**, I want to see which contracts were created from a given template so I can track usage and history.
5. **As a user**, I want document type tags on templates (and inherited by contracts) so I can filter and organize documents.

---

## 4. Functional requirements

### Templates

| # | Requirement | Priority |
|---|------------|----------|
| T1 | Admins can upload a PDF to create a new template scoped to a company | Must |
| T2 | Templates store a title, description, company assignment, and document type tags | Must |
| T3 | Admins can define **owner-fill fields** on the template PDF — fields that the contract creator fills when instantiating a contract (e.g., company name, effective date) | Must |
| T4 | Admins can define **signer-fill fields** on the template PDF — fields filled by signers during signing (e.g., signature, full name, date, title) | Must |
| T5 | Each field definition stores: label, type (text / date / signature / name / title), position (page, x, y), dimensions (width, height), and category (owner-fill / signer-fill) | Must |
| T6 | Signer-fill fields are assigned to a signer role ("Signer 1", "Signer 2", …) | Must |
| T7 | Templates define the required number of signers (minimum 1) | Must |
| T8 | Admins can edit template metadata and field definitions | Must |
| T9 | Admins can delete templates (only if no active/pending contracts reference them) | Should |
| T10 | Templates can be tagged with one or more document types (migrated from the current document-level tagging) | Must |

### Contract instantiation

| # | Requirement | Priority |
|---|------------|----------|
| C1 | Members can select a template and enter values for all owner-fill fields | Must |
| C2 | The system generates a contract PDF by injecting owner-fill values into the template PDF at the defined positions using `pdf-lib` | Must |
| C3 | The generated contract is stored as a new `document` with a foreign key reference to the source template | Must |
| C4 | After generation, the contract enters `draft` status and follows the existing signing workflow (add signers → send → sign → complete) | Must |
| C5 | When signers open the contract, signer-fill fields from the template are pre-positioned on the PDF based on the template's field definitions and the signer's assigned role | Should |
| C6 | The number of signers added must match the template's required signer count | Must |

### Navigation & lineage

| # | Requirement | Priority |
|---|------------|----------|
| N1 | Company sidebar navigation includes a "Templates" section | Must |
| N2 | Template list page shows all templates for the selected company with document type tags | Must |
| N3 | Template detail page shows template metadata, field definitions, and a list of contracts created from the template | Must |
| N4 | Contract list (dashboard) shows the source template name as a link for contracts created from templates | Must |
| N5 | Contracts uploaded directly (not from a template) continue to work as they do today — template reference is nullable | Must |

### Document types migration

| # | Requirement | Priority |
|---|------------|----------|
| D1 | `document_types` and `document_document_types` are re-pointed to templates instead of documents | Must |
| D2 | Contracts inherit their document type from their parent template (read-only on the contract) | Must |
| D3 | Directly-uploaded contracts (no template) can still have document types assigned (backward compat) | Should |
| D4 | The existing `DocumentTypeInlineEditor` UI component works for both templates and legacy contracts | Must |

---

## 5. User experience

### Key flows

#### Flow 1: Create a template (Admin)

1. Admin navigates to Templates (via company sidebar or nav)
2. Clicks "New Template"
3. Uploads a PDF, enters title, description, selects document type tags
4. **Template field designer** opens: the uploaded PDF is displayed with an overlay
5. Admin selects field category (owner-fill or signer-fill) and field type (text, date, signature, name, title) from a palette
6. Admin clicks on the PDF to place fields; fields are draggable/resizable
7. For signer-fill fields, admin assigns each to a signer role (Signer 1, Signer 2, …)
8. Admin sets the required number of signers
9. Admin saves the template

#### Flow 2: Create a contract from template (Member)

1. Member navigates to a company's template list
2. Selects a template → template detail page
3. Clicks "Create Contract"
4. **Owner-fill form** appears: a form with all owner-fill fields listed (label + input). Alongside the form, a live PDF preview shows values being injected in real-time
5. Member fills all required fields and clicks "Generate Contract"
6. System injects values via `pdf-lib`, uploads the resulting PDF, creates the contract record
7. Redirected to the contract detail page (existing UI) in `draft` status
8. Member adds signers (count must match template requirement), sends for signature

#### Flow 3: Browse templates and contracts

1. User selects a company from the sidebar
2. Navigation shows "Templates" and "Contracts" sections
3. Templates page: list with title, document type tags, contract count, created date
4. Clicking a template shows detail: metadata, field summary, and table of contracts created from it
5. Contracts page (dashboard): each row shows template name as a clickable link (or "Direct upload" for non-template contracts)

### Edge cases

- **Empty template library**: Show an empty state with CTA for admins ("Create your first template"), read-only message for members ("No templates available yet")
- **Template with no owner-fill fields**: Skip the fill form; contract is created directly from the template PDF as-is
- **Template deletion with existing contracts**: Prevent deletion if any contract is in `pending` status. Allow if all contracts are `draft`, `completed`, or `cancelled` (template reference becomes a soft link — contracts retain their PDF)
- **PDF upload validation**: Reject non-PDF files, enforce size limit (50 MB, same as current)
- **Field overlap**: Allow it — warn in UI but don't block (some legal documents have overlapping regions)

### Error states

- PDF upload failure → show error toast, retain form state
- Field injection failure (e.g., font not embeddable) → show error, allow retry
- Template not found (deleted between page load and action) → 404 with back navigation
- Signer count mismatch → block "Send for signature" with inline validation message

### Accessibility

- Field designer: keyboard navigation for field placement (arrow keys for position, tab between fields)
- Form inputs: proper labels, ARIA attributes, focus management
- Template/contract lists: semantic tables with sortable headers

---

## 6. Technical considerations

### Proposed approach (high level)

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Template PDF   │     │  Field metadata  │     │  Owner-fill      │
│   (Supabase      │────▶│  (PostgreSQL     │────▶│  values (user    │
│    Storage)      │     │   JSON/rows)     │     │   input form)    │
└──────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                           │
                                                    pdf-lib injection
                                                           │
                                                           ▼
                                                  ┌──────────────────┐
                                                  │  Contract PDF    │
                                                  │  (Supabase       │
                                                  │   Storage)       │
                                                  └────────┬─────────┘
                                                           │
                                                  existing signing flow
                                                           │
                                                           ▼
                                                  ┌──────────────────┐
                                                  │  Signed PDF      │
                                                  └──────────────────┘
```

### Storage format decision: PDF + JSON metadata

Templates are stored as the original uploaded PDF. Field definitions are stored as structured data (JSON column or normalized rows) in PostgreSQL. When a contract is created, `pdf-lib` loads the template PDF and draws owner-fill values at the stored coordinates.

**Why not HTML/JSON → PDF rendering?**
- The app is PDF-centric end-to-end (upload, preview, sign, download)
- HTML-to-PDF rendering (Puppeteer/wkhtmltopdf) requires a headless browser — heavy on server resources, complex to deploy on serverless/edge
- pdf-lib is pure JS, runs in Node.js and browser, zero native dependencies, ~300KB
- Field injection via `drawText()` at (x, y) coordinates is simple, deterministic, and preserves the original PDF layout exactly
- The signing library already uses pdf-lib internally, so coordinate systems are compatible

### Template field designer: build in LunarSign (not in the signing library)

**Decision**: Build a custom template field designer overlay in LunarSign, reusing the signing library's `PdfViewer` component for PDF rendering.

**Why not extend `@drvillo/react-browser-e-signing`?**

| Criterion | Extend library | Build in LunarSign |
|-----------|---------------|-------------------|
| Scope alignment | Template design ≠ signing — different concern | Clean separation of concerns |
| Dependency risk | Blocked on library release cycle | Ship independently |
| Customization | Limited to library's extension points | Full control over UX |
| Field categories | Library has no concept of owner-fill vs signer-fill | First-class support |
| Signer roles | Library has no concept of signer role assignment | Built-in |
| Code reuse | PdfViewer already exported; field placement hooks are a starting point | Reuse PdfViewer, build field logic from scratch |

**Implementation**: The template designer uses the library's `PdfViewer` for rendering and coordinate systems but implements its own field overlay component that supports:
- Two-category field palette (owner-fill / signer-fill)
- Signer role assignment dropdown on signer-fill fields
- Field labels and type selectors
- Drag-and-drop positioning with resize handles
- Visual distinction between owner-fill (e.g., blue) and signer-fill (e.g., green) fields

### Data / schema changes

#### New tables

```sql
-- Template entity
create table public.templates (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  file_path       text not null,           -- Supabase Storage key
  company_id      uuid not null references public.companies(id) on delete cascade,
  created_by      uuid not null references public.profiles(id),
  required_signers integer not null default 1 check (required_signers >= 1),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Template field definitions
create table public.template_fields (
  id              uuid primary key default gen_random_uuid(),
  template_id     uuid not null references public.templates(id) on delete cascade,
  label           text not null,
  field_type      text not null check (field_type in ('text', 'date', 'signature', 'name', 'title')),
  category        text not null check (category in ('owner_fill', 'signer_fill')),
  signer_role     integer,                 -- null for owner_fill; 1-based index for signer_fill
  page            integer not null,        -- 0-based page index
  x               double precision not null,
  y               double precision not null,
  width           double precision not null,
  height          double precision not null,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

-- Re-point document_types junction to templates
create table public.template_document_types (
  template_id     uuid not null references public.templates(id) on delete cascade,
  document_type_id uuid not null references public.document_types(id) on delete cascade,
  primary key (template_id, document_type_id)
);
```

#### Modified tables

```sql
-- Add template reference to documents
alter table public.documents
  add column template_id uuid references public.templates(id) on delete set null;
```

#### Migration notes

- Keep `document_document_types` for backward compatibility with directly-uploaded contracts
- New contracts from templates inherit types via `template_id → template_document_types`
- The `document_document_types` table remains for legacy contracts not created from templates
- Add RLS policies on `templates` and `template_fields`:
  - SELECT: members of the template's company
  - INSERT/UPDATE/DELETE: admins who are members of the template's company

### New Supabase Storage bucket

- **`templates`** — private bucket for template PDFs
- Upload path: `templates/{companyId}/{templateId}/original.pdf`

### API changes / contracts

#### New API routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/templates/upload` | Admin + company member | Upload PDF, create template with metadata |
| GET | `/api/templates/[id]` | Company member | Get template details + fields |
| PATCH | `/api/templates/[id]` | Admin + company member | Update template metadata |
| DELETE | `/api/templates/[id]` | Admin + company member | Delete template (if no pending contracts) |
| PUT | `/api/templates/[id]/fields` | Admin + company member | Save/replace all field definitions |
| GET | `/api/templates/[id]/preview` | Company member | Stream template PDF for preview |
| POST | `/api/templates/[id]/instantiate` | Company member | Fill owner-fields → generate contract PDF → create document |
| PATCH | `/api/templates/[id]/types` | Admin + company member | Update document type tags |

#### Modified API routes

| Method | Path | Change |
|--------|------|--------|
| GET | Dashboard data | Include `template_id`, template title in document queries |
| GET | `/api/document-types` | No change (types are still global) |

### Security / permissions

- Template CRUD: admin role + `company_members` membership check (mirrors existing `canAccessDocument` pattern)
- Template read/use: any member of the template's company
- Contract creation from template: member of the template's company
- RLS policies enforce at DB level; API routes double-check via `lib/authorization.ts`
- Template PDFs in storage: access via signed URLs, same pattern as document PDFs

### Performance / scalability

- Template field definitions are small (tens of fields per template) — no pagination needed
- `pdf-lib` field injection is CPU-bound but fast (< 1s for typical documents)
- Template PDF preview uses the same streaming approach as document preview
- Contract list queries join on `template_id` — add index on `documents.template_id`

### Observability

- Audit log events: `template.created`, `template.updated`, `template.deleted`, `template.instantiated`
- Existing audit infrastructure (`lib/audit.ts`) extended for template actions
- Log field injection errors with template ID and field details for debugging

---

## 7. Rollout plan

### Feature flagging

No feature flag for V1. Templates are an additive feature — existing upload-and-sign flow is unaffected. The new navigation and UI elements are simply added alongside existing ones.

### Migration / backfill

- Run a database migration to create `templates`, `template_fields`, `template_document_types` tables and add `documents.template_id` column
- Create the `templates` storage bucket
- Existing documents remain unchanged (null `template_id`, `document_document_types` still works)
- No data backfill needed — templates start empty

### Staged rollout & rollback plan

1. **Phase 1**: Database migration + storage bucket (backward compatible)
2. **Phase 2**: API routes + template CRUD backend
3. **Phase 3**: Template field designer UI + template management pages
4. **Phase 4**: Contract instantiation flow (owner-fill form + pdf-lib injection)
5. **Phase 5**: Navigation updates, lineage display, document type migration UI

Rollback: each phase is independently revertible. The migration adds columns/tables without modifying existing ones.

---

## 8. Analytics & success metrics

### KPIs

- **Templates created** per company per week
- **Contracts created from templates** vs. direct uploads (template adoption rate)
- **Time-to-signature**: template-based contracts vs. direct upload contracts
- **Template reuse rate**: average contracts per template

### Guardrail metrics

- No increase in document upload error rate
- No regression in signing completion rate
- PDF generation (field injection) p95 latency < 3 seconds

---

## 9. Testing plan

### Unit tests

- `pdf-lib` field injection: verify text is drawn at correct coordinates for various field types, page counts, and edge cases (empty fields, special characters, long text)
- Template field validation: required fields, signer role assignment rules, field type constraints
- Authorization helpers: template access control (admin vs member, company membership)

### Integration tests

- Template CRUD API routes: create, read, update, delete with auth checks
- Contract instantiation API: template → filled PDF → document record
- Document type migration: types on templates, inheritance by contracts, backward compat for legacy docs
- RLS policy enforcement on templates and template_fields

### E2E tests (Playwright)

- Full template creation flow: upload PDF → place fields → save template
- Full instantiation flow: select template → fill fields → generate contract → add signers → send
- Navigation: company → templates → template detail → contract list → contract detail → back to template
- Permission enforcement: member cannot create template, admin can

### Acceptance criteria checklist

- [ ] Admin can upload a PDF and create a template with title, description, and document types
- [ ] Admin can place owner-fill and signer-fill fields on the template PDF using a visual designer
- [ ] Admin can assign signer-fill fields to signer roles and set the required signer count
- [ ] Member can browse company templates and create a contract by filling owner-fill fields
- [ ] Generated contract PDF contains injected owner-fill values at correct positions
- [ ] Contract enters draft status and follows existing signing workflow
- [ ] Signer count validation enforced (must match template's required_signers)
- [ ] Template detail page shows list of contracts created from the template
- [ ] Contract list shows template name as link for template-based contracts
- [ ] Document types are assignable to templates and inherited by contracts
- [ ] Existing direct-upload contracts continue to work unchanged
- [ ] Templates are scoped to companies with proper access control (admin create, member use)
- [ ] All new features covered by automated tests

---

## 10. Milestones

### Task breakdown

| # | Milestone | Estimated effort | Dependencies |
|---|-----------|-----------------|-------------|
| M1 | Database migration: templates, template_fields, template_document_types tables; documents.template_id column; RLS policies; storage bucket | Small | None |
| M2 | Template CRUD API: upload, read, update, delete, field management | Medium | M1 |
| M3 | Template field designer UI: PDF viewer + custom field overlay with two-category palette, drag/drop, resize, signer role assignment | Large | M2 |
| M4 | Template management pages: list, detail, create/edit forms, document type editor | Medium | M2 |
| M5 | Contract instantiation API: owner-fill form processing + pdf-lib field injection + document creation | Medium | M2 |
| M6 | Contract instantiation UI: owner-fill form with live PDF preview, generation wizard | Medium | M5 |
| M7 | Navigation updates: company sidebar templates section, template ↔ contract lineage links, dashboard updates | Small | M4, M6 |
| M8 | Document type migration: re-point to templates, backward compat for legacy docs | Small | M4 |
| M9 | Signer field pre-positioning: when creating signature requests from template-based contracts, pre-position signer fields based on template definitions | Medium | M5, existing signing flow |
| M10 | Testing: unit, integration, e2e test suites for all new features | Medium | M1–M9 |

### Dependencies

- M3 depends on the signing library's `PdfViewer` component being importable and usable standalone (it currently is — exported from `@drvillo/react-browser-e-signing`)
- M5 requires `pdf-lib` as a direct dependency (currently indirect via signing library — needs explicit `npm install`)
- M9 may require coordination with the signing library's field overlay to accept pre-defined field positions

### Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| pdf-lib coordinate system doesn't match signing library's coordinate system | Medium | High | Both use PDF points (72 dpi). Verify with a round-trip test early in M5. |
| Complex PDFs (scanned, image-heavy) cause slow field injection | Low | Medium | pdf-lib operates on PDF structure, not rendering. Benchmark with representative documents. |
| Font embedding issues when injecting text | Medium | Medium | Use pdf-lib's standard fonts (Helvetica, etc.) for V1. Custom font support is a future enhancement. |
| Template field designer UX complexity | Medium | Medium | Start with a minimal palette (5 field types). Iterate based on user feedback. |
| Signer field pre-positioning interaction with free-form signing flow | Medium | Medium | M9 is "should" priority. Degrade gracefully: if pre-positioning fails, fall back to manual field placement. |

### Open questions

1. Should template PDFs be editable after contracts have been created from them? (Current answer: yes, but changes don't affect existing contracts since they have their own PDFs)
2. Should there be a "preview as signer" mode in the template designer so admins can see what signers will experience?
3. When pre-positioning signer fields (M9), should signers be able to move/resize them, or are positions locked?
