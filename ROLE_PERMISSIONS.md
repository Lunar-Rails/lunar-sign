# Complyverse DEMS - Role Permissions Matrix

## Overview

This document defines the role-based access control (RBAC) permissions for the Complyverse Document Execution Management System (DEMS) MVP.

## Actor Types

### Internal Users (Platform Users)
Internal users have authenticated access to the platform with specific roles and permissions.

### External Signers (Document Participants)
External signers are document-level participants who:
- Do NOT have platform accounts
- Do NOT appear in User Management
- Access documents ONLY via secure token links
- Are visible ONLY in document details and audit logs
- Are NOT assigned internal roles

---

## Internal User Roles

### 1. Super Admin

**Scope**: Full system access across all companies

**Permissions**:
- ✅ Access all companies, departments, users, documents, and audit trails
- ✅ Upload, send, remind, cancel/retract, and download documents across all companies
- ✅ Create, edit, and delete companies
- ✅ Create, edit, and delete departments
- ✅ Create, edit, and delete all users (including other Super Admins)
- ✅ Assign any role including Super Admin
- ✅ View and download all audit trails and reports
- ✅ Access all navigation menus and features

**UI Access**:
- Dashboard ✅
- Upload Document ✅
- Documents ✅
- Audit Trail ✅
- Companies ✅
- User Management ✅

---

### 2. Company Admin

**Scope**: Access limited to own company

**Permissions**:
- ✅ Manage company departments
- ✅ Manage company internal users (cannot assign Super Admin role)
- ✅ Manage all company documents
- ✅ Upload, send, remind, cancel/retract, and download within own company
- ✅ View company audit trails
- ❌ Cannot manage other companies
- ❌ Cannot assign Super Admin role
- ❌ Cannot access cross-company data

**UI Access**:
- Dashboard ✅
- Upload Document ✅
- Documents ✅
- Audit Trail ✅
- Companies ❌
- User Management ✅

**Assignable Roles**:
- Company Admin
- Department Admin
- User
- Viewer
- Auditor

---

### 3. Department Admin

**Scope**: Access limited to own department

**Permissions**:
- ✅ Manage department internal users
- ✅ Manage department documents
- ✅ Upload, send, remind, cancel/retract, and download within own department
- ✅ View department audit trails
- ❌ Cannot manage outside assigned department
- ❌ Cannot assign Super Admin or Company Admin roles

**UI Access**:
- Dashboard ✅
- Upload Document ✅
- Documents ✅
- Audit Trail ✅
- Companies ❌
- User Management ✅

**Assignable Roles**:
- User
- Viewer
- Auditor

---

### 4. User

**Scope**: Document creation and management for own documents

**Permissions**:
- ✅ Upload documents
- ✅ Create drafts
- ✅ Add/edit/remove signers (before sending)
- ✅ Send documents for signature
- ✅ Send reminders
- ✅ Cancel/retract own documents (before completion)
- ✅ View/download own or permitted documents
- ✅ View audit trail for own or permitted documents
- ❌ Cannot manage companies, departments, or users

**UI Access**:
- Dashboard ✅
- Upload Document ✅
- Documents ✅
- Audit Trail ✅
- Companies ❌
- User Management ❌

**Document Actions**:
- Upload ✅
- Send ✅ (draft only)
- Add Signers ✅ (draft only)
- Send Reminder ✅
- Cancel Document ✅ (before completion)
- Download ✅

---

### 5. Viewer

**Scope**: Read-only access to permitted documents

**Permissions**:
- ✅ View permitted documents
- ✅ Download permitted documents
- ✅ View permitted audit trails
- ❌ Cannot upload, send, edit, or cancel documents
- ❌ Cannot manage anything

**UI Access**:
- Dashboard ✅
- Upload Document ❌
- Documents ✅ (read-only)
- Audit Trail ✅ (read-only)
- Companies ❌
- User Management ❌

**Document Actions**:
- Upload ❌
- Send ❌
- Add Signers ❌
- Send Reminder ❌
- Cancel Document ❌
- Download ✅
- View ✅

---

### 6. Auditor

**Scope**: Read-only oversight with audit focus

**Permissions**:
- ✅ View permitted documents
- ✅ View and download audit trails/reports
- ✅ Download permitted documents
- ❌ Cannot upload, send, sign, edit, or cancel documents
- ❌ Cannot manage users, companies, or departments

**UI Access**:
- Dashboard ✅
- Upload Document ❌
- Documents ✅ (read-only)
- Audit Trail ✅
- Companies ❌
- User Management ❌

**Document Actions**:
- Upload ❌
- Send ❌
- Add Signers ❌
- Send Reminder ❌
- Cancel Document ❌
- Download ✅
- View ✅
- Download Audit Reports ✅

