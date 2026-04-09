# Complyverse DEMS - Database Schema Documentation

## Overview

This document describes the backend-ready MVP database schema for the Complyverse Document Execution Management System (DEMS). The schema is designed to support multi-company, multi-department organizations with comprehensive document lifecycle tracking and audit capabilities.

## Critical Architecture Separation

**TWO DISTINCT ACTOR TYPES:**

1. **Internal Users** (`dems_users` table)
   - Platform users with authentication and system access
   - Have roles: Super Admin, Company Admin, Department Admin, User, Viewer, Auditor
   - Require passwords and login credentials
   - Assigned to companies and departments
   - Appear in User Management
   - Access the system dashboard and administrative features

2. **External Signers** (`dems_document_signers` table)
   - Document-level participants ONLY
   - NO platform accounts or system access
   - NO passwords or internal roles
   - Access documents via secure token links
   - Only visible in document details and audit logs
   - Do NOT appear in User Management

**These are completely separate and should NEVER be mixed.**

## Technology Stack

- **Database**: PostgreSQL (via Supabase)
- **Primary Keys**: UUID v4
- **Timestamps**: timestamptz (timezone-aware)
- **Security**: Row Level Security (RLS) enabled on all tables

## Entity Relationship Diagram

```
┌─────────────┐
│  Companies  │
└──────┬──────┘
       │ 1
       │
       │ N
┌──────┴──────────┐
│  Departments    │
└──────┬──────────┘
       │ 1
       │
       │ N     ┌─────────┐
┌──────┴────┐  │  Roles  │
│   Users   │──┴─────────┘
└──────┬────┘       1:N
       │ 1
       │
       │ N (owner)
┌──────┴───────────┐      ┌────────────────────┐
│   Documents      │──────│ Document Statuses  │
└──────┬───────────┘  N:1 └────────────────────┘
       │ 1
       │
       ├──────────┬──────────────┐
       │ N        │ N            │
┌──────┴──────┐   │      ┌───────┴──────┐
│   Signers   │   │      │ Audit Logs   │
└─────────────┘   │      └──────────────┘
                  │
                  └──────────────┐
                         1       │ N
                         ┌───────┴──────┐
                         │ Audit Logs   │
                         └──────────────┘
```

## Core Tables

### 1. dems_companies

