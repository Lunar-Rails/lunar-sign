# Backend-Level Access Control for Complyverse DEMS

## Overview

This document defines the comprehensive backend-level access control logic for Complyverse Document Execution Management System. All data access and actions are enforced at the database level using Supabase Row Level Security (RLS) policies, ensuring security is maintained regardless of client-side implementation.

## 1. Document Access Rules

### Super Admin
- **Access**: ALL documents across ALL companies
- **Scope**: Global, unrestricted
- **Implementation**: `is_super_admin()` function bypasses all company/department restrictions

### Company Admin
- **Access**: ALL documents within their company only
- **Scope**: Company-level, restricted by `company_id`
- **Implementation**: `is_company_admin(user_id, company_id)` validates company membership

### Department Admin
- **Access**: Documents within their department only
- **Scope**: Department-level, restricted by `department_id`
- **Implementation**: `is_department_admin(user_id, department_id)` validates department membership

### User
- **Access**:
  - Documents they created (owner)
  - Documents assigned to their department
  - Documents explicitly shared with them (future feature)
- **Scope**: Owner + department-level
- **Implementation**: Policy checks `owner_user_id = auth.uid()` OR department match

### Viewer
- **Access**: Documents in their department only (read-only)
- **Scope**: Department-level, read-only
- **Implementation**: Role code = 'viewer' with department match
- **Restrictions**: Cannot create, update, or delete documents

### Auditor
- **Access**:
  - Documents within their audit scope (company or department level)
  - Full audit trails for those documents
- **Scope**: Company or department-level based on assignment
- **Implementation**: `is_auditor()` function with company/department filtering
- **Special Privilege**: Extended access to audit logs

### External Signer
- **Access**: ONLY the document linked to their secure access token
- **Scope**: Single document via token
- **Implementation**: Token-based validation in `dems_document_signers.access_token`
- **Restrictions**: Cannot access any other system data, tables, or documents

## 2. Document Ownership Model

### Ownership Rules
- Each document has exactly one `owner_user_id`
- Owner is the user who created the document
- Owner has full control within allowed lifecycle rules
- Ownership does NOT override company/department restrictions
  - Example: A User cannot access documents outside their company, even if they're the owner

### Ownership Privileges
- **View**: Owner can always view their own documents
- **Update**: Owner can update their documents (except terminal status)
- **Cancel**: Owner can cancel their documents (before completion)
- **Add Signers**: Owner can add/remove signers
- **Send for Signature**: Owner can send their documents

### Ownership Limitations
- Owner cannot transfer ownership (Super Admin only)
- Owner cannot bypass company/department isolation
- Owner cannot modify completed documents
- Owner cannot delete audit logs

## 3. Action Permission Enforcement

### Upload Document
- **Allowed Roles**: User, Department Admin, Company Admin, Super Admin
- **Enforcement**: INSERT policy on `dems_documents`
- **Validation**:
  - User must have 'user' role or higher
  - `owner_user_id` must equal authenticated user
  - `company_id` must match user's company
  - `department_id` should match user's department (for non-admins)

### Send for Signature
- **Allowed Actors**: Document owner OR admins in scope
- **Enforcement**: UPDATE policy on `dems_documents` + INSERT on `dems_document_signers`
- **Validation**:
  - User is owner OR Company/Department Admin OR Super Admin
  - Document is not in terminal status
  - At least one signer is assigned

### Cancel / Retract Document
- **Allowed Actors**: Document owner OR admins in scope
- **Allowed Status**: Before completion (non-terminal status)
- **Enforcement**: UPDATE policy checks `NOT is_document_terminal(document_id)`
- **Validation**:
  - User is owner OR Company/Department Admin OR Super Admin
  - Document status is not 'completed', 'rejected', 'cancelled', or 'expired'

### View Document
- **Allowed Actors**: Based on access rules (see section 1)
- **Enforcement**: SELECT policies on `dems_documents`
- **Validation**: Role-based filtering via RLS policies

### Download Document
- **Allowed Actors**: Anyone with view access
- **Enforcement**: Same as View (SELECT policies)
- **Validation**: If user can view, they can download

### Access Audit Trail
- **Allowed Actors**: Based on document access + Auditor privilege
- **Enforcement**: SELECT policies on `dems_audit_logs`
- **Validation**:
  - User can view the document AND
  - User has Auditor role OR higher admin privileges

### Signer Actions (External)
- **Allowed Actions**: View document, Sign, Reject
- **Enforcement**: Token-based validation
- **Validation**:
  - Valid `access_token` in `dems_document_signers`
  - Token not expired (`access_token_expires_at > now()`)
  - Token matches the specific signer record
- **Restrictions**: Cannot access any other documents or system data

## 4. API-Level Enforcement Concept

Every API call must validate:

### User Identity
- Authenticated user ID via `auth.uid()`
- User exists in `dems_users` table
- User status is 'active' (not suspended/inactive)

### User Role
- Retrieved via `get_user_role_code(auth.uid())`
- Determines access level and permissions
- Cached per session for performance

### Company & Department Context
- User's `company_id` from `dems_users`
- User's `department_id` from `dems_users`
- Used to filter all document queries

### Document Ownership
- Check if `owner_user_id = auth.uid()`
- Provides elevated privileges for owned documents

### Document Status
- Check if document is in terminal status
- Terminal documents are read-only
- Prevents modification of completed/cancelled documents

