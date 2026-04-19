/**
 * Thin helpers that combine route-specific pre-canAccess DB fetches with RBAC
 * queue builder chunks, producing the full ordered queue expected by
 * createQueuedSupabaseMock() for a given route + RBAC scenario.
 *
 * Pattern: [route-specific fetches] ++ [canAccessDocument* chunk] ++ [post-auth ops]
 *
 * See rbac-queue-builders.ts for the per-helper call-sequence docs.
 */

import type { SupabaseOpResult } from './mock-supabase'
import {
  queueCanAccessDocumentAdmin,
  queueCanAccessDocumentDeniedNoLinks,
  queueCanAccessDocumentOwner,
  queueCanAccessDocumentViaCompany,
  queueCanAccessTemplateDeniedNoLinks,
  queueCanAccessTemplateAdmin,
  queueCanAccessTemplateCreator,
  queueCanAccessTemplateViaCompany,
  queueEnsureAdminNo,
  queueEnsureAdminYes,
} from './rbac-queue-builders'
import { doc1, tmpl1, company1 } from './rbac-fixtures'

// ── Type helpers ─────────────────────────────────────────────────────────────

type QueueChunk = SupabaseOpResult[]

function concat(...chunks: QueueChunk[]): QueueChunk {
  return ([] as QueueChunk).concat(...chunks)
}

// ── Reusable document row stubs ───────────────────────────────────────────────

/** Minimal document row consumed by most routes before calling canAccessDocument. */
export function docStub(overrides?: Partial<{
  id: string
  title: string
  status: string
  deleted_at: string | null
  latest_signed_pdf_path: string | null
  file_path: string
  uploaded_by: string
  field_metadata: unknown[]
}>) {
  return {
    id: doc1,
    title: 'Test Doc',
    status: 'draft',
    deleted_at: null,
    latest_signed_pdf_path: null,
    file_path: 'documents/orig.pdf',
    uploaded_by: 'user-id',
    field_metadata: [],
    ...overrides,
  }
}

export function tmplStub(overrides?: Partial<{
  id: string
  title: string
  deleted_at: string | null
  file_path: string
  created_by: string
  signer_count: number
  field_metadata: unknown[]
}>) {
  return {
    id: tmpl1,
    title: 'Test Template',
    deleted_at: null,
    file_path: 'documents/tmpl.pdf',
    created_by: 'user-id',
    signer_count: 1,
    field_metadata: [],
    ...overrides,
  }
}

// ── DELETE /api/documents/[id] ───────────────────────────────────────────────
// Route: getUser → documents.maybeSingle → canAccessDocument → documents.update

export function queueDocumentDeleteForbiddenNoLinks(docRow = docStub()): QueueChunk {
  return concat(
    [{ data: docRow, error: null }],             // documents.maybeSingle (doc exists)
    queueCanAccessDocumentDeniedNoLinks(),
  )
}

export function queueDocumentDeleteOwnerSuccess(docRow = docStub()): QueueChunk {
  return concat(
    [{ data: docRow, error: null }],             // documents.maybeSingle
    queueCanAccessDocumentOwner(docRow.id),
    [{ data: null, error: null }],               // documents.update (soft delete)
  )
}

export function queueDocumentDeleteAdminSuccess(docRow = docStub()): QueueChunk {
  return concat(
    [{ data: docRow, error: null }],             // documents.maybeSingle
    queueCanAccessDocumentAdmin(),
    [{ data: null, error: null }],               // documents.update
  )
}

// ── GET /api/documents/[id]/preview ─────────────────────────────────────────
// Route: getUser → documents.maybeSingle → canAccessDocument (storage is service)

export function queueDocumentPreviewForbiddenNoLinks(docRow = docStub()): QueueChunk {
  return concat(
    [{ data: docRow, error: null }],
    queueCanAccessDocumentDeniedNoLinks(),
  )
}

export function queueDocumentPreviewOwnerSuccess(docRow = docStub()): QueueChunk {
  return concat(
    [{ data: docRow, error: null }],
    queueCanAccessDocumentOwner(docRow.id),
  )
}