**Purpose**: Multi-tenant company records

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| company_id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique company identifier |
| company_name | text | NOT NULL | Company display name |
| company_code | text | UNIQUE, NOT NULL | Unique company code for identification |
| status | text | NOT NULL, DEFAULT 'active' | Company status: active, inactive, suspended |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_dems_companies_status` on (status)
- `idx_dems_companies_code` on (company_code)

**RLS Policies**:
- SELECT: Viewable by all authenticated users

---

### 2. dems_departments

**Purpose**: Organizational units within companies

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| department_id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique department identifier |
| company_id | uuid | FK → companies.company_id, NOT NULL | Parent company |
| department_name | text | NOT NULL | Department display name |
| department_code | text | NOT NULL, UNIQUE with company_id | Department code (unique per company) |
| status | text | NOT NULL, DEFAULT 'active' | Department status: active, inactive |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last update timestamp |

**Constraints**:
- UNIQUE(company_id, department_code)
- ON DELETE CASCADE on company_id

**Indexes**:
- `idx_dems_departments_company` on (company_id)
- `idx_dems_departments_status` on (status)
- `idx_dems_departments_code` on (company_id, department_code)

**RLS Policies**:
- SELECT: Viewable by all authenticated users

---

### 3. dems_roles

**Purpose**: Internal user permission levels and access control definitions

**IMPORTANT**: These roles are for internal platform users ONLY. External signers do NOT have system roles.

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| role_id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique role identifier |
| role_name | text | UNIQUE, NOT NULL | Role display name |
| role_code | text | UNIQUE, NOT NULL | Role code for programmatic access |
| description | text | NULL | Role description |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Record creation timestamp |

**Predefined Internal Roles**:

| Role Name | Code | Description |
|-----------|------|-------------|
| Super Admin | super_admin | Full system access across all companies |
| Company Admin | company_admin | Full access within company scope |
| Department Admin | department_admin | Full access within department scope |
| User | user | Standard user with document creation rights |
| Viewer | viewer | Read-only access to documents |
| Auditor | auditor | Read-only access to audit logs and compliance reports |

**Note**: The "Signer" role has been removed. External signers are NOT internal users and exist only in the `dems_document_signers` table.

**Indexes**:
- `idx_dems_roles_code` on (role_code)

**RLS Policies**:
- SELECT: Viewable by all authenticated users

---

### 4. dems_users

**Purpose**: Internal authenticated platform users ONLY

**IMPORTANT**: This table stores internal users who have platform access. External document signers are stored in `dems_document_signers` table.

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique user identifier |
| company_id | uuid | FK → companies.company_id, NULL | User's company |
| department_id | uuid | FK → departments.department_id, NULL | User's department |
| role_id | uuid | FK → roles.role_id, NOT NULL | Internal system role |
| full_name | text | NOT NULL | User's full name |
| email | text | UNIQUE, NOT NULL | User's email address |
| password_hash | text | NULL | Bcrypt hashed password |
| status | text | NOT NULL, DEFAULT 'active' | User status: active, inactive, suspended, invited |
| last_login_at | timestamptz | NULL | Last successful login timestamp |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last update timestamp |

**Constraints**:
- ON DELETE SET NULL on company_id and department_id
- ON DELETE RESTRICT on role_id

**Indexes**:
- `idx_dems_users_email` on (email)
- `idx_dems_users_company` on (company_id)
- `idx_dems_users_department` on (department_id)
- `idx_dems_users_role` on (role_id)
- `idx_dems_users_status` on (status)

**RLS Policies**:
- SELECT: Users can view own profile
- UPDATE: Users can update own profile

---

### 5. dems_document_statuses

**Purpose**: Extensible document status definitions

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| status_id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique status identifier |
| status_name | text | UNIQUE, NOT NULL | Status display name |
| status_code | text | UNIQUE, NOT NULL | Status code for programmatic access |
| category | text | NOT NULL | Status category: draft, active, terminal |
| display_order | int | NOT NULL | Sort order for UI display |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Record creation timestamp |

**Predefined Statuses**:

| Status Name | Code | Category | Order | Description |
|-------------|------|----------|-------|-------------|
| Draft | draft | draft | 1 | Document created but not sent |
| Sent for Signature | sent_for_signature | active | 2 | Document sent to signers, no views yet |
| Viewed | viewed | active | 3 | At least one signer viewed, none signed |
| Signed (Partial) | signed_partial | active | 4 | Some but not all signers have signed |
| Completed | completed | terminal | 5 | All signers have signed |
| Rejected | rejected | terminal | 6 | At least one signer rejected |
| Cancelled | cancelled | terminal | 7 | Document cancelled by owner |
| Expired | expired | terminal | 8 | Signing deadline passed |

**Status Categories**:
- **draft**: Document not yet sent to signers
- **active**: Document in signing process
- **terminal**: Final state, no further action possible

**Indexes**:
- `idx_dems_document_statuses_code` on (status_code)
- `idx_dems_document_statuses_category` on (category)
- `idx_dems_document_statuses_order` on (display_order)

**RLS Policies**:
- SELECT: Viewable by all authenticated users

---

### 6. dems_documents

**Purpose**: Core document records with lifecycle tracking

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| document_id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique document identifier |
| document_number | text | UNIQUE, NOT NULL | Human-readable document number |
| title | text | NOT NULL | Document title |
| description | text | NULL | Document description |
| document_type | text | NOT NULL | Type of document (e.g., Contract, NDA, MOU) |
| file_name | text | NOT NULL | Original file name |
| file_url | text | NOT NULL | File storage URL |
| file_size | bigint | NOT NULL | File size in bytes |
| file_format | text | NOT NULL | File format (e.g., PDF, DOCX) |
| company_id | uuid | FK → companies.company_id, NOT NULL | Owning company |
| department_id | uuid | FK → departments.department_id, NULL | Owning department (optional) |
| owner_user_id | uuid | FK → users.user_id, NOT NULL | Document owner/creator |
| current_status_id | uuid | FK → document_statuses.status_id, NOT NULL | Current document status |
| total_signers | int | NOT NULL, DEFAULT 0 | Total number of signers assigned |
| signed_signers_count | int | NOT NULL, DEFAULT 0 | Number of signers who completed signing |
| viewed_signers_count | int | NOT NULL, DEFAULT 0 | Number of signers who viewed document |
| rejected_signers_count | int | NOT NULL, DEFAULT 0 | Number of signers who rejected |
| sent_at | timestamptz | NULL | When document was sent to signers |
| completed_at | timestamptz | NULL | When all signatures were completed |
| cancelled_at | timestamptz | NULL | When document was cancelled |
| expired_at | timestamptz | NULL | When document expired |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last update timestamp |

**Constraints**:
- ON DELETE CASCADE on company_id
- ON DELETE SET NULL on department_id
- ON DELETE RESTRICT on owner_user_id (prevents deleting user who owns documents)
- CHECK: signed_signers_count >= 0 AND viewed_signers_count >= 0 AND rejected_signers_count >= 0 AND signed_signers_count <= total_signers

**Indexes**:
- `idx_dems_documents_number` on (document_number)
- `idx_dems_documents_company` on (company_id)
- `idx_dems_documents_department` on (department_id)
- `idx_dems_documents_owner` on (owner_user_id)
- `idx_dems_documents_status` on (current_status_id)
- `idx_dems_documents_type` on (document_type)
- `idx_dems_documents_created` on (created_at DESC)
- `idx_dems_documents_sent` on (sent_at DESC NULLS LAST)

**RLS Policies**:
- SELECT: Users can view documents in their company
- INSERT: Users can create documents in their company (and must be owner)
- UPDATE: Document owners can update their documents

---

### 7. dems_document_signers

**Purpose**: External document signers - document-level participants ONLY

**IMPORTANT**: This table stores external signers who are NOT internal platform users. They:
- Do NOT have platform accounts or login credentials
- Do NOT have internal system roles
- Do NOT appear in User Management
- Access documents ONLY via secure token links
- Are visible ONLY in document details, signer lists, and audit logs

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| signer_id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique signer identifier |
| document_id | uuid | FK → documents.document_id, NOT NULL | Document to be signed |
| signer_name | text | NOT NULL | Signer's full name |
| signer_email | text | NOT NULL | External signer's email (NOT linked to dems_users) |
| signer_role | text | NULL | Optional label like "Director", "Witness" (NOT a system role) |
| signing_order | int | NOT NULL, CHECK > 0 | Order in signing sequence (1-based) |
| signer_status | text | NOT NULL, DEFAULT 'Pending' | Signer status: Pending, Viewed, Signed, Rejected, Expired |
| viewed_at | timestamptz | NULL | When signer viewed the document |
| signed_at | timestamptz | NULL | When signer completed signing |
| rejected_at | timestamptz | NULL | When signer rejected the document |
| access_token | text | UNIQUE, NULL | Unique token for signer access link |
| access_token_expires_at | timestamptz | NULL | Token expiration timestamp |
| ip_address | text | NULL | IP address of signer action |
| device_info | text | NULL | Device/browser info of signer |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last update timestamp |

**Constraints**:
- ON DELETE CASCADE on document_id

**Indexes**:
- `idx_dems_signers_document` on (document_id)
- `idx_dems_signers_email` on (signer_email)
- `idx_dems_signers_status` on (signer_status)
- `idx_dems_signers_order` on (document_id, signing_order)
- `idx_dems_signers_token` on (access_token) WHERE access_token IS NOT NULL

**RLS Policies**:
- SELECT: Users can view signers for documents in their company
- ALL: Document owners can manage signers

---

### 8. dems_audit_logs

**Purpose**: Complete immutable audit trail of all document activities

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| audit_log_id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique audit log identifier |
| document_id | uuid | FK → documents.document_id, NOT NULL | Related document |
| signer_id | uuid | FK → document_signers.signer_id, NULL | Related signer (if applicable) |
| action_type | text | NOT NULL | Type of action performed |
| from_status_id | uuid | FK → document_statuses.status_id, NULL | Status before action |
| to_status_id | uuid | FK → document_statuses.status_id, NULL | Status after action |
| performed_by_type | text | NOT NULL | Actor type: User, Signer, System |
| performed_by_user_id | uuid | FK → users.user_id, NULL | User who performed action (if User type) |
| performed_by_email | text | NULL | Email of performer (for Signer type) |
| timestamp | timestamptz | NOT NULL, DEFAULT now() | When action occurred |
| ip_address | text | NULL | IP address of action |
| device_info | text | NULL | Device/browser info |
| notes | text | NULL | Additional context or notes |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Record creation timestamp |

**Action Types**:
- document_created
- document_sent
- document_viewed
- document_signed
- document_rejected
- document_cancelled
- document_expired
- document_completed
- signer_added
- signer_removed
- reminder_sent
- document_downloaded
- document_updated

**Constraints**:
- ON DELETE CASCADE on document_id
- ON DELETE SET NULL on signer_id, performed_by_user_id

**Indexes**:
- `idx_dems_audit_logs_document` on (document_id)
- `idx_dems_audit_logs_signer` on (signer_id)
- `idx_dems_audit_logs_action` on (action_type)
- `idx_dems_audit_logs_timestamp` on (timestamp DESC)
- `idx_dems_audit_logs_performer` on (performed_by_user_id)
- `idx_dems_audit_logs_document_timestamp` on (document_id, timestamp DESC)

**RLS Policies**:
- SELECT: Users can view audit logs for documents in their company
- INSERT: Append-only for authenticated users (within their company)

---

## Database Functions & Triggers

### update_dems_updated_at_column()

**Purpose**: Automatically update the `updated_at` column on record modification

**Applied to**:
- dems_companies
- dems_departments
- dems_users
- dems_documents
- dems_document_signers

---

## Security Model

### Row Level Security (RLS)

All tables have RLS enabled with policies that:

1. **Company Isolation**: Users can only access data within their company
2. **Ownership**: Document owners have full control over their documents
3. **Audit Trail**: Append-only audit logs prevent tampering
4. **Profile Privacy**: Users can only view/edit their own profile

### Data Protection

- **Password Hashing**: Passwords stored as bcrypt hashes
- **Access Tokens**: Unique tokens for signer access with expiration
- **Audit Trail**: Immutable record of all activities
- **Soft Deletes**: Critical data uses status fields instead of hard deletes

---

## Common Queries

### Get documents with full details

```sql
SELECT
  d.*,
  ds.status_name,
  c.company_name,
  dept.department_name,
  u.full_name as owner_name