---

## Document Status Restrictions

### Read-Only Statuses
Documents in the following statuses are read-only and cannot be modified:
- **Completed**: All signers have signed
- **Cancelled**: Document was cancelled by authorized user
- **Rejected**: Document was rejected by a signer
- **Expired**: Signing deadline has passed

### Actionable Statuses

| Status | Can Add Signers | Can Send | Can Remind | Can Cancel |
|--------|----------------|----------|------------|------------|
| Draft | ✅ | ✅ | ❌ | ✅ |
| Sent for Signature | ❌ | ❌ | ✅ | ✅ |
| Viewed | ❌ | ❌ | ✅ | ✅ |
| Signed (Partial) | ❌ | ❌ | ✅ | ✅ |
| Completed | ❌ | ❌ | ❌ | ❌ |
| Rejected | ❌ | ❌ | ❌ | ❌ |
| Cancelled | ❌ | ❌ | ❌ | ❌ |
| Expired | ❌ | ❌ | ❌ | ❌ |

---

## Permission Enforcement

### UI Level
- Navigation items are hidden for unauthorized roles
- Action buttons are hidden for unauthorized roles
- Pages show appropriate read-only views for Viewer and Auditor roles

### Application Level
All permissions are enforced through the `permissions.ts` utility module with functions like:
- `canUploadDocument(role)`
- `canSendDocument(context)`
- `canEditDocument(context)`
- `canCancelDocument(context)`
- `canSendReminder(context)`
- `canAddSigners(context)`
- `canCreateUser(role)`
- `canEditUser(role, targetUserRole)`
- `canAssignRole(role, targetRole)`

### Data Level
Row Level Security (RLS) policies in the database enforce:
- Users can only access data within their scope (company/department)
- Super Admin has unrestricted access
- Audit logs are append-only
- External signers cannot access internal user data

---

## Role Assignment Rules

### Who Can Assign What

| Assigner Role | Can Assign |
|---------------|------------|
| Super Admin | Super Admin, Company Admin, Department Admin, User, Viewer, Auditor |
| Company Admin | Company Admin, Department Admin, User, Viewer, Auditor |
| Department Admin | User, Viewer, Auditor |
| User | ❌ None |
| Viewer | ❌ None |
| Auditor | ❌ None |

---

## External Signer Behavior

External signers are **NOT** internal users and have completely different behavior:

### Adding Signers
- Requires only: name and email
- No password, role, or account creation needed
- Added to specific documents only

### Signer Access
- Access via secure token link sent by email
- Can view assigned document only
- Can sign or reject assigned document
- No access to dashboard or other system features

### Signer Visibility
- Visible in document details (signer list)
- Visible in audit trail (signer actions)
- NOT visible in User Management
- NOT counted as platform users

---

## Implementation Status

✅ Permission utility module created
✅ AuthContext updated with role support
✅ Navigation/sidebar with role-based visibility
✅ Document action buttons with permission checks
✅ User Management with role restrictions
✅ Role assignment restrictions enforced
✅ Document status restrictions applied
⏳ Backend RLS policies (database level - to be implemented)

---

## Testing Checklist

### Super Admin
- [ ] Can access all navigation items
- [ ] Can create/edit/delete companies
- [ ] Can create/edit/delete users with any role
- [ ] Can manage documents across all companies
- [ ] Can view all audit trails

### Company Admin
- [ ] Cannot access Companies page
- [ ] Can create/edit/delete company users (except Super Admin)
- [ ] Can only assign Company Admin and below
- [ ] Can only access own company documents

### Department Admin
- [ ] Cannot access Companies or User Management pages (limited access)
- [ ] Can create/edit department users
- [ ] Can only assign User, Viewer, Auditor
- [ ] Can only access own department documents

### User
- [ ] Cannot access Companies or User Management
- [ ] Can upload and send documents
- [ ] Can add signers to drafts
- [ ] Cannot edit completed documents

### Viewer
- [ ] Cannot access upload functionality
- [ ] Can view but not edit documents
- [ ] Cannot see action buttons
- [ ] Can download permitted documents

### Auditor
- [ ] Cannot upload or send documents
- [ ] Can view audit trails
- [ ] Can download audit reports
- [ ] Read-only access to documents

### External Signers
- [ ] Not shown in User Management
- [ ] Only visible in document details
- [ ] Access via token link only
- [ ] Can sign/reject assigned document

---

## Notes

- All permission checks are performed on both UI and application logic layers
- Database RLS provides final enforcement layer
- External signers and internal users are completely separate systems
- Completed/Cancelled/Rejected/Expired documents are always read-only
- Role hierarchy: Super Admin > Company Admin > Department Admin > User/Viewer/Auditor