export function queueDocumentPreviewAdminSuccess(docRow = docStub()): QueueChunk {
  return concat(
    [{ data: docRow, error: null }],
    queueCanAccessDocumentAdmin(),
  )
}

// ── GET /api/documents/[id]/download ─────────────────────────────────────────
// Route: getUser → documents.single → canAccessDocument
// Note: uses .single() not .maybeSingle()

export function queueDocumentDownloadForbiddenNoLinks(docRow = docStub()): QueueChunk {
  return concat(
    [{ data: docRow, error: null }],
    queueCanAccessDocumentDeniedNoLinks(),
  )
}

export function queueDocumentDownloadOwnerSuccess(docRow = docStub()): QueueChunk {
  return concat(
    [{ data: { ...docRow, status: 'completed', latest_signed_pdf_path: 'signed/a.pdf' }, error: null }],
    queueCanAccessDocumentOwner(docRow.id),
  )
}

export function queueDocumentDownloadAdminSuccess(docRow = docStub()): QueueChunk {
  return concat(
    [{ data: { ...docRow, status: 'completed', latest_signed_pdf_path: 'signed/a.pdf' }, error: null }],
    queueCanAccessDocumentAdmin(),
  )
}

// ── POST /api/documents/[id]/send ────────────────────────────────────────────
// Route: getUser → documents.maybeSingle → canAccessDocument

export function queueDocumentSendForbiddenNoLinks(docRow = docStub()): QueueChunk {
  return concat(
    [{ data: docRow, error: null }],
    queueCanAccessDocumentDeniedNoLinks(),
  )
}

// ── POST /api/documents/[id]/remind ──────────────────────────────────────────
// Route: getUser → canAccessDocument → documents.maybeSingle
// Note: canAccessDocument is called BEFORE the document select here

export function queueDocumentRemindForbiddenNoLinks(): QueueChunk {
  return queueCanAccessDocumentDeniedNoLinks()
}

export function queueDocumentRemindOwnerSuccess(docRow = docStub()): QueueChunk {
  return concat(
    queueCanAccessDocumentOwner(docRow.id),
    [{ data: { ...docRow, status: 'pending' }, error: null }], // documents.maybeSingle (status check)
  )
}

// ── GET /api/documents/[id]/verify ───────────────────────────────────────────
// Route: getUser → canAccessDocument (no pre-fetch; service client used for data)

export function queueDocumentVerifyForbiddenNoLinks(): QueueChunk {
  return queueCanAccessDocumentDeniedNoLinks()
}

export function queueDocumentVerifyOwnerSuccess(docId = doc1): QueueChunk {
  return queueCanAccessDocumentOwner(docId)
}

// ── PATCH /api/documents/[id]/fields ─────────────────────────────────────────
// Route: getUser → canAccessDocument → documents.single (post-auth doc fetch)

export function queueDocumentFieldsForbiddenNoLinks(): QueueChunk {
  return queueCanAccessDocumentDeniedNoLinks()
}

export function queueDocumentFieldsOwnerSuccess(docRow = docStub()): QueueChunk {
  return concat(
    queueCanAccessDocumentOwner(docRow.id),
    [{ data: { id: docRow.id, status: docRow.status }, error: null }], // documents.single (post-auth)
  )
}

// ── PATCH /api/documents/[id]/types ──────────────────────────────────────────
// Route: getUser → documents.maybeSingle → canAccessDocument

export function queueDocumentTypesForbiddenNoLinks(docRow = docStub()): QueueChunk {
  return concat(
    [{ data: { id: docRow.id }, error: null }],
    queueCanAccessDocumentDeniedNoLinks(),
  )
}

export function queueDocumentTypesOwnerSuccess(docRow = docStub()): QueueChunk {
  return concat(
    [{ data: { id: docRow.id }, error: null }],
    queueCanAccessDocumentOwner(docRow.id),
  )
}

// ── PATCH /api/documents/[id]/companies ──────────────────────────────────────
// Route: getUser → documents.maybeSingle → canAccessDocument