FROM dems_documents d
JOIN dems_document_statuses ds ON d.current_status_id = ds.status_id
JOIN dems_companies c ON d.company_id = c.company_id
LEFT JOIN dems_departments dept ON d.department_id = dept.department_id
JOIN dems_users u ON d.owner_user_id = u.user_id
WHERE d.company_id = $1
ORDER BY d.created_at DESC;
```

### Get document with signers

```sql
SELECT
  d.*,
  json_agg(
    json_build_object(
      'signer_id', s.signer_id,
      'name', s.signer_name,
      'email', s.signer_email,
      'status', s.signer_status,
      'signing_order', s.signing_order
    ) ORDER BY s.signing_order
  ) as signers
FROM dems_documents d
LEFT JOIN dems_document_signers s ON d.document_id = s.document_id
WHERE d.document_id = $1
GROUP BY d.document_id;
```

### Get audit trail for document

```sql
SELECT
  al.*,
  fs.status_name as from_status,
  ts.status_name as to_status,
  u.full_name as performer_name
FROM dems_audit_logs al
LEFT JOIN dems_document_statuses fs ON al.from_status_id = fs.status_id
LEFT JOIN dems_document_statuses ts ON al.to_status_id = ts.status_id
LEFT JOIN dems_users u ON al.performed_by_user_id = u.user_id
WHERE al.document_id = $1
ORDER BY al.timestamp DESC;
```

---

## Migration Status

**Migration File**: `create_complyverse_dems_core_schema`

**Applied**: Yes

**Tables Created**: 8

**Initial Data**: Roles and Document Statuses seeded

---

## TypeScript Integration

TypeScript types are available in: `src/types/schema.ts`

Import example:
```typescript
import {
  Document,
  DocumentSigner,
  AuditLog,
  DocumentStatusCode
} from '@/types/schema';
```

---

## Next Steps for Backend Implementation

1. **Authentication Integration**
   - Link Supabase Auth with dems_users table
   - Implement JWT-based authentication
   - Add email verification flow

2. **File Storage**
   - Configure Supabase Storage bucket for documents
   - Implement signed URLs for secure file access
   - Add file upload validation

3. **API Endpoints**
   - Document CRUD operations
   - Signer management
   - Document sending and signing flows
   - Audit log queries

4. **Business Logic**
   - Status transition validation
   - Email notifications (document sent, reminder, completion)
   - Access token generation and validation
   - Signature capture and verification

5. **Advanced Features**
   - Document templates
   - Bulk operations
   - Advanced filtering and search
   - Reporting and analytics
   - Document versioning
