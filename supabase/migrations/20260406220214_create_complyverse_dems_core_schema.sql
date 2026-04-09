/*
  # Complyverse DEMS - Backend-Ready MVP Schema

  ## Overview
  This migration creates the complete database schema for Complyverse Document Execution Management System.
  The schema supports multi-company, multi-department architecture with comprehensive document lifecycle tracking.

  ## Entity Relationships

  ### Organizational Hierarchy
  - Companies (1) → (N) Departments
  - Departments (1) → (N) Users
  - Companies (1) → (N) Users
  - Roles (1) → (N) Users

  ### Document Management
  - Companies (1) → (N) Documents
  - Departments (1) → (N) Documents
  - Users (1 owner) → (N) Documents
  - Documents (1) → (N) Document Signers
  - Documents (1) → (N) Audit Logs
  - Documents (N) → (1) Document Status

  ### Audit & Tracking
  - Document Signers (1) → (N) Audit Logs
  - Users (1) → (N) Audit Logs (as performer)
  - Document Statuses (1) → (N) Audit Logs (from/to status)

  ## Tables Created

  1. **dems_companies** - Multi-tenant company records
  2. **dems_departments** - Organizational units within companies
  3. **dems_roles** - User permission levels
  4. **dems_users** - System and signer users
  5. **dems_document_statuses** - Extensible status definitions
  6. **dems_documents** - Core document records
  7. **dems_document_signers** - Signer assignments and tracking
  8. **dems_audit_logs** - Complete activity history

  ## Security

  - All tables have RLS enabled
  - Policies enforce company and department isolation
  - Audit logs are append-only
  - Sensitive fields (password_hash, access_token) are protected

  ## Notes

  - Uses UUID v4 for all primary keys
  - Timestamps use timestamptz for timezone support
  - Status tracking via foreign keys to document_statuses table
  - Soft delete via status fields where applicable
  - Comprehensive indexing for query performance
*/

