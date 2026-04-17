export type UserRole = 'admin' | 'member'
export type DocumentStatus = 'draft' | 'pending' | 'completed' | 'cancelled'
export type SignatureRequestStatus =
  | 'pending'
  | 'signed'
  | 'declined'
  | 'cancelled'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
}

/** Matches `@drvillo/react-browser-e-signing` FieldType — persisted in JSONB. */
export type StoredFieldType =
  | 'signature'
  | 'fullName'
  | 'title'
  | 'date'
  | 'text'

/** One field in `templates.field_metadata` or `documents.field_metadata`. */
export interface StoredField {
  id: string
  type: StoredFieldType
  pageIndex: number
  xPercent: number
  yPercent: number
  widthPercent: number
  heightPercent: number
  label?: string
  value?: string
  /**
   * @deprecated Use signerIndex instead.
   * When false, document creator fills before send; when true, signer fills at sign time.
   */
  forSigner: boolean
  /**
   * Which signer slot fills this field at signing time.
   * null = document creator fills before sending.
   * 0 = Signer 1 fills at sign time.
   * 1 = Signer 2 fills at sign time.
   */
  signerIndex?: number | null
}

export interface Document {
  id: string
  title: string
  description: string | null
  file_path: string
  uploaded_by: string
  status: DocumentStatus
  latest_signed_pdf_path: string | null
  created_at: string
  completed_at: string | null
  template_id?: string | null
  field_metadata?: StoredField[] | null
  deleted_at?: string | null
}

export interface Template {
  id: string
  title: string
  description: string | null
  document_type_id: string | null
  file_path: string
  field_metadata: StoredField[]
  /** Number of distinct signer slots required (1 or 2). Defaults to 1. */
  signer_count: number
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface TemplateCompany {
  template_id: string
  company_id: string
  created_at: string
}

export interface DocumentType {
  id: string
  name: string
  created_by: string
  created_at: string
}

export interface Company {
  id: string
  name: string
  slug: string
  created_by: string
  created_at: string
}

export interface DocumentCompany {
  document_id: string
  company_id: string
  created_at: string
}

export interface CompanyMember {
  company_id: string
  user_id: string
  created_at: string
}

export interface Invitation {
  id: string
  email: string
  role: UserRole
  invited_by: string
  status: 'pending' | 'accepted' | 'revoked'
  created_at: string
}

export interface SignatureRequest {
  id: string
  document_id: string
  signer_name: string
  signer_email: string
  requested_by: string
  status: SignatureRequestStatus
  signed_at: string | null
  created_at: string
  /** Which signer slot this request belongs to (0 = Signer 1, 1 = Signer 2). Null for legacy. */
  signer_index: number | null
}

export interface SignatureRequestWithToken extends SignatureRequest {
  token: string
}

export interface Signature {
  id: string
  request_id: string
  signature_data: string
  document_hash: string
  original_document_hash: string | null
  signature_image_hash: string | null
  evidence_hash: string | null
  evidence_mac: string | null
  otp_verified: boolean
  signed_pdf_path: string
  ip_address: string | null
  user_agent: string | null
  signed_at: string
  ots_proof: string | null
  ots_pending: boolean
  ots_upgraded_at: string | null
  ots_bitcoin_block: number | null
}

export interface AuditLog {
  id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

/** Joined profile preview from `profiles:actor_id(...)` Supabase select */
export interface AuditLogActorPreview {
  email: string
  full_name: string
}

export interface AuditLogWithActor extends AuditLog {
  actor?: AuditLogActorPreview | null
}
