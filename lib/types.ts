export type UserRole = 'admin' | 'member'
export type DocumentStatus = 'draft' | 'pending' | 'completed' | 'cancelled'
export type SignatureRequestStatus = 'pending' | 'signed' | 'declined'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
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
}

export interface SignatureRequest {
  id: string
  document_id: string
  signer_name: string
  signer_email: string
  requested_by: string
  status: SignatureRequestStatus
  token: string
  signed_at: string | null
  created_at: string
}

export interface Signature {
  id: string
  request_id: string
  signature_data: string
  document_hash: string
  signed_pdf_path: string
  ip_address: string | null
  user_agent: string | null
  signed_at: string
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
