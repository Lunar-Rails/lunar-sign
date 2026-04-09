/*
  # Refactor: Separate Internal Users from External Signers

  ## Overview
  This migration removes the "Signer" role from internal user roles and ensures
  external signers are ONLY document-level participants, not platform users.

  ## Changes

  1. **Remove Signer Role**
     - Delete the "Signer" role from dems_roles table
     - This role should NOT be used for internal users

  2. **Internal Roles Only**
     - Super Admin
     - Company Admin
     - Department Admin
     - User
     - Viewer
     - Auditor

  3. **Architecture Clarification**
     - dems_users table = Internal authenticated platform users only
     - dems_document_signers table = External document signers only
     - These are two completely separate actor types

  ## Security

  - No data loss occurs (external signers were never in dems_users)
  - Maintains all existing RLS policies
  - Clarifies the separation of concerns

  ## Notes

  - External signers exist only in dems_document_signers
  - External signers do NOT need accounts, passwords, or internal roles
  - External signers access documents via secure tokens
  - User Management UI will only show internal users
*/

-- =====================================================
-- REMOVE SIGNER FROM INTERNAL ROLES
-- =====================================================

-- Delete the "Signer" role as it should not be used for internal users
DELETE FROM dems_roles WHERE role_code = 'signer';

COMMENT ON TABLE dems_users IS 'Internal authenticated platform users only (NOT external signers)';
COMMENT ON TABLE dems_document_signers IS 'External document signers - NOT platform users, access via secure tokens';

-- Add comment to clarify the separation
COMMENT ON COLUMN dems_users.role_id IS 'Internal user role: super_admin, company_admin, department_admin, user, viewer, or auditor';
COMMENT ON COLUMN dems_document_signers.signer_email IS 'External signer email - NOT linked to dems_users table';
COMMENT ON COLUMN dems_document_signers.signer_status IS 'External signer status: Pending, Viewed, Signed, Rejected, Expired';
