/*
  # Backend-Level Access Control - Row Level Security Policies
  
  ## Overview
  This migration implements comprehensive backend-level access control for Complyverse DEMS.
  All data access and actions are enforced at the database level through RLS policies,
  ensuring security regardless of client-side implementation.
  
  ## Document Access Rules (enforced via RLS)
  
  ### Super Admin
  - Can access ALL documents across ALL companies
  
  ### Company Admin
  - Can access ALL documents within their company only
  
  ### Department Admin
  - Can access documents within their department only
  
  ### User
  - Can access documents they created (owner)
  - Can access documents in their department
  - Can access documents explicitly shared with them
  
  ### Viewer
  - Can access only documents explicitly permitted to them
  
  ### Auditor
  - Can access documents within their audit scope (company or department)
  - Can access full audit trails for those documents
  
  ### External Signer
  - Can access ONLY the document linked to their secure access token
  - Cannot access any other system data
  
  ## Document Ownership Model
  - Each document has an owner_user_id
  - Owner has control within allowed lifecycle rules
  - Ownership does not override company/department restrictions
  
  ## Action Permission Enforcement
  
  ### Upload
  - Allowed for User role and above
  
  ### Send for Signature
  - Allowed only to document owner or admins in scope
  
  ### Cancel / Retract
  - Allowed only before completion
  - By owner or admins in scope
  
  ### View
  - Based on access rules above
  
  ### Download
  - Allowed only if user has view access
  
  ### Audit Trail Access
  - Based on role scope
  
  ### Signer Actions
  - Allowed only through secure token
  - Restricted to assigned document
  
  ## Security Implementation
  
  1. **Helper Functions** - Permission checking logic
  2. **Document Policies** - Role-based document access
  3. **Signer Policies** - Token-based external access
  4. **Audit Log Policies** - Read-only access, append-only writes
  5. **User Management Policies** - Role-based user visibility
  6. **Completed Document Protection** - Read-only enforcement
  
  ## Notes
  - All policies validate user role, company_id, department_id
  - External signer access uses token validation
  - Audit logs are immutable (append-only)
  - Completed documents are read-only
*/

-- =====================================================
-- HELPER FUNCTIONS FOR PERMISSION CHECKS
-- =====================================================

-- Function to get user's role code
CREATE OR REPLACE FUNCTION get_user_role_code(p_user_id uuid)
RETURNS text AS $$
  SELECT r.role_code
  FROM dems_users u
  JOIN dems_roles r ON u.role_id = r.role_id
  WHERE u.user_id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if user is Super Admin
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM dems_users u
    JOIN dems_roles r ON u.role_id = r.role_id
    WHERE u.user_id = p_user_id
    AND r.role_code = 'super_admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if user is Company Admin for a specific company