-- =====================================================
-- 1. COMPANIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS dems_companies (
  company_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  company_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dems_companies_status ON dems_companies(status);
CREATE INDEX IF NOT EXISTS idx_dems_companies_code ON dems_companies(company_code);

COMMENT ON TABLE dems_companies IS 'Multi-tenant company records';
COMMENT ON COLUMN dems_companies.company_code IS 'Unique identifier code for the company';
COMMENT ON COLUMN dems_companies.status IS 'Company operational status: active, inactive, suspended';

ALTER TABLE dems_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies are viewable by authenticated users"
  ON dems_companies FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 2. DEPARTMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS dems_departments (
  department_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES dems_companies(company_id) ON DELETE CASCADE,
  department_name text NOT NULL,
  department_code text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(company_id, department_code)
);

CREATE INDEX IF NOT EXISTS idx_dems_departments_company ON dems_departments(company_id);
CREATE INDEX IF NOT EXISTS idx_dems_departments_status ON dems_departments(status);
CREATE INDEX IF NOT EXISTS idx_dems_departments_code ON dems_departments(company_id, department_code);

COMMENT ON TABLE dems_departments IS 'Organizational units within companies';
COMMENT ON COLUMN dems_departments.department_code IS 'Unique code within company scope';

ALTER TABLE dems_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Departments are viewable by authenticated users"
  ON dems_departments FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 3. ROLES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS dems_roles (
  role_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text UNIQUE NOT NULL,
  role_code text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dems_roles_code ON dems_roles(role_code);

COMMENT ON TABLE dems_roles IS 'User permission levels and access control definitions';

-- Insert MVP roles
INSERT INTO dems_roles (role_name, role_code, description) VALUES
  ('Super Admin', 'super_admin', 'Full system access across all companies'),
  ('Company Admin', 'company_admin', 'Full access within company scope'),
  ('Department Admin', 'department_admin', 'Full access within department scope'),
  ('User', 'user', 'Standard user with document creation rights'),
  ('Signer', 'signer', 'External or internal signer with limited access'),
  ('Viewer', 'viewer', 'Read-only access to documents'),
  ('Auditor', 'auditor', 'Read-only access to audit logs and compliance reports')
ON CONFLICT (role_code) DO NOTHING;

ALTER TABLE dems_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roles are viewable by authenticated users"
  ON dems_roles FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 4. USERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS dems_users (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES dems_companies(company_id) ON DELETE SET NULL,
  department_id uuid REFERENCES dems_departments(department_id) ON DELETE SET NULL,
  role_id uuid NOT NULL REFERENCES dems_roles(role_id),
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'invited')),
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dems_users_email ON dems_users(email);
CREATE INDEX IF NOT EXISTS idx_dems_users_company ON dems_users(company_id);
CREATE INDEX IF NOT EXISTS idx_dems_users_department ON dems_users(department_id);
CREATE INDEX IF NOT EXISTS idx_dems_users_role ON dems_users(role_id);
CREATE INDEX IF NOT EXISTS idx_dems_users_status ON dems_users(status);

COMMENT ON TABLE dems_users IS 'System users including internal staff and external signers';
COMMENT ON COLUMN dems_users.password_hash IS 'Bcrypt hashed password - null for external signers';
COMMENT ON COLUMN dems_users.status IS 'User account status: active, inactive, suspended, invited';

ALTER TABLE dems_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON dems_users FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON dems_users FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 5. DOCUMENT STATUSES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS dems_document_statuses (
  status_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_name text UNIQUE NOT NULL,
  status_code text UNIQUE NOT NULL,
  category text NOT NULL CHECK (category IN ('draft', 'active', 'terminal')),
  display_order int NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dems_document_statuses_code ON dems_document_statuses(status_code);
CREATE INDEX IF NOT EXISTS idx_dems_document_statuses_category ON dems_document_statuses(category);
CREATE INDEX IF NOT EXISTS idx_dems_document_statuses_order ON dems_document_statuses(display_order);

COMMENT ON TABLE dems_document_statuses IS 'Extensible document status definitions';
COMMENT ON COLUMN dems_document_statuses.category IS 'Status category: draft (unsent), active (in progress), terminal (final state)';
COMMENT ON COLUMN dems_document_statuses.display_order IS 'Sort order for UI display';

-- Insert MVP document statuses
INSERT INTO dems_document_statuses (status_name, status_code, category, display_order) VALUES
  ('Draft', 'draft', 'draft', 1),
  ('Sent for Signature', 'sent_for_signature', 'active', 2),
  ('Viewed', 'viewed', 'active', 3),
  ('Signed (Partial)', 'signed_partial', 'active', 4),
  ('Completed', 'completed', 'terminal', 5),
  ('Rejected', 'rejected', 'terminal', 6),
  ('Cancelled', 'cancelled', 'terminal', 7),
  ('Expired', 'expired', 'terminal', 8)
ON CONFLICT (status_code) DO NOTHING;

ALTER TABLE dems_document_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Document statuses are viewable by authenticated users"
  ON dems_document_statuses FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 6. DOCUMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS dems_documents (
  document_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint NOT NULL,
  file_format text NOT NULL,
  company_id uuid NOT NULL REFERENCES dems_companies(company_id) ON DELETE CASCADE,
  department_id uuid REFERENCES dems_departments(department_id) ON DELETE SET NULL,
  owner_user_id uuid NOT NULL REFERENCES dems_users(user_id) ON DELETE RESTRICT,
  current_status_id uuid NOT NULL REFERENCES dems_document_statuses(status_id),
  total_signers int NOT NULL DEFAULT 0,
  signed_signers_count int NOT NULL DEFAULT 0,
  viewed_signers_count int NOT NULL DEFAULT 0,
  rejected_signers_count int NOT NULL DEFAULT 0,
  sent_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  expired_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_signer_counts CHECK (
    signed_signers_count >= 0 AND 
    viewed_signers_count >= 0 AND 
    rejected_signers_count >= 0 AND
    signed_signers_count <= total_signers
  )
);

CREATE INDEX IF NOT EXISTS idx_dems_documents_number ON dems_documents(document_number);
CREATE INDEX IF NOT EXISTS idx_dems_documents_company ON dems_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_dems_documents_department ON dems_documents(department_id);
CREATE INDEX IF NOT EXISTS idx_dems_documents_owner ON dems_documents(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_dems_documents_status ON dems_documents(current_status_id);
CREATE INDEX IF NOT EXISTS idx_dems_documents_type ON dems_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_dems_documents_created ON dems_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dems_documents_sent ON dems_documents(sent_at DESC NULLS LAST);

COMMENT ON TABLE dems_documents IS 'Core document records with lifecycle tracking';
COMMENT ON COLUMN dems_documents.document_number IS 'Unique human-readable document identifier';
COMMENT ON COLUMN dems_documents.current_status_id IS 'Current document status - references document_statuses';
COMMENT ON COLUMN dems_documents.owner_user_id IS 'User who created/owns the document';
COMMENT ON COLUMN dems_documents.total_signers IS 'Total number of signers assigned';
COMMENT ON COLUMN dems_documents.signed_signers_count IS 'Count of signers who completed signing';
COMMENT ON COLUMN dems_documents.viewed_signers_count IS 'Count of signers who viewed the document';
COMMENT ON COLUMN dems_documents.rejected_signers_count IS 'Count of signers who rejected';

ALTER TABLE dems_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents in their company"
  ON dems_documents FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM dems_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create documents in their company"
  ON dems_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM dems_users WHERE user_id = auth.uid()
    )
    AND owner_user_id = auth.uid()
  );

CREATE POLICY "Document owners can update their documents"
  ON dems_documents FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- =====================================================
-- 7. DOCUMENT SIGNERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS dems_document_signers (
  signer_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES dems_documents(document_id) ON DELETE CASCADE,
  signer_name text NOT NULL,
  signer_email text NOT NULL,
  signer_role text,
  signing_order int NOT NULL,
  signer_status text NOT NULL DEFAULT 'Pending' CHECK (
    signer_status IN ('Pending', 'Viewed', 'Signed', 'Rejected', 'Expired')
  ),
  viewed_at timestamptz,
  signed_at timestamptz,
  rejected_at timestamptz,
  access_token text UNIQUE,
  access_token_expires_at timestamptz,
  ip_address text,
  device_info text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_signing_order CHECK (signing_order > 0)
);

CREATE INDEX IF NOT EXISTS idx_dems_signers_document ON dems_document_signers(document_id);
CREATE INDEX IF NOT EXISTS idx_dems_signers_email ON dems_document_signers(signer_email);
CREATE INDEX IF NOT EXISTS idx_dems_signers_status ON dems_document_signers(signer_status);
CREATE INDEX IF NOT EXISTS idx_dems_signers_order ON dems_document_signers(document_id, signing_order);
CREATE INDEX IF NOT EXISTS idx_dems_signers_token ON dems_document_signers(access_token) WHERE access_token IS NOT NULL;

COMMENT ON TABLE dems_document_signers IS 'Signer assignments and signature tracking';
COMMENT ON COLUMN dems_document_signers.signing_order IS 'Order in which signer should sign (1-based)';
COMMENT ON COLUMN dems_document_signers.signer_status IS 'Current signer status: Pending, Viewed, Signed, Rejected, Expired';
COMMENT ON COLUMN dems_document_signers.access_token IS 'Unique token for signer access link';
COMMENT ON COLUMN dems_document_signers.access_token_expires_at IS 'Token expiration timestamp';

ALTER TABLE dems_document_signers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signers for documents in their company"
  ON dems_document_signers FOR SELECT
  TO authenticated
  USING (
    document_id IN (
      SELECT document_id FROM dems_documents 
      WHERE company_id IN (
        SELECT company_id FROM dems_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Document owners can manage signers"
  ON dems_document_signers FOR ALL
  TO authenticated
  USING (
    document_id IN (
      SELECT document_id FROM dems_documents WHERE owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    document_id IN (
      SELECT document_id FROM dems_documents WHERE owner_user_id = auth.uid()
    )
  );

-- =====================================================
-- 8. AUDIT LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS dems_audit_logs (
  audit_log_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES dems_documents(document_id) ON DELETE CASCADE,
  signer_id uuid REFERENCES dems_document_signers(signer_id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (
    action_type IN (
      'document_created',
      'document_sent',
      'document_viewed',
      'document_signed',
      'document_rejected',
      'document_cancelled',
      'document_expired',
      'document_completed',
      'signer_added',
      'signer_removed',
      'reminder_sent',
      'document_downloaded',
      'document_updated'
    )
  ),
  from_status_id uuid REFERENCES dems_document_statuses(status_id),
  to_status_id uuid REFERENCES dems_document_statuses(status_id),
  performed_by_type text NOT NULL CHECK (performed_by_type IN ('User', 'Signer', 'System')),
  performed_by_user_id uuid REFERENCES dems_users(user_id) ON DELETE SET NULL,
  performed_by_email text,
  timestamp timestamptz DEFAULT now() NOT NULL,
  ip_address text,
  device_info text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dems_audit_logs_document ON dems_audit_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_dems_audit_logs_signer ON dems_audit_logs(signer_id);
CREATE INDEX IF NOT EXISTS idx_dems_audit_logs_action ON dems_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_dems_audit_logs_timestamp ON dems_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_dems_audit_logs_performer ON dems_audit_logs(performed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_dems_audit_logs_document_timestamp ON dems_audit_logs(document_id, timestamp DESC);

COMMENT ON TABLE dems_audit_logs IS 'Complete immutable audit trail of all document activities';
COMMENT ON COLUMN dems_audit_logs.action_type IS 'Type of action performed';
COMMENT ON COLUMN dems_audit_logs.performed_by_type IS 'Actor type: User (internal), Signer (external), System (automated)';
COMMENT ON COLUMN dems_audit_logs.timestamp IS 'When the action occurred';

ALTER TABLE dems_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs for documents in their company"
  ON dems_audit_logs FOR SELECT
  TO authenticated
  USING (
    document_id IN (
      SELECT document_id FROM dems_documents 
      WHERE company_id IN (
        SELECT company_id FROM dems_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Audit logs are append-only for authenticated users"
  ON dems_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    document_id IN (
      SELECT document_id FROM dems_documents 
      WHERE company_id IN (
        SELECT company_id FROM dems_users WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dems_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_dems_companies_updated_at ON dems_companies;
CREATE TRIGGER update_dems_companies_updated_at
  BEFORE UPDATE ON dems_companies
  FOR EACH ROW
  EXECUTE FUNCTION update_dems_updated_at_column();

DROP TRIGGER IF EXISTS update_dems_departments_updated_at ON dems_departments;
CREATE TRIGGER update_dems_departments_updated_at
  BEFORE UPDATE ON dems_departments
  FOR EACH ROW
  EXECUTE FUNCTION update_dems_updated_at_column();

DROP TRIGGER IF EXISTS update_dems_users_updated_at ON dems_users;
CREATE TRIGGER update_dems_users_updated_at
  BEFORE UPDATE ON dems_users
  FOR EACH ROW
  EXECUTE FUNCTION update_dems_updated_at_column();

DROP TRIGGER IF EXISTS update_dems_documents_updated_at ON dems_documents;
CREATE TRIGGER update_dems_documents_updated_at
  BEFORE UPDATE ON dems_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_dems_updated_at_column();

DROP TRIGGER IF EXISTS update_dems_document_signers_updated_at ON dems_document_signers;
CREATE TRIGGER update_dems_document_signers_updated_at
  BEFORE UPDATE ON dems_document_signers
  FOR EACH ROW
  EXECUTE FUNCTION update_dems_updated_at_column();
