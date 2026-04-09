export type DocumentStatus =
  | 'Draft'
  | 'Sent for Signature'
  | 'Viewed'
  | 'Signed (Partial)'
  | 'Completed'
  | 'Rejected'
  | 'Cancelled'
  | 'Expired';

export type SignerStatus =
  | 'Pending'
  | 'Viewed'
  | 'Signed'
  | 'Rejected'
  | 'Expired';

export interface Document {
  document_id: string;
  document_number: string;
  title: string;
  description?: string;
  document_type?: string;
  file_name: string;
  file_url?: string;
  file_size?: number;
  file_format?: string;
  company_id: string;
  company_name: string;
  department_id?: string;
  department_name?: string;
  owner_user_id: string;
  owner_name: string;
  current_status: DocumentStatus;
  total_signers: number;
  signed_signers_count: number;
  viewed_signers_count: number;
  rejected_signers_count: number;
  cancelled_at?: string;
  expired_at?: string;
  sent_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Signer {
  signer_id: string;
  document_id: string;
  signer_name: string;
  signer_email: string;
  signer_role?: string;
  signing_order?: number;
  signer_status: SignerStatus;
  viewed_at?: string;
  signed_at?: string;
  rejected_at?: string;
  access_token?: string;
  access_token_expires_at?: string;
  ip_address?: string;
  device_info?: string;
  created_at: string;
  updated_at: string;
}

export type AuditActionType =
  | 'document_created'
  | 'document_sent'
  | 'document_viewed'
  | 'document_signed'
  | 'document_rejected'
  | 'document_cancelled'
  | 'document_expired'
  | 'document_completed'
  | 'signer_added'
  | 'reminder_sent';

export type PerformedByType = 'User' | 'Signer' | 'System';

export interface AuditEvent {
  audit_event_id: string;
  document_id: string;
  signer_id?: string;
  action_type: AuditActionType;
  from_status?: DocumentStatus;
  to_status?: DocumentStatus;
  performed_by_type: PerformedByType;
  performed_by_id_or_email: string;
  timestamp: string;
  ip_address?: string;
  device_info?: string;
  notes?: string;
}