### Example Validation Flow
```sql
-- User tries to fetch documents
SELECT * FROM dems_documents
WHERE
  -- RLS policy automatically filters based on:
  -- 1. User role (super_admin, company_admin, etc.)
  -- 2. Company match (company_id)
  -- 3. Department match (department_id)
  -- 4. Ownership (owner_user_id)
  -- User only sees documents they're authorized to view
```

## 5. Data Filtering Logic

### All Document Queries Filtered By

1. **Company ID**
   - Every document belongs to exactly one company
   - Users can only access documents in their company (except Super Admin)
   - Enforced via `company_id IN (SELECT company_id FROM dems_users WHERE user_id = auth.uid())`

2. **Department ID**
   - Documents can belong to a department (optional)
   - Department Admins/Users see only their department's documents
   - Enforced via `department_id IN (SELECT department_id FROM dems_users WHERE user_id = auth.uid())`

3. **User ID (Ownership)**
   - Document owners always see their own documents
   - Enforced via `owner_user_id = auth.uid()`

4. **Role-Based Filtering**
   - Super Admin: No filtering (sees all)
   - Company Admin: Company-level filtering
   - Department Admin: Department-level filtering
   - User: Owner + department filtering
   - Viewer: Department filtering (read-only)
   - Auditor: Company or department filtering

### Query Optimization
- All filtering done at database level via RLS
- Indexes on `company_id`, `department_id`, `owner_user_id`
- Composite indexes for common query patterns
- Security functions use `STABLE SECURITY DEFINER` for performance

## 6. Security Rules

### No Direct Document Access
- All document access goes through RLS policies
- No bypassing via SQL injection or API manipulation
- Policies validate EVERY query automatically

### External Signer Access
- MUST use token validation
- Token must be valid and not expired
- Token grants access to ONE document only
- No access to user tables, other documents, or system data
- Token should be cryptographically secure (UUID v4 minimum)

### Audit Logs Immutability
- NO UPDATE policies on `dems_audit_logs`
- NO DELETE policies on `dems_audit_logs`
- Only INSERT allowed (append-only)
- Ensures complete, tamper-proof audit trail

### Completed Documents Read-Only
- Terminal status documents cannot be modified
- Enforced via `is_document_terminal()` function
- Applies to: completed, rejected, cancelled, expired
- Protects document integrity and compliance

### Password Security
- Passwords stored as bcrypt hashes in `dems_users.password_hash`
- Never exposed via SELECT policies
- External signers don't have passwords (NULL)

### Session Security
- Authenticated via Supabase Auth (`auth.uid()`)
- Session tokens managed by Supabase
- Automatic session expiration

## 7. Helper Functions

### Permission Check Functions
- `get_user_role_code(user_id)` - Returns role code for user
- `is_super_admin(user_id)` - Checks Super Admin role
- `is_company_admin(user_id, company_id)` - Checks Company Admin for specific company
- `is_department_admin(user_id, department_id)` - Checks Department Admin for specific department
- `is_auditor(user_id)` - Checks Auditor role
- `is_document_terminal(document_id)` - Checks if document is in terminal status

### Function Security
- All functions use `SECURITY DEFINER` for elevated privileges
- Functions are `STABLE` for query optimization
- Functions validate inputs and return boolean or text
- Functions are used in RLS policy expressions

## 8. Implementation Status

### ✅ Implemented
- Helper functions for permission checks
- Comprehensive RLS policies for `dems_documents`
- RLS policies for `dems_document_signers`
- RLS policies for `dems_audit_logs`
- RLS policies for `dems_users`
- Terminal document protection
- Audit log immutability
- Role-based access control

### 🔄 Future Enhancements
- Token-based external signer authentication (API layer)
- Document sharing feature (share with specific users)
- Temporary access grants (time-limited permissions)
- Advanced audit log analytics
- Role hierarchy validation (prevent privilege escalation)
- Rate limiting for external signer access

## 9. Testing & Validation

### Test Scenarios

1. **Super Admin Access**
   - Can view all documents across all companies ✓
   - Can create documents in any company ✓
   - Can update any non-terminal document ✓
   - Can delete any document ✓

2. **Company Admin Access**
   - Can view all documents in their company ✓
   - Cannot view documents in other companies ✓
   - Can create documents in their company ✓
   - Can update non-terminal documents in their company ✓

3. **Department Admin Access**
   - Can view documents in their department ✓
   - Cannot view documents in other departments ✓
   - Can create documents in their department ✓
   - Can update non-terminal documents in their department ✓

4. **User Access**
   - Can view own documents ✓
   - Can view documents in their department ✓
   - Cannot view documents outside their department ✓
   - Can create documents in their scope ✓
   - Can update own non-terminal documents ✓

5. **Viewer Access**
   - Can view documents in their department (read-only) ✓
   - Cannot create, update, or delete documents ✓

6. **Auditor Access**
   - Can view documents in their scope ✓
   - Can view audit logs for accessible documents ✓
   - Cannot modify documents ✓

7. **Terminal Document Protection**
   - Completed documents cannot be updated ✓
   - Cancelled documents cannot be modified ✓
   - Rejected documents cannot be changed ✓

8. **Audit Log Security**
   - Logs can be created (append-only) ✓
   - Logs cannot be updated ✓
   - Logs cannot be deleted ✓

## 10. Compliance Notes

This access control implementation supports:
- **SOC 2**: Role-based access control, audit trails, data isolation
- **GDPR**: Data access restrictions, audit logging, user privacy
- **HIPAA**: Access control, audit trails, data encryption (at rest/transit via Supabase)
- **ISO 27001**: Information security management, access control

All policies are enforced at the database level, ensuring security even if application layer is compromised.
