/**
 * Backend-Ready Database Schema Types
 * Generated from Complyverse DEMS database schema
 *
 * These types mirror the actual database structure and should be used
 * when integrating with the backend API.
 *
 * ARCHITECTURE NOTE:
 * - Internal Users (dems_users) = Platform users with authentication and roles
 * - External Signers (dems_document_signers) = Document-level participants, no platform access
 * These are TWO SEPARATE actor types and should NEVER be mixed.
 */

// =====================================================
// COMPANY TYPES
// =====================================================

export type CompanyStatus = 'active' | 'inactive' | 'suspended';

export interface Company {
  company_id: string;
  company_name: string;
  company_code: string;
  status: CompanyStatus;
  created_at: string;
  updated_at: string;
}

// =====================================================
// DEPARTMENT TYPES
// =====================================================

export type DepartmentStatus = 'active' | 'inactive';

export interface Department {
  department_id: string;
  company_id: string;
  department_name: string;
  department_code: string;
  status: DepartmentStatus;
  created_at: string;
  updated_at: string;
}

// =====================================================
// ROLE TYPES (Internal Users Only)
// =====================================================

/**
 * Internal user roles only.
 * NOTE: 'signer' is NOT an internal role - external signers are in dems_document_signers table
 */
export type RoleCode =
  | 'super_admin'
  | 'company_admin'
  | 'department_admin'
  | 'user'
  | 'viewer'
  | 'auditor';

export interface Role {
  role_id: string;
  role_name: string;
  role_code: RoleCode;
  description: string | null;
  created_at: string;
}

// =====================================================
// USER TYPES (Internal Platform Users Only)
// =====================================================

/**
 * Internal authenticated platform users ONLY.
 * External signers are NOT stored here - see DocumentSigner type.
 */
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'invited';

export interface User {
  user_id: string;
  company_id: string | null;
  department_id: string | null;
  role_id: string;
  full_name: string;
  email: string;
  password_hash: string | null;
  status: UserStatus;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

// User with related data for display
export interface UserWithRelations extends User {
  company?: Company;
  department?: Department;
  role?: Role;
}

// =====================================================
// DOCUMENT STATUS TYPES
// =====================================================

export type DocumentStatusCategory = 'draft' | 'active' | 'terminal';

export type DocumentStatusCode =
  | 'draft'
  | 'sent_for_signature'
  | 'viewed'
  | 'signed_partial'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export interface DocumentStatus {
  status_id: string;
  status_name: string;
  status_code: DocumentStatusCode;
  category: DocumentStatusCategory;
  display_order: number;
  created_at: string;
}

// =====================================================
// DOCUMENT TYPES
// =====================================================

export interface Document {
  document_id: string;
  document_number: string;
  title: string;
  description: string | null;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_format: string;
  company_id: string;
  department_id: string | null;
  owner_user_id: string;
  current_status_id: string;
  total_signers: number;
  signed_signers_count: number;
  viewed_signers_count: number;
  rejected_signers_count: number;
  sent_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  expired_at: string | null;
  created_at: string;
  updated_at: string;
}

// Document with related data for display
export interface DocumentWithRelations extends Document {
  company?: Company;
  department?: Department;
  owner?: User;
  current_status?: DocumentStatus;
  signers?: DocumentSigner[];
  audit_logs?: AuditLog[];
}

// =====================================================
// DOCUMENT SIGNER TYPES (External Signers Only)
// =====================================================

/**
 * External document signers - document-level participants only.
 * NOT internal platform users. No login, password, or system role required.
 * Access documents via secure token link.
 */
export type SignerStatus = 'Pending' | 'Viewed' | 'Signed' | 'Rejected' | 'Expired';

export interface DocumentSigner {
  signer_id: string;
  document_id: string;
  signer_name: string;
  signer_email: string;
  signer_role: string | null; // Optional label like "Director", "Witness" - NOT a system role
  signing_order: number;
  signer_status: SignerStatus;
  viewed_at: string | null;
  signed_at: string | null;
  rejected_at: string | null;
  access_token: string | null;
  access_token_expires_at: string | null;
  ip_address: string | null;
  device_info: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// AUDIT LOG TYPES
// =====================================================

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
  | 'signer_removed'
  | 'reminder_sent'
  | 'document_downloaded'
  | 'document_updated';

export type PerformedByType = 'User' | 'Signer' | 'System';

export interface AuditLog {
  audit_log_id: string;
  document_id: string;
  signer_id: string | null;
  action_type: AuditActionType;
  from_status_id: string | null;
  to_status_id: string | null;
  performed_by_type: PerformedByType;
  performed_by_user_id: string | null;
  performed_by_email: string | null;
  timestamp: string;
  ip_address: string | null;
  device_info: string | null;
  notes: string | null;
  created_at: string;
}

// Audit log with related data for display
export interface AuditLogWithRelations extends AuditLog {
  document?: Document;
  signer?: DocumentSigner;
  from_status?: DocumentStatus;
  to_status?: DocumentStatus;
  performed_by_user?: User;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

// Create document request
export interface CreateDocumentRequest {
  title: string;
  description?: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_format: string;
  company_id: string;
  department_id?: string;
}

// Add signer request
export interface AddSignerRequest {
  document_id: string;
  signer_name: string;
  signer_email: string;
  signer_role?: string;
  signing_order: number;
}

// Send document request
export interface SendDocumentRequest {
  document_id: string;
  message?: string;
}

// Sign document request
export interface SignDocumentRequest {
  signer_id: string;
  access_token: string;
  signature_data?: string;
}

// Reject document request
export interface RejectDocumentRequest {
  signer_id: string;
  access_token: string;
  reason?: string;
}

// Cancel document request
export interface CancelDocumentRequest {
  document_id: string;
  reason?: string;
}

// =====================================================
// QUERY FILTER TYPES
// =====================================================

export interface DocumentFilters {
  company_id?: string;
  department_id?: string;
  owner_user_id?: string;
  status_code?: DocumentStatusCode | DocumentStatusCode[];
  document_type?: string | string[];
  search?: string;
  created_from?: string;
  created_to?: string;
  sent_from?: string;
  sent_to?: string;
}

export interface AuditLogFilters {
  document_id?: string;
  action_type?: AuditActionType | AuditActionType[];
  performed_by_type?: PerformedByType;
  performed_by_user_id?: string;
  from_date?: string;
  to_date?: string;
}

// =====================================================
// PAGINATION TYPES
// =====================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

// =====================================================
// DATABASE TABLE NAMES (for reference)
// =====================================================

export const TABLE_NAMES = {
  COMPANIES: 'dems_companies',
  DEPARTMENTS: 'dems_departments',
  ROLES: 'dems_roles',
  USERS: 'dems_users',
  DOCUMENT_STATUSES: 'dems_document_statuses',
  DOCUMENTS: 'dems_documents',
  DOCUMENT_SIGNERS: 'dems_document_signers',
  AUDIT_LOGS: 'dems_audit_logs',
} as const;