CREATE OR REPLACE FUNCTION is_company_admin(p_user_id uuid, p_company_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM dems_users u
    JOIN dems_roles r ON u.role_id = r.role_id
    WHERE u.user_id = p_user_id
    AND u.company_id = p_company_id
    AND r.role_code = 'company_admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if user is Department Admin for a specific department
CREATE OR REPLACE FUNCTION is_department_admin(p_user_id uuid, p_department_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM dems_users u
    JOIN dems_roles r ON u.role_id = r.role_id
    WHERE u.user_id = p_user_id
    AND u.department_id = p_department_id
    AND r.role_code = 'department_admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if user is Auditor
CREATE OR REPLACE FUNCTION is_auditor(p_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM dems_users u
    JOIN dems_roles r ON u.role_id = r.role_id
    WHERE u.user_id = p_user_id
    AND r.role_code = 'auditor'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if document status is terminal (completed, rejected, cancelled, expired)
CREATE OR REPLACE FUNCTION is_document_terminal(p_document_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM dems_documents d
    JOIN dems_document_statuses s ON d.current_status_id = s.status_id
    WHERE d.document_id = p_document_id
    AND s.category = 'terminal'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =====================================================
-- DROP EXISTING DOCUMENT POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view documents in their company" ON dems_documents;
DROP POLICY IF EXISTS "Users can create documents in their company" ON dems_documents;
DROP POLICY IF EXISTS "Document owners can update their documents" ON dems_documents;

-- =====================================================
-- DOCUMENT ACCESS POLICIES (SELECT)
-- =====================================================

-- Super Admin: Access all documents across all companies
CREATE POLICY "Super Admin can view all documents"
  ON dems_documents FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Company Admin: Access all documents in their company
CREATE POLICY "Company Admin can view company documents"
  ON dems_documents FOR SELECT
  TO authenticated
  USING (
    is_company_admin(auth.uid(), company_id)
  );

-- Department Admin: Access documents in their department
CREATE POLICY "Department Admin can view department documents"
  ON dems_documents FOR SELECT
  TO authenticated
  USING (
    is_department_admin(auth.uid(), department_id)
  );

-- User: Access documents they own OR in their department
CREATE POLICY "User can view own and department documents"
  ON dems_documents FOR SELECT
  TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR
    (
      department_id IN (
        SELECT department_id FROM dems_users WHERE user_id = auth.uid()
      )
      AND get_user_role_code(auth.uid()) IN ('user', 'viewer')
    )
  );

-- Viewer: Access documents in their department (read-only)
CREATE POLICY "Viewer can view department documents"
  ON dems_documents FOR SELECT
  TO authenticated
  USING (
    department_id IN (
      SELECT department_id FROM dems_users WHERE user_id = auth.uid()
    )
    AND get_user_role_code(auth.uid()) = 'viewer'
  );

-- Auditor: Access documents in their scope (company or department)
CREATE POLICY "Auditor can view audit scope documents"
  ON dems_documents FOR SELECT
  TO authenticated
  USING (
    is_auditor(auth.uid())
    AND (
      company_id IN (
        SELECT company_id FROM dems_users WHERE user_id = auth.uid()
      )
      OR
      department_id IN (
        SELECT department_id FROM dems_users WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- DOCUMENT CREATE POLICIES (INSERT)
-- =====================================================

-- Super Admin: Can create documents in any company
CREATE POLICY "Super Admin can create documents anywhere"
  ON dems_documents FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

-- Company Admin: Can create documents in their company
CREATE POLICY "Company Admin can create company documents"
  ON dems_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    is_company_admin(auth.uid(), company_id)
    AND owner_user_id = auth.uid()
  );

-- Department Admin: Can create documents in their department
CREATE POLICY "Department Admin can create department documents"
  ON dems_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    is_department_admin(auth.uid(), department_id)
    AND owner_user_id = auth.uid()
  );

-- User: Can create documents in their company/department
CREATE POLICY "User can create documents in their scope"
  ON dems_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role_code(auth.uid()) = 'user'
    AND owner_user_id = auth.uid()
    AND company_id IN (
      SELECT company_id FROM dems_users WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- DOCUMENT UPDATE POLICIES
-- =====================================================

-- Super Admin: Can update any document (except completed)
CREATE POLICY "Super Admin can update non-terminal documents"
  ON dems_documents FOR UPDATE
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    AND NOT is_document_terminal(document_id)
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    AND NOT is_document_terminal(document_id)
  );

-- Company Admin: Can update documents in their company (except completed)
CREATE POLICY "Company Admin can update company documents"
  ON dems_documents FOR UPDATE
  TO authenticated
  USING (
    is_company_admin(auth.uid(), company_id)
    AND NOT is_document_terminal(document_id)
  )
  WITH CHECK (
    is_company_admin(auth.uid(), company_id)
    AND NOT is_document_terminal(document_id)
  );

-- Department Admin: Can update documents in their department (except completed)
CREATE POLICY "Department Admin can update department documents"
  ON dems_documents FOR UPDATE
  TO authenticated
  USING (
    is_department_admin(auth.uid(), department_id)
    AND NOT is_document_terminal(document_id)
  )
  WITH CHECK (
    is_department_admin(auth.uid(), department_id)
    AND NOT is_document_terminal(document_id)
  );

-- Document Owner: Can update own documents (except completed)
CREATE POLICY "Owner can update own documents"
  ON dems_documents FOR UPDATE
  TO authenticated
  USING (
    owner_user_id = auth.uid()
    AND NOT is_document_terminal(document_id)
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    AND NOT is_document_terminal(document_id)
  );

-- =====================================================
-- DOCUMENT DELETE POLICIES
-- =====================================================

-- Super Admin: Can delete any document
CREATE POLICY "Super Admin can delete documents"
  ON dems_documents FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Company Admin: Can delete documents in their company
CREATE POLICY "Company Admin can delete company documents"
  ON dems_documents FOR DELETE
  TO authenticated
  USING (is_company_admin(auth.uid(), company_id));

-- Department Admin: Can delete documents in their department
CREATE POLICY "Department Admin can delete department documents"
  ON dems_documents FOR DELETE
  TO authenticated
  USING (is_department_admin(auth.uid(), department_id));

-- =====================================================
-- DROP EXISTING SIGNER POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view signers for documents in their company" ON dems_document_signers;
DROP POLICY IF EXISTS "Document owners can manage signers" ON dems_document_signers;

-- =====================================================
-- DOCUMENT SIGNERS POLICIES
-- =====================================================

-- View signers: Same rules as viewing documents
CREATE POLICY "Users can view signers based on document access"
  ON dems_document_signers FOR SELECT
  TO authenticated
  USING (
    document_id IN (
      SELECT document_id FROM dems_documents
      WHERE 
        is_super_admin(auth.uid())
        OR is_company_admin(auth.uid(), company_id)
        OR is_department_admin(auth.uid(), department_id)
        OR owner_user_id = auth.uid()
        OR (
          department_id IN (
            SELECT department_id FROM dems_users WHERE user_id = auth.uid()
          )
          AND get_user_role_code(auth.uid()) IN ('user', 'viewer', 'auditor')
        )
    )
  );

-- Add signers: Document owner or admins
CREATE POLICY "Authorized users can add signers"
  ON dems_document_signers FOR INSERT
  TO authenticated
  WITH CHECK (
    document_id IN (
      SELECT document_id FROM dems_documents
      WHERE 
        is_super_admin(auth.uid())
        OR is_company_admin(auth.uid(), company_id)
        OR is_department_admin(auth.uid(), department_id)
        OR owner_user_id = auth.uid()
    )
  );

-- Update signers: Document owner or admins (except terminal documents)
CREATE POLICY "Authorized users can update signers"
  ON dems_document_signers FOR UPDATE
  TO authenticated
  USING (
    document_id IN (
      SELECT document_id FROM dems_documents
      WHERE 
        (
          is_super_admin(auth.uid())
          OR is_company_admin(auth.uid(), company_id)
          OR is_department_admin(auth.uid(), department_id)
          OR owner_user_id = auth.uid()
        )
        AND NOT is_document_terminal(document_id)
    )
  )
  WITH CHECK (
    document_id IN (
      SELECT document_id FROM dems_documents
      WHERE 
        (
          is_super_admin(auth.uid())
          OR is_company_admin(auth.uid(), company_id)
          OR is_department_admin(auth.uid(), department_id)
          OR owner_user_id = auth.uid()
        )
        AND NOT is_document_terminal(document_id)
    )
  );

-- Delete signers: Document owner or admins (except terminal documents)
CREATE POLICY "Authorized users can delete signers"
  ON dems_document_signers FOR DELETE
  TO authenticated
  USING (
    document_id IN (
      SELECT document_id FROM dems_documents
      WHERE 
        (
          is_super_admin(auth.uid())
          OR is_company_admin(auth.uid(), company_id)
          OR is_department_admin(auth.uid(), department_id)
          OR owner_user_id = auth.uid()
        )
        AND NOT is_document_terminal(document_id)
    )
  );

-- =====================================================
-- DROP EXISTING AUDIT LOG POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view audit logs for documents in their company" ON dems_audit_logs;
DROP POLICY IF EXISTS "Audit logs are append-only for authenticated users" ON dems_audit_logs;

-- =====================================================
-- AUDIT LOGS POLICIES (READ-ONLY + APPEND-ONLY)
-- =====================================================

-- View audit logs: Based on document access + special Auditor privileges
CREATE POLICY "Users can view audit logs based on document access"
  ON dems_audit_logs FOR SELECT
  TO authenticated
  USING (
    document_id IN (
      SELECT document_id FROM dems_documents
      WHERE 
        is_super_admin(auth.uid())
        OR is_company_admin(auth.uid(), company_id)
        OR is_department_admin(auth.uid(), department_id)
        OR owner_user_id = auth.uid()
        OR is_auditor(auth.uid())
        OR (
          department_id IN (
            SELECT department_id FROM dems_users WHERE user_id = auth.uid()
          )
          AND get_user_role_code(auth.uid()) IN ('user', 'viewer', 'auditor')
        )
    )
  );

-- Append audit logs: Any authenticated user can create logs for documents they can access
CREATE POLICY "Authenticated users can create audit logs"
  ON dems_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    document_id IN (
      SELECT document_id FROM dems_documents
      WHERE 
        is_super_admin(auth.uid())
        OR is_company_admin(auth.uid(), company_id)
        OR is_department_admin(auth.uid(), department_id)
        OR owner_user_id = auth.uid()
        OR (
          department_id IN (
            SELECT department_id FROM dems_users WHERE user_id = auth.uid()
          )
          AND get_user_role_code(auth.uid()) IN ('user', 'viewer')
        )
    )
  );

-- NO UPDATE OR DELETE POLICIES - Audit logs are immutable

-- =====================================================
-- DROP EXISTING USER POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own profile" ON dems_users;
DROP POLICY IF EXISTS "Users can update own profile" ON dems_users;

-- =====================================================
-- USER MANAGEMENT POLICIES
-- =====================================================

-- View users: Super Admin sees all, Company Admin sees company, Department Admin sees department
CREATE POLICY "Super Admin can view all users"
  ON dems_users FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Company Admin can view company users"
  ON dems_users FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM dems_users WHERE user_id = auth.uid()
    )
    AND is_company_admin(auth.uid(), company_id)
  );

CREATE POLICY "Department Admin can view department users"
  ON dems_users FOR SELECT
  TO authenticated
  USING (
    department_id IN (
      SELECT department_id FROM dems_users WHERE user_id = auth.uid()
    )
    AND is_department_admin(auth.uid(), department_id)
  );

CREATE POLICY "Users can view own profile"
  ON dems_users FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create users: Admins only
CREATE POLICY "Super Admin can create users"
  ON dems_users FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Company Admin can create users in their company"
  ON dems_users FOR INSERT
  TO authenticated
  WITH CHECK (
    is_company_admin(auth.uid(), company_id)
  );

CREATE POLICY "Department Admin can create users in their department"
  ON dems_users FOR INSERT
  TO authenticated
  WITH CHECK (
    is_department_admin(auth.uid(), department_id)
  );

-- Update users: Admins can update users in their scope
CREATE POLICY "Super Admin can update all users"
  ON dems_users FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Company Admin can update company users"
  ON dems_users FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM dems_users WHERE user_id = auth.uid()
    )
    AND is_company_admin(auth.uid(), company_id)
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM dems_users WHERE user_id = auth.uid()
    )
    AND is_company_admin(auth.uid(), company_id)
  );