export function queueDocumentCompaniesForbiddenNoLinks(docRow = docStub()): QueueChunk {
  return concat(
    [{ data: { id: docRow.id }, error: null }],
    queueCanAccessDocumentDeniedNoLinks(),
  )
}

export function queueDocumentCompaniesOwnerSuccess(docRow = docStub()): QueueChunk {
  return concat(
    [{ data: { id: docRow.id }, error: null }],
    queueCanAccessDocumentOwner(docRow.id),
  )
}

// ── POST /api/signature-requests ─────────────────────────────────────────────
// Route: getUser → documents.maybeSingle → canAccessDocument

export function queueSignatureRequestPostForbiddenNoLinks(docRow = docStub()): QueueChunk {
  return concat(
    [{ data: docRow, error: null }],
    queueCanAccessDocumentDeniedNoLinks(),
  )
}

export function queueSignatureRequestPostOwnerSuccess(docRow = docStub()): QueueChunk {
  return concat(
    [{ data: docRow, error: null }],
    queueCanAccessDocumentOwner(docRow.id),
  )
}

export function queueSignatureRequestPostViaCompanySuccess(docRow = docStub()): QueueChunk {
  return concat(
    [{ data: docRow, error: null }],
    queueCanAccessDocumentViaCompany(company1),
  )
}

// ── DELETE /api/signature-requests ───────────────────────────────────────────
// Route: getUser → signature_requests.single → documents.maybeSingle → canAccessDocument

export function queueSignatureRequestDeleteForbiddenNoLinks(
  docRow = docStub(),
  sigReqRow = { document_id: docRow.id, signer_email: 'signer@x.com' }
): QueueChunk {
  return concat(
    [{ data: sigReqRow, error: null }],          // signature_requests.single
    [{ data: docRow, error: null }],             // documents.maybeSingle
    queueCanAccessDocumentDeniedNoLinks(),
  )
}

// ── GET /api/templates/[id]/preview ──────────────────────────────────────────
// Route: getUser → templates.maybeSingle → canAccessTemplate

export function queueTemplatePreviewForbiddenNoLinks(tmplRow = tmplStub()): QueueChunk {
  return concat(
    [{ data: tmplRow, error: null }],
    queueCanAccessTemplateDeniedNoLinks(),
  )
}

export function queueTemplatePreviewCreatorSuccess(tmplRow = tmplStub()): QueueChunk {
  return concat(
    [{ data: tmplRow, error: null }],
    queueCanAccessTemplateCreator(tmplRow.id),
  )
}

export function queueTemplatePreviewAdminSuccess(tmplRow = tmplStub()): QueueChunk {
  return concat(
    [{ data: tmplRow, error: null }],
    queueCanAccessTemplateAdmin(),
  )
}

export function queueTemplatePreviewViaCompanySuccess(tmplRow = tmplStub()): QueueChunk {
  return concat(
    [{ data: tmplRow, error: null }],
    queueCanAccessTemplateViaCompany(company1),
  )
}

// ── POST /api/templates/[id]/documents ───────────────────────────────────────
// Route: getUser → canAccessTemplate (no pre-fetch)

export function queueTemplateCreateDocForbiddenNoLinks(): QueueChunk {
  return queueCanAccessTemplateDeniedNoLinks()
}

export function queueTemplateCreateDocCreatorSuccess(tmplId = tmpl1): QueueChunk {
  return queueCanAccessTemplateCreator(tmplId)
}

export function queueTemplateCreateDocAdminSuccess(): QueueChunk {
  return queueCanAccessTemplateAdmin()
}

// ── Admin-only routes ─────────────────────────────────────────────────────────
// POST /api/companies, PATCH /api/companies/[id], GET/POST /api/companies/[id]/members
// DELETE /api/companies/[id]/members/[userId], PATCH /api/admin/users/[id]/role
// All use a single profiles select (ensureAdmin).

export function queueAdminRouteSuccess(): QueueChunk {
  return queueEnsureAdminYes()
}

export function queueAdminRouteForbidden(): QueueChunk {
  return queueEnsureAdminNo()
}