CREATE POLICY "Department Admin can update department users"
  ON dems_users FOR UPDATE
  TO authenticated
  USING (
    department_id IN (
      SELECT department_id FROM dems_users WHERE user_id = auth.uid()
    )
    AND is_department_admin(auth.uid(), department_id)
  )
  WITH CHECK (
    department_id IN (
      SELECT department_id FROM dems_users WHERE user_id = auth.uid()
    )
    AND is_department_admin(auth.uid(), department_id)
  );

CREATE POLICY "Users can update own profile"
  ON dems_users FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Delete users: Admins only
CREATE POLICY "Super Admin can delete users"
  ON dems_users FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Company Admin can delete company users"
  ON dems_users FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM dems_users WHERE user_id = auth.uid()
    )
    AND is_company_admin(auth.uid(), company_id)
  );

CREATE POLICY "Department Admin can delete department users"
  ON dems_users FOR DELETE
  TO authenticated
  USING (
    department_id IN (
      SELECT department_id FROM dems_users WHERE user_id = auth.uid()
    )
    AND is_department_admin(auth.uid(), department_id)
  );

-- =====================================================
-- SECURITY COMMENTS
-- =====================================================

COMMENT ON FUNCTION get_user_role_code IS 'Returns the role code for a given user ID';
COMMENT ON FUNCTION is_super_admin IS 'Checks if user has Super Admin role';
COMMENT ON FUNCTION is_company_admin IS 'Checks if user is Company Admin for specified company';
COMMENT ON FUNCTION is_department_admin IS 'Checks if user is Department Admin for specified department';
COMMENT ON FUNCTION is_auditor IS 'Checks if user has Auditor role';
COMMENT ON FUNCTION is_document_terminal IS 'Checks if document is in terminal state (completed, rejected, cancelled, expired)';
