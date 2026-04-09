# Complyverse DEMS - MVP API Design

## Overview

This document defines the complete REST API interface for Complyverse Document Execution Management System MVP. All endpoints enforce backend-level access control via Supabase RLS policies.

**Base URL**: `/api/v1`

**Authentication**: Bearer token (Supabase JWT) in `Authorization` header for internal users, Token-based access for external signers.

**Total Endpoints**: 63

### API Summary

| API Group | Endpoints | Description |
|-----------|-----------|-------------|
| Auth APIs | 6 | Login, logout, session management, password reset |
| Company/Department/User Management | 11 | Organization structure and internal user management |
| Document APIs | 10 | Document lifecycle management (create, upload, send, cancel) |
| Signer APIs | 9 | External signer management and token-based access |
| Audit APIs | 3 | Audit trail and compliance reporting |
| Dashboard APIs | 3 | Statistics, activity feed, trends |

### Critical Document Workflow

**Step-by-step process for document execution:**

```
1. CREATE DRAFT
   POST /documents
   ↓
2. UPLOAD FILE
   POST /documents/:document_id/upload
   ↓
3. ADD SIGNERS (one or more)
   POST /documents/:document_id/signers
   ↓
4. OPTIONALLY EDIT/REMOVE SIGNERS (only in draft)
   PATCH /documents/:document_id/signers/:signer_id
   DELETE /documents/:document_id/signers/:signer_id
   ↓
5. SEND FOR SIGNATURE (requires ≥1 signer)
   POST /documents/:document_id/send
   ↓
6. SIGNERS RECEIVE EMAIL & ACCESS VIA TOKEN
   GET /signer/access/:access_token
   POST /signer/sign/:access_token
   ↓
7. DOCUMENT COMPLETION
   Status: completed (when all sign) OR rejected (if any reject)
```

**Important**: Steps 1-4 can only be performed when document is in **draft** status. After step 5 (send), the document is locked and signers cannot be modified.

---

## 1. AUTH APIs

### 1.1 Login

**Endpoint**: `POST /auth/login`

**Purpose**: Authenticate internal user and obtain session token

**Access**: Public (unauthenticated)

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response** (Success):
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": {
        "role_id": "uuid",
        "role_name": "User",
        "role_code": "user"
      },
      "company": {
        "company_id": "uuid",
        "company_name": "Acme Corp"
      },
      "department": {
        "department_id": "uuid",
        "department_name": "Legal"
      },
      "status": "active"
    },
    "session": {
      "access_token": "jwt_token_here",
      "refresh_token": "refresh_token_here",
      "expires_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

**Notes**:
- Uses Supabase Auth `signInWithPassword()`
- Only for internal users (not external signers)
- Returns full user profile with role and organizational context

---

### 1.2 Logout

**Endpoint**: `POST /auth/logout`

**Purpose**: Invalidate current session token

**Access**: Authenticated users only

**Request**: No body required (uses token from header)

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Notes**:
- Uses Supabase Auth `signOut()`
- Invalidates refresh token

---

### 1.3 Get Current User Profile

**Endpoint**: `GET /auth/me`

**Purpose**: Retrieve authenticated user's profile and permissions

**Access**: Authenticated users only

**Response**:
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": {
      "role_id": "uuid",
      "role_name": "User",
      "role_code": "user"
    },
    "company": {
      "company_id": "uuid",
      "company_name": "Acme Corp",
      "company_code": "ACME"
    },
    "department": {
      "department_id": "uuid",
      "department_name": "Legal",
      "department_code": "LEGAL"
    },
    "status": "active",
    "last_login_at": "2024-01-01T00:00:00Z",
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

**Notes**:
- Used to populate UI context and permissions
- Returns organizational hierarchy for filtering

---

### 1.4 Refresh Session

**Endpoint**: `POST /auth/refresh`

**Purpose**: Obtain new access token using refresh token

**Access**: Public (requires valid refresh token)

**Request**:
```json
{
  "refresh_token": "refresh_token_here"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "access_token": "new_jwt_token_here",
    "refresh_token": "new_refresh_token_here",
    "expires_at": "2024-01-01T00:00:00Z"
  }
}
```

**Notes**:
- Uses Supabase Auth `refreshSession()`
- Returns new token pair

---

### 1.5 Forgot Password

**Endpoint**: `POST /auth/forgot-password`

**Purpose**: Request password reset email

**Access**: Public (unauthenticated)

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password reset email sent if account exists"
}
```

**Notes**:
- Generic response to prevent email enumeration
- Only for internal users
- Sends email via Supabase Auth

---

### 1.6 Reset Password

**Endpoint**: `POST /auth/reset-password`

**Purpose**: Set new password using reset token

**Access**: Public (requires valid reset token)

**Request**:
```json
{
  "reset_token": "token_from_email",
  "new_password": "newSecurePassword123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Notes**:
- Token validated by Supabase Auth
- Password must meet security requirements

---

## 2. COMPANY / DEPARTMENT / USER MANAGEMENT APIs

### 2.1 List Companies

**Endpoint**: `GET /companies`

**Purpose**: Retrieve list of companies

**Access**:
- **Super Admin**: All companies
- **Company Admin**: Their company only
- **Others**: Not allowed

**Query Parameters**:
- `status` (optional): active | inactive | suspended
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response**:
```json
{
  "success": true,
  "data": {
    "companies": [
      {
        "company_id": "uuid",
        "company_name": "Acme Corp",
        "company_code": "ACME",
        "status": "active",
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "total_pages": 3
    }
  }
}
```

**Notes**:
- RLS automatically filters based on user role
- Super Admin sees all companies

---

### 2.2 Create Company

**Endpoint**: `POST /companies`

**Purpose**: Create new company

**Access**: Super Admin only

**Request**:
```json
{
  "company_name": "New Corp",
  "company_code": "NEWCORP",
  "status": "active"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "company_id": "uuid",
    "company_name": "New Corp",
    "company_code": "NEWCORP",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Notes**:
- `company_code` must be unique
- Only Super Admin can create companies

---

### 2.3 Update Company

**Endpoint**: `PATCH /companies/:company_id`

**Purpose**: Update company details

**Access**: Super Admin only

**Request**:
```json
{
  "company_name": "Updated Corp Name",
  "status": "inactive"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "company_id": "uuid",
    "company_name": "Updated Corp Name",
    "company_code": "ACME",
    "status": "inactive",
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### 2.4 List Departments by Company

**Endpoint**: `GET /companies/:company_id/departments`

**Purpose**: Retrieve departments within a company

**Access**:
- **Super Admin**: All departments in any company
- **Company Admin**: All departments in their company
- **Department Admin**: Their department only
- **Others**: Departments in their scope

**Query Parameters**:
- `status` (optional): active | inactive
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response**:
```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "department_id": "uuid",
        "company_id": "uuid",
        "department_name": "Legal",
        "department_code": "LEGAL",
        "status": "active",
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "total_pages": 1
    }
  }
}
```

**Notes**:
- RLS filters based on user's company access

---

### 2.5 Create Department

**Endpoint**: `POST /companies/:company_id/departments`

**Purpose**: Create new department within a company

**Access**:
- **Super Admin**: Any company
- **Company Admin**: Their company only

**Request**:
```json
{
  "department_name": "Finance",
  "department_code": "FIN",
  "status": "active"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "department_id": "uuid",
    "company_id": "uuid",
    "department_name": "Finance",
    "department_code": "FIN",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Notes**:
- `department_code` must be unique within company

---

### 2.6 Update Department

**Endpoint**: `PATCH /departments/:department_id`

**Purpose**: Update department details

**Access**:
- **Super Admin**: Any department
- **Company Admin**: Departments in their company

**Request**:
```json
{
  "department_name": "Updated Finance",
  "status": "inactive"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "department_id": "uuid",
    "company_id": "uuid",
    "department_name": "Updated Finance",
    "department_code": "FIN",
    "status": "inactive",
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### 2.7 List Internal Users

**Endpoint**: `GET /users`

**Purpose**: Retrieve list of internal platform users

**Access**:
- **Super Admin**: All users
- **Company Admin**: Users in their company
- **Department Admin**: Users in their department
- **Others**: Own profile only

**Query Parameters**:
- `company_id` (optional): Filter by company
- `department_id` (optional): Filter by department
- `role_code` (optional): Filter by role
- `status` (optional): active | inactive | suspended | invited
- `search` (optional): Search by name or email
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "user_id": "uuid",
        "full_name": "Jane Smith",
        "email": "jane@example.com",
        "role": {
          "role_id": "uuid",
          "role_name": "Company Admin",
          "role_code": "company_admin"
        },
        "company": {
          "company_id": "uuid",
          "company_name": "Acme Corp"
        },
        "department": {
          "department_id": "uuid",
          "department_name": "Legal"
        },
        "status": "active",
        "last_login_at": "2024-01-01T00:00:00Z",
        "created_at": "2023-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "total_pages": 3
    }
  }
}
```

**Notes**:
- EXCLUDES external signers (they are NOT internal users)
- RLS automatically filters based on access scope
- Password hash never returned

---

### 2.8 Create Internal User

**Endpoint**: `POST /users`

**Purpose**: Create new internal platform user

**Access**:
- **Super Admin**: Create in any company/department
- **Company Admin**: Create in their company
- **Department Admin**: Create in their department

**Request**:
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "role_id": "uuid",
  "company_id": "uuid",
  "department_id": "uuid",
  "password": "temporaryPassword123",
  "status": "invited"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "full_name": "John Doe",
    "email": "john@example.com",
    "role": {
      "role_id": "uuid",
      "role_name": "User",
      "role_code": "user"
    },
    "company": {
      "company_id": "uuid",
      "company_name": "Acme Corp"
    },
    "department": {
      "department_id": "uuid",
      "department_name": "Legal"
    },
    "status": "invited",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Notes**:
- Email must be unique
- Status typically starts as 'invited'
- Invitation email sent with password reset link
- Cannot create users outside admin's scope

---

### 2.9 Update Internal User

**Endpoint**: `PATCH /users/:user_id`

**Purpose**: Update internal user details

**Access**:
- **Super Admin**: Update any user
- **Company Admin**: Update users in their company
- **Department Admin**: Update users in their department
- **All Users**: Update own profile (limited fields)

**Request**:
```json
{
  "full_name": "John M. Doe",
  "role_id": "uuid",
  "department_id": "uuid",
  "status": "active"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "full_name": "John M. Doe",
    "email": "john@example.com",
    "role": {
      "role_id": "uuid",
      "role_name": "Department Admin",
      "role_code": "department_admin"
    },
    "company": {
      "company_id": "uuid",
      "company_name": "Acme Corp"
    },
    "department": {
      "department_id": "uuid",
      "department_name": "Finance"
    },
    "status": "active",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Notes**:
- Regular users can only update own name/profile fields
- Admins can update role, department, status
- Cannot change email (use separate endpoint)

---

### 2.10 Deactivate Internal User

**Endpoint**: `POST /users/:user_id/deactivate`

**Purpose**: Deactivate/suspend internal user account

**Access**:
- **Super Admin**: Deactivate any user
- **Company Admin**: Deactivate users in their company
- **Department Admin**: Deactivate users in their department

**Request**:
```json
{
  "reason": "Left company",
  "status": "inactive"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "status": "inactive",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Notes**:
- Status can be: inactive | suspended
- User loses access immediately
- Historical data (documents, audit logs) preserved

---

### 2.11 Assign Role

**Endpoint**: `POST /users/:user_id/assign-role`

**Purpose**: Change user's role

**Access**:
- **Super Admin**: Assign any role to any user
- **Company Admin**: Assign non-admin roles in their company
- **Department Admin**: Cannot assign roles

**Request**:
```json
{
  "role_id": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "role": {
      "role_id": "uuid",
      "role_name": "Auditor",
      "role_code": "auditor"
    },
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Notes**:
- Role change takes effect immediately
- Cannot assign Super Admin role (Super Admin only)
- Validates role exists and is appropriate for user's company

---

## 3. DOCUMENT APIs

### 3.1 Create Document Draft

**Endpoint**: `POST /documents`

**Purpose**: Create new document in draft status

**Access**:
- **User and above**: Can create documents in their scope
- **Viewer**: Cannot create

**Request**:
```json
{
  "title": "Service Agreement 2024",
  "description": "Annual service agreement with vendor",
  "document_type": "contract",
  "company_id": "uuid",
  "department_id": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "document_id": "uuid",
    "document_number": "DOC-2024-00123",
    "title": "Service Agreement 2024",
    "description": "Annual service agreement with vendor",
    "document_type": "contract",
    "company_id": "uuid",
    "department_id": "uuid",
    "owner_user_id": "uuid",
    "current_status": {
      "status_id": "uuid",
      "status_name": "Draft",
      "status_code": "draft"
    },
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Notes**:
- Owner is automatically set to authenticated user
- Document starts in 'draft' status
- Document number auto-generated
- Cannot create outside user's company scope

---

### 3.2 Upload Document File

**Endpoint**: `POST /documents/:document_id/upload`

**Purpose**: Upload PDF file to draft document

**Access**: Document owner or admins in scope

**Request**: Multipart form data
```
file: [PDF file binary]
```

**Response**:
```json
{
  "success": true,
  "data": {
    "document_id": "uuid",
    "file_name": "service_agreement.pdf",
    "file_url": "https://storage.url/path/to/file.pdf",
    "file_size": 2048576,
    "file_format": "pdf",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Notes**:
- Only PDF files allowed
- Max file size: 50MB
- Only allowed for draft documents
- Replaces existing file if already uploaded

---

### 3.3 Update Draft Document Metadata

**Endpoint**: `PATCH /documents/:document_id`

**Purpose**: Update document title, description, type

**Access**: Document owner or admins in scope

**Request**:
```json
{
  "title": "Updated Service Agreement 2024",
  "description": "Updated description",
  "document_type": "agreement"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "document_id": "uuid",
    "document_number": "DOC-2024-00123",
    "title": "Updated Service Agreement 2024",
    "description": "Updated description",
    "document_type": "agreement",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Notes**:
- Only allowed for non-terminal documents
- Cannot change company_id or department_id
- Cannot change owner_user_id

---

### 3.4 List Documents

**Endpoint**: `GET /documents`

**Purpose**: Retrieve list of documents based on user's access

**Access**: All authenticated users (filtered by RLS)

**Query Parameters**:
- `company_id` (optional): Filter by company
- `department_id` (optional): Filter by department
- `status_code` (optional): draft | sent_for_signature | viewed | signed_partial | completed | rejected | cancelled | expired
- `owner_user_id` (optional): Filter by owner
- `document_type` (optional): Filter by type
- `from_date` (optional): Created/sent after date
- `to_date` (optional): Created/sent before date
- `search` (optional): Search in title/description/document_number
- `sort` (optional): created_at | sent_at | updated_at (default: created_at)
- `order` (optional): asc | desc (default: desc)
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response**:
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "document_id": "uuid",
        "document_number": "DOC-2024-00123",
        "title": "Service Agreement 2024",
        "description": "Annual service agreement",
        "document_type": "contract",
        "company": {
          "company_id": "uuid",
          "company_name": "Acme Corp"
        },
        "department": {
          "department_id": "uuid",
          "department_name": "Legal"
        },
        "owner": {
          "user_id": "uuid",
          "full_name": "John Doe"
        },
        "current_status": {
          "status_id": "uuid",
          "status_name": "Sent for Signature",
          "status_code": "sent_for_signature"
        },
        "total_signers": 3,
        "signed_signers_count": 1,
        "viewed_signers_count": 2,
        "sent_at": "2024-01-01T00:00:00Z",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8
    }
  }
}
```

**Notes**:
- RLS automatically filters based on user role and scope
- Super Admin sees all documents
- Users see documents they own or in their department

---

### 3.5 Get Document Detail

**Endpoint**: `GET /documents/:document_id`

**Purpose**: Retrieve full document details including signers

**Access**: Users with document access (based on RLS)

**Response**:
```json
{
  "success": true,
  "data": {
    "document_id": "uuid",
    "document_number": "DOC-2024-00123",
    "title": "Service Agreement 2024",
    "description": "Annual service agreement with vendor",
    "document_type": "contract",
    "file_name": "service_agreement.pdf",
    "file_url": "https://storage.url/path/to/file.pdf",
    "file_size": 2048576,
    "file_format": "pdf",
    "company": {
      "company_id": "uuid",
      "company_name": "Acme Corp",
      "company_code": "ACME"
    },
    "department": {
      "department_id": "uuid",
      "department_name": "Legal",
      "department_code": "LEGAL"
    },
    "owner": {
      "user_id": "uuid",
      "full_name": "John Doe",
      "email": "john@example.com"
    },
    "current_status": {
      "status_id": "uuid",
      "status_name": "Sent for Signature",
      "status_code": "sent_for_signature",
      "category": "active"
    },
    "signers": [
      {
        "signer_id": "uuid",
        "signer_name": "Jane Client",
        "signer_email": "jane@client.com",
        "signer_role": "CEO",
        "signing_order": 1,
        "signer_status": "Signed",
        "viewed_at": "2024-01-01T10:00:00Z",
        "signed_at": "2024-01-01T11:00:00Z"
      },
      {
        "signer_id": "uuid",
        "signer_name": "Bob Approver",
        "signer_email": "bob@client.com",
        "signer_role": "CFO",
        "signing_order": 2,
        "signer_status": "Viewed",
        "viewed_at": "2024-01-01T12:00:00Z"
      }
    ],
    "total_signers": 3,
    "signed_signers_count": 1,
    "viewed_signers_count": 2,
    "rejected_signers_count": 0,
    "sent_at": "2024-01-01T09:00:00Z",
    "created_at": "2024-01-01T08:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  }
}
```

**Notes**:
- Includes full signer list with statuses
- File URL may require separate authentication
- RLS enforces access control

---

### 3.6 Send Document for Signature

**Endpoint**: `POST /documents/:document_id/send`

**Purpose**: Send document to signers and transition to active status

**Access**: Document owner or admins in scope

**Request**:
```json
{
  "message": "Please review and sign this service agreement",
  "expiry_days": 30
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "document_id": "uuid",
    "current_status": {
      "status_name": "Sent for Signature",
      "status_code": "sent_for_signature"
    },
    "sent_at": "2024-01-01T00:00:00Z",
    "expired_at": "2024-01-31T00:00:00Z",
    "signers_notified": 3
  }
}
```

**Pre-requisites (Validation Rules)**:
1. Document must be in 'draft' status
2. **Must have at least one signer** (added via `POST /documents/:document_id/signers`)
3. Must have file uploaded (via `POST /documents/:document_id/upload`)

**Notes**:
- Returns `400 Bad Request` with error code `MISSING_SIGNERS` if no signers exist
- Returns `400 Bad Request` with error code `MISSING_FILE` if no file uploaded
- Returns `409 Conflict` with error code `INVALID_LIFECYCLE_ACTION` if not in draft status
- Generates unique access tokens for each signer
- Sends email notifications to all signers with secure access links
- Creates audit log entry: `document_sent`
- Document status transitions from 'draft' to 'sent_for_signature'
- After sending, signers cannot be added/removed (document is locked)

---

### 3.7 Cancel/Retract Document

**Endpoint**: `POST /documents/:document_id/cancel`

**Purpose**: Cancel document and prevent further signing

**Access**: Document owner or admins in scope

**Request**:
```json
{
  "reason": "Contract terms changed",
  "notify_signers": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "document_id": "uuid",
    "current_status": {
      "status_name": "Cancelled",
      "status_code": "cancelled"
    },
    "cancelled_at": "2024-01-01T00:00:00Z"
  }
}
```

**Notes**:
- Only allowed for non-terminal documents
- Cannot cancel completed documents
- Notifies pending signers if requested
- Creates audit log entry

---

### 3.8 Download Document

**Endpoint**: `GET /documents/:document_id/download`

**Purpose**: Download original document file

**Access**: Users with document view access

**Response**: Binary PDF file with appropriate headers
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="service_agreement.pdf"
```

**Notes**:
- Requires document view access
- Creates audit log entry
- Returns original uploaded file

---

### 3.9 Download Signed Document

**Endpoint**: `GET /documents/:document_id/download-signed`

**Purpose**: Download completed document with signature certificates

**Access**: Users with document view access

**Response**: Binary PDF file with signatures and certificate

**Notes**:
- Only available for completed documents
- Includes signature certificate page
- Includes audit trail summary
- Creates audit log entry

---

### 3.10 List Document Statuses

**Endpoint**: `GET /document-statuses`

**Purpose**: Retrieve all available document statuses

**Access**: All authenticated users

**Response**:
```json
{
  "success": true,
  "data": {
    "statuses": [
      {
        "status_id": "uuid",
        "status_name": "Draft",
        "status_code": "draft",
        "category": "draft",
        "display_order": 1
      },
      {
        "status_id": "uuid",
        "status_name": "Sent for Signature",
        "status_code": "sent_for_signature",
        "category": "active",
        "display_order": 2
      },
      {
        "status_id": "uuid",
        "status_name": "Completed",
        "status_code": "completed",
        "category": "terminal",
        "display_order": 5
      }
    ]
  }
}
```

**Notes**:
- Used for UI filters and status displays
- Categories: draft, active, terminal

---

## 4. SIGNER APIs

**IMPORTANT: Document Workflow Sequence**
1. Create document draft (`POST /documents`)
2. Upload document file (`POST /documents/:document_id/upload`)
3. Add signers (`POST /documents/:document_id/signers`)
4. Optionally edit/remove signers (`PATCH` or `DELETE /documents/:document_id/signers/:signer_id`)
5. Send for signature (`POST /documents/:document_id/send`) - requires at least one signer

---

### 4.1 Add Signer to Draft Document

**Endpoint**: `POST /documents/:document_id/signers`

**Purpose**: Add external signer to a draft document

**Access**:
- **Super Admin**: Any document in scope
- **Company Admin**: Documents in their company
- **Department Admin**: Documents in their department
- **User**: Documents they own
- **Viewer**: Cannot add signers
- **Auditor**: Cannot add signers

**Request**:
```json
{
  "signer_name": "Jane Client",
  "signer_email": "jane@client.com",
  "signer_role_or_label": "CEO",
  "signing_order": 1,
  "notes": "Primary signer"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "signer_id": "uuid",
    "document_id": "uuid",
    "signer_name": "Jane Client",
    "signer_email": "jane@client.com",
    "signer_role_or_label": "CEO",
    "signing_order": 1,
    "notes": "Primary signer",
    "signer_status": "Pending",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Notes**:
- **ONLY allowed when document status is 'draft'**
- `signer_name` is required
- `signer_email` is required and must be valid email format
- `signer_role_or_label` is optional (e.g., "CEO", "CFO", "Authorized Signatory")
- `signing_order` is nullable for MVP (reserved for future sequential signing)
- `notes` is optional internal note about the signer
- Signer must be external (NOT an internal platform user from dems_users)
- Email validation performed but no uniqueness check within document
- Creates audit log event: `signer_added`
- Returns error if document is not in draft status

---

### 4.2 List Signers for Document

**Endpoint**: `GET /documents/:document_id/signers`

**Purpose**: Retrieve all signers linked to a document

**Access**: Users with document view access (based on RLS)

**Query Parameters**:
- `signer_status` (optional): Pending | Viewed | Signed | Rejected

**Response**:
```json
{
  "success": true,
  "data": {
    "document_id": "uuid",
    "signers": [
      {
        "signer_id": "uuid",
        "signer_name": "Jane Client",
        "signer_email": "jane@client.com",
        "signer_role_or_label": "CEO",
        "signing_order": 1,
        "notes": "Primary signer",
        "signer_status": "Signed",
        "viewed_at": "2024-01-01T10:00:00Z",
        "signed_at": "2024-01-01T11:00:00Z",
        "created_at": "2024-01-01T08:00:00Z"
      },
      {
        "signer_id": "uuid",
        "signer_name": "Bob Approver",
        "signer_email": "bob@client.com",
        "signer_role_or_label": "CFO",
        "signing_order": 2,
        "notes": null,
        "signer_status": "Viewed",
        "viewed_at": "2024-01-01T12:00:00Z",
        "signed_at": null,
        "created_at": "2024-01-01T08:00:00Z"
      }
    ],
    "total_signers": 2,
    "signed_count": 1,
    "viewed_count": 2,
    "pending_count": 0
  }
}
```

**Notes**:
- Ordered by `signing_order` if set, otherwise by `created_at`
- Shows current status of each signer
- Includes timestamp fields for lifecycle tracking
- RLS enforces document access control

---

### 4.3 Update Signer Before Send

**Endpoint**: `PATCH /documents/:document_id/signers/:signer_id`

**Purpose**: Edit signer details before document is sent

**Access**: Document owner or admins in scope

**Request**:
```json
{
  "signer_name": "Jane M. Client",
  "signer_role_or_label": "Chief Executive Officer",
  "signing_order": 2,
  "notes": "Updated to correct title"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "signer_id": "uuid",
    "document_id": "uuid",
    "signer_name": "Jane M. Client",
    "signer_email": "jane@client.com",
    "signer_role_or_label": "Chief Executive Officer",
    "signing_order": 2,
    "notes": "Updated to correct title",
    "signer_status": "Pending",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Notes**:
- **ONLY allowed when document status is 'draft'**
- Cannot update signer after document is sent
- Cannot change `signer_email` (must delete and re-add if email is wrong)
- All fields are optional (only provided fields are updated)
- Creates audit log event: `signer_updated`
- Returns error if document is not in draft status

---

### 4.4 Remove Signer Before Send

**Endpoint**: `DELETE /documents/:document_id/signers/:signer_id`

**Purpose**: Remove signer from a draft document

**Access**: Document owner or admins in scope

**Response**:
```json
{
  "success": true,
  "message": "Signer removed successfully",
  "data": {
    "signer_id": "uuid",
    "document_id": "uuid",
    "removed_at": "2024-01-01T00:00:00Z"
  }
}
```

**Notes**:
- **ONLY allowed when document status is 'draft'**
- Cannot remove signers after document is sent
- Permanently deletes signer record from dems_signers table
- Creates audit log event: `signer_removed`
- Returns error if document is not in draft status

---

### 4.5 Get Signer Access by Secure Token

**Endpoint**: `GET /signer/access/:access_token`

**Purpose**: Retrieve document details for external signer using secure token

**Access**: Public (token-based authentication)

**Response**:
```json
{
  "success": true,
  "data": {
    "signer": {
      "signer_id": "uuid",
      "signer_name": "Jane Client",
      "signer_email": "jane@client.com",
      "signer_role_or_label": "CEO",
      "signing_order": 1,
      "signer_status": "Pending"
    },
    "document": {
      "document_id": "uuid",
      "document_number": "DOC-2024-00123",
      "title": "Service Agreement 2024",
      "description": "Annual service agreement",
      "file_url": "https://storage.url/path/to/file.pdf",
      "company_name": "Acme Corp",
      "sent_at": "2024-01-01T00:00:00Z",
      "expired_at": "2024-01-31T00:00:00Z"
    },
    "all_signers": [
      {
        "signer_name": "Jane Client",
        "signing_order": 1,
        "signer_status": "Pending"
      },
      {
        "signer_name": "Bob Approver",
        "signing_order": 2,
        "signer_status": "Pending"
      }
    ],
    "can_sign": true,
    "can_reject": true
  }
}
```

**Notes**:
- Token must be valid and not expired
- Returns ONLY information for this specific document
- No access to other system data
- can_sign is false if document is already signed/rejected/cancelled/expired

---

### 4.6 Mark Signer Viewed

**Endpoint**: `POST /signer/view/:access_token`

**Purpose**: Record when signer opens/views document

**Access**: Valid access token

**Request**: No body required

**Response**:
```json
{
  "success": true,
  "data": {
    "signer_id": "uuid",
    "signer_status": "Viewed",
    "viewed_at": "2024-01-01T10:00:00Z"
  }
}
```

**Notes**:
- Automatically called when signer opens document
- Updates document status to 'viewed' if first view
- Creates audit log entry
- Idempotent (safe to call multiple times)

---

### 4.7 Sign Document

**Endpoint**: `POST /signer/sign/:access_token`

**Purpose**: External signer signs the document

**Access**: Valid access token

**Request**:
```json
{
  "signature_data": "base64_signature_image",
  "ip_address": "192.168.1.1",
  "device_info": "Mozilla/5.0..."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "signer_id": "uuid",
    "signer_status": "Signed",
    "signed_at": "2024-01-01T11:00:00Z",
    "document_status": "signed_partial",
    "all_signed": false
  }
}
```

**Notes**:
- Token must be valid and not expired
- Document must not be in terminal status
- If all signers signed, document status becomes 'completed'
- Creates audit log entry with IP and device info
- Signature data stored securely

---

### 4.8 Reject Document

**Endpoint**: `POST /signer/reject/:access_token`

**Purpose**: External signer rejects the document

**Access**: Valid access token

**Request**:
```json
{
  "rejection_reason": "Terms not acceptable",
  "ip_address": "192.168.1.1",
  "device_info": "Mozilla/5.0..."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "signer_id": "uuid",
    "signer_status": "Rejected",
    "rejected_at": "2024-01-01T11:00:00Z",
    "document_status": "rejected"
  }
}
```

**Notes**:
- Token must be valid and not expired
- Document status immediately becomes 'rejected'
- Notifies document owner
- Creates audit log entry
- Other signers cannot sign after rejection

---

### 4.9 Resend Reminder

**Endpoint**: `POST /documents/:document_id/signers/:signer_id/remind`

**Purpose**: Resend signature request email to pending signer

**Access**: Document owner or admins in scope

**Request**:
```json
{
  "message": "Friendly reminder to sign the document"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "signer_id": "uuid",
    "signer_email": "jane@client.com",
    "reminder_sent_at": "2024-01-01T00:00:00Z"
  }
}
```

**Notes**:
- Only allowed for pending/viewed signers
- Cannot remind already signed/rejected signers
- Creates audit log entry
- Rate limited (max 1 reminder per 24 hours per signer)

---

## 5. AUDIT APIs

### 5.1 Get Audit Trail for Document

**Endpoint**: `GET /documents/:document_id/audit-trail`

**Purpose**: Retrieve complete audit trail for a document

**Access**: Users with document view access + Auditor role

**Query Parameters**:
- `action_type` (optional): Filter by action type
- `performed_by_type` (optional): User | Signer | System
- `from_date` (optional): Filter from date
- `to_date` (optional): Filter to date

**Response**:
```json
{
  "success": true,
  "data": {
    "document": {
      "document_id": "uuid",
      "document_number": "DOC-2024-00123",
      "title": "Service Agreement 2024"
    },
    "audit_logs": [
      {
        "audit_log_id": "uuid",
        "action_type": "document_created",
        "from_status": null,
        "to_status": {
          "status_name": "Draft",
          "status_code": "draft"
        },
        "performed_by_type": "User",
        "performed_by": {
          "user_id": "uuid",
          "full_name": "John Doe",
          "email": "john@example.com"
        },
        "timestamp": "2024-01-01T08:00:00Z",
        "ip_address": "192.168.1.1",
        "device_info": "Mozilla/5.0...",
        "notes": "Document created"
      },
      {
        "audit_log_id": "uuid",
        "action_type": "document_sent",
        "from_status": {
          "status_name": "Draft",
          "status_code": "draft"
        },
        "to_status": {
          "status_name": "Sent for Signature",
          "status_code": "sent_for_signature"
        },
        "performed_by_type": "User",
        "performed_by": {
          "user_id": "uuid",
          "full_name": "John Doe",
          "email": "john@example.com"
        },
        "timestamp": "2024-01-01T09:00:00Z"
      },
      {
        "audit_log_id": "uuid",
        "action_type": "document_viewed",
        "performed_by_type": "Signer",
        "performed_by_email": "jane@client.com",
        "signer": {
          "signer_id": "uuid",
          "signer_name": "Jane Client",
          "signer_email": "jane@client.com"
        },
        "timestamp": "2024-01-01T10:00:00Z",
        "ip_address": "203.0.113.1"
      },
      {
        "audit_log_id": "uuid",
        "action_type": "document_signed",
        "performed_by_type": "Signer",
        "performed_by_email": "jane@client.com",
        "signer": {
          "signer_id": "uuid",
          "signer_name": "Jane Client",
          "signer_email": "jane@client.com"
        },
        "timestamp": "2024-01-01T11:00:00Z",
        "ip_address": "203.0.113.1",
        "notes": "Signature completed"
      }
    ],
    "total_events": 12
  }
}
```

**Notes**:
- Chronological order (oldest first)
- Includes all lifecycle events
- Shows performer details (internal user or external signer)
- Immutable records
- Used for compliance and evidence

---

### 5.2 List Audit Logs by Filters

**Endpoint**: `GET /audit-logs`

**Purpose**: Retrieve audit logs across multiple documents

**Access**: Auditor role + document access scope

**Query Parameters**:
- `company_id` (optional): Filter by company
- `department_id` (optional): Filter by department
- `document_id` (optional): Filter by document
- `action_type` (optional): Filter by action
- `performed_by_type` (optional): User | Signer | System
- `performed_by_user_id` (optional): Filter by internal user
- `from_date` (required): Start date
- `to_date` (required): End date
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response**:
```json
{
  "success": true,
  "data": {
    "audit_logs": [
      {
        "audit_log_id": "uuid",
        "document": {
          "document_id": "uuid",
          "document_number": "DOC-2024-00123",
          "title": "Service Agreement 2024"
        },
        "action_type": "document_sent",
        "from_status": {
          "status_name": "Draft"
        },
        "to_status": {
          "status_name": "Sent for Signature"
        },
        "performed_by_type": "User",
        "performed_by": {
          "user_id": "uuid",
          "full_name": "John Doe"
        },
        "timestamp": "2024-01-01T09:00:00Z",
        "ip_address": "192.168.1.1"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 523,
      "total_pages": 11
    }
  }
}
```

**Notes**:
- Requires Auditor role or admin privileges
- RLS filters based on user's audit scope
- Date range required (max 90 days)
- Used for compliance reporting

---

### 5.3 Download Audit Report

**Endpoint**: `GET /audit-logs/export`

**Purpose**: Export audit logs to CSV/PDF for compliance

**Access**: Auditor role or Company/Super Admin

**Query Parameters**:
- `company_id` (optional): Filter by company
- `department_id` (optional): Filter by department
- `from_date` (required): Start date
- `to_date` (required): End date
- `format` (optional): csv | pdf (default: csv)

**Response**: Binary file (CSV or PDF)
```
Content-Type: text/csv or application/pdf
Content-Disposition: attachment; filename="audit_report_2024-01-01_2024-01-31.csv"
```

**Notes**:
- Includes all audit log fields
- CSV for data analysis
- PDF for official records
- Includes company/department name in filename
- Creates audit log entry for export action

---

## 6. DASHBOARD APIs

### 6.1 Get Dashboard Summary Counts

**Endpoint**: `GET /dashboard/summary`

**Purpose**: Retrieve document count statistics for dashboard

**Access**: All authenticated users (filtered by scope)

**Query Parameters**:
- `company_id` (optional): Filter by company
- `department_id` (optional): Filter by department
- `date_range` (optional): today | week | month | year | all (default: all)

**Response**:
```json
{
  "success": true,
  "data": {
    "total_documents": 245,
    "by_status": {
      "draft": 12,
      "sent_for_signature": 35,
      "viewed": 18,
      "signed_partial": 22,
      "completed": 145,
      "rejected": 8,
      "cancelled": 3,
      "expired": 2
    },
    "my_documents": {
      "total": 42,
      "pending_action": 8,
      "drafts": 3,
      "completed": 31
    },
    "recent_activity_count": 15
  }
}
```

**Notes**:
- RLS automatically filters based on user scope
- my_documents only includes documents owned by user
- pending_action includes documents awaiting user's action

---

### 6.2 Get Recent Activity

**Endpoint**: `GET /dashboard/recent-activity`

**Purpose**: Retrieve recent document activities for dashboard

**Access**: All authenticated users (filtered by scope)

**Query Parameters**:
- `limit` (optional): Number of items (default: 10, max: 50)
- `company_id` (optional): Filter by company
- `department_id` (optional): Filter by department

**Response**:
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "activity_id": "uuid",
        "activity_type": "document_signed",
        "document": {
          "document_id": "uuid",
          "document_number": "DOC-2024-00123",
          "title": "Service Agreement 2024"
        },
        "performer": {
          "type": "Signer",
          "name": "Jane Client",
          "email": "jane@client.com"
        },
        "timestamp": "2024-01-01T11:00:00Z",
        "description": "Jane Client signed the document"
      },
      {
        "activity_id": "uuid",
        "activity_type": "document_sent",
        "document": {
          "document_id": "uuid",
          "document_number": "DOC-2024-00124",
          "title": "NDA Agreement"
        },
        "performer": {
          "type": "User",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "timestamp": "2024-01-01T10:30:00Z",
        "description": "John Doe sent document for signature"
      }
    ]
  }
}
```

**Notes**:
- Sorted by timestamp (most recent first)
- Includes only documents user can access
- Shows activity from both internal users and external signers

---

### 6.3 Get Document Status Summary

**Endpoint**: `GET /dashboard/status-summary`

**Purpose**: Retrieve detailed status breakdown with trends

**Access**: All authenticated users (filtered by scope)

**Query Parameters**:
- `company_id` (optional): Filter by company
- `department_id` (optional): Filter by department
- `period` (optional): week | month | quarter | year (default: month)

**Response**:
```json
{
  "success": true,
  "data": {
    "current_period": {
      "start_date": "2024-01-01",
      "end_date": "2024-01-31",
      "sent": 45,
      "completed": 38,
      "rejected": 2,
      "cancelled": 1,
      "pending": 4
    },
    "previous_period": {
      "start_date": "2023-12-01",
      "end_date": "2023-12-31",
      "sent": 52,
      "completed": 45,
      "rejected": 3,
      "cancelled": 2,
      "pending": 2
    },
    "trend": {
      "sent": -13.5,
      "completed": -15.6,
      "rejection_rate": -33.3
    },
    "average_completion_time_days": 3.2
  }
}
```

**Notes**:
- Compares current period to previous
- Trend percentages (negative = decrease)
- Average completion time calculated from sent_at to completed_at

---

## 7. ACCESS CONTROL REQUIREMENTS

### 7.1 Super Admin
- **Access**: ALL endpoints, ALL companies, ALL departments
- **Scope**: Global, unrestricted
- **Special Privileges**:
  - Create/update/delete companies
  - Create/update/delete users in any company
  - Access all documents across all companies
  - View all audit logs
  - Export all reports

### 7.2 Company Admin
- **Access**: ALL endpoints within their company
- **Scope**: Restricted to company_id
- **Special Privileges**:
  - Create/update departments in their company
  - Create/update users in their company
  - Access all documents in their company
  - View audit logs for company documents
  - Export company reports

### 7.3 Department Admin
- **Access**: Department-scoped endpoints
- **Scope**: Restricted to department_id
- **Special Privileges**:
  - Create/update users in their department
  - Access all documents in their department
  - View audit logs for department documents
  - Export department reports

### 7.4 User
- **Access**: Document management endpoints
- **Scope**: Own documents + department documents
- **Allowed Actions**:
  - Create/upload/send/cancel own documents
  - View documents in their department
  - Add/manage signers on own documents
  - Download accessible documents
  - View own profile

### 7.5 Viewer
- **Access**: Read-only document endpoints
- **Scope**: Department documents (read-only)
- **Allowed Actions**:
  - View documents in their department
  - Download accessible documents
  - View audit trails for accessible documents
- **Restrictions**:
  - Cannot create, update, or delete documents
  - Cannot add signers
  - Cannot send documents

### 7.6 Auditor
- **Access**: Audit and compliance endpoints
- **Scope**: Company or department based on assignment
- **Special Privileges**:
  - View all audit logs in scope
  - Export audit reports
  - View all documents in scope (read-only)
  - Access detailed compliance data
- **Restrictions**:
  - Cannot create, update, or delete documents
  - Cannot manage users

### 7.7 External Signer
- **Access**: Token-based signer endpoints ONLY
- **Scope**: Single document via access_token
- **Allowed Endpoints**:
  - `GET /signer/access/:access_token`
  - `POST /signer/view/:access_token`
  - `POST /signer/sign/:access_token`
  - `POST /signer/reject/:access_token`
- **Restrictions**:
  - NO access to any other endpoints
  - NO access to user management
  - NO access to other documents
  - NO access to audit logs
  - NO access to dashboard

---

## 8. RESPONSE DESIGN PRINCIPLES

### 8.1 Success Response

**Status Code**: `200 OK` or `201 Created`

**Format**:
```json
{
  "success": true,
  "data": {
    // Response payload
  },
  "meta": {
    // Optional metadata (pagination, etc.)
  }
}
```

### 8.2 Validation Error

**Status Code**: `400 Bad Request`

**Format**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "signing_order",
        "message": "Signing order must be greater than 0"
      }
    ]
  }
}
```

**Common Validation Codes**:
- `VALIDATION_ERROR` - Field validation failed
- `MISSING_REQUIRED_FIELD` - Required field not provided
- `INVALID_FORMAT` - Invalid data format
- `DUPLICATE_VALUE` - Unique constraint violation

### 8.3 Unauthorized

**Status Code**: `401 Unauthorized`

**Format**:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required. Please provide a valid access token."
  }
}
```

**Use Cases**:
- Missing authentication token
- Invalid authentication token
- Expired session

### 8.4 Forbidden

**Status Code**: `403 Forbidden`

**Format**:
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action",
    "details": {
      "required_role": "company_admin",
      "user_role": "user",
      "resource": "company",
      "action": "update"
    }
  }
}
```

**Common Forbidden Codes**:
- `FORBIDDEN` - Insufficient permissions
- `SCOPE_VIOLATION` - Attempting to access outside scope
- `ROLE_REQUIRED` - Specific role required
- `OWNERSHIP_REQUIRED` - Must be document owner

### 8.5 Not Found

**Status Code**: `404 Not Found`

**Format**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "details": {
      "resource_type": "document",
      "resource_id": "uuid"
    }
  }
}
```

**Use Cases**:
- Document does not exist
- User does not exist
- RLS filtered out the resource (looks like not found)

### 8.6 Invalid Signer Token

**Status Code**: `403 Forbidden`

**Format**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_SIGNER_TOKEN",
    "message": "The access token is invalid or has expired",
    "details": {
      "reason": "token_expired",
      "expired_at": "2024-01-15T00:00:00Z"
    }
  }
}
```

**Reasons**:
- `token_not_found` - Token does not exist
- `token_expired` - Token past expiration date
- `token_invalid` - Malformed token

### 8.7 Invalid Lifecycle Action

**Status Code**: `409 Conflict`

**Format**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_LIFECYCLE_ACTION",
    "message": "Cannot perform this action in current document status",
    "details": {
      "current_status": "completed",
      "attempted_action": "cancel",
      "allowed_statuses": ["draft", "sent_for_signature", "viewed", "signed_partial"]
    }
  }
}
```

**Common Lifecycle Codes**:
- `INVALID_LIFECYCLE_ACTION` - Action not allowed in current status
- `DOCUMENT_ALREADY_COMPLETED` - Cannot modify completed document
- `DOCUMENT_CANCELLED` - Cannot act on cancelled document
- `DOCUMENT_EXPIRED` - Document has expired
- `MISSING_SIGNERS` - Cannot send without signers (returns 400)
- `MISSING_FILE` - Cannot send without uploaded file (returns 400)
- `DOCUMENT_NOT_DRAFT` - Cannot modify signers when document is not in draft status (returns 409)

**Example: Missing Signers Error**:
```json
{
  "success": false,
  "error": {
    "code": "MISSING_SIGNERS",
    "message": "Cannot send document without signers",
    "details": {
      "document_id": "uuid",
      "current_status": "draft",
      "signers_count": 0,
      "required_action": "Add at least one signer using POST /documents/:document_id/signers"
    }
  }
}
```

**Example: Document Not Draft Error (when trying to modify signers)**:
```json
{
  "success": false,
  "error": {
    "code": "DOCUMENT_NOT_DRAFT",
    "message": "Cannot modify signers after document has been sent",
    "details": {
      "current_status": "sent_for_signature",
      "allowed_status": "draft",
      "attempted_action": "add_signer"
    }
  }
}
```

### 8.8 Rate Limit Exceeded

**Status Code**: `429 Too Many Requests`

**Format**:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retry_after_seconds": 3600,
      "limit": "1 per 24 hours",
      "endpoint": "/documents/:document_id/signers/:signer_id/remind"
    }
  }
}
```

### 8.9 Server Error

**Status Code**: `500 Internal Server Error`

**Format**:
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred. Please try again later.",
    "error_id": "err_abc123xyz"
  }
}
```

**Notes**:
- Never expose sensitive error details
- Include error_id for support tracking
- Log full error server-side

---

## 9. ADDITIONAL IMPLEMENTATION NOTES

### 9.1 Authentication Flow

**Internal Users**:
1. Client calls `POST /auth/login` with email/password
2. Backend validates via Supabase Auth
3. Returns JWT access token and refresh token
4. Client includes `Authorization: Bearer {token}` in all subsequent requests
5. Backend validates token and extracts `auth.uid()`
6. RLS policies automatically enforce access control

**External Signers**:
1. System generates unique `access_token` when document is sent
2. Signer receives email with link: `/signer/access/{access_token}`
3. Client calls `GET /signer/access/:access_token`
4. Backend validates token and returns document data
5. Signer can view/sign/reject using token-based endpoints
6. No JWT or session required for signers

### 9.2 File Upload Strategy

**Documents**:
- Upload to Supabase Storage or S3-compatible storage
- Generate secure signed URLs for downloads
- Store file metadata in `dems_documents` table
- Validate: PDF only, max 50MB
- Virus scanning recommended

**Signatures**:
- Store signature images as base64 or separate files
- Link to signer record
- Include in final signed document PDF

### 9.3 Email Notifications

**Events that trigger emails**:
- Document sent for signature → All signers
- Document signed → Document owner
- Document rejected → Document owner
- Document completed → Document owner + all signers
- Reminder → Specific signer
- Document cancelled → Pending signers
- User invited → New user

**Email should include**:
- Document title and number
- Action required
- Secure link (for signers)
- Expiration date
- Company branding

### 9.4 Pagination Standard

**All list endpoints use**:
- `page`: Page number (1-indexed)
- `limit`: Items per page (default 20, max 100)

**Response includes**:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8,
    "has_next": true,
    "has_previous": false
  }
}
```

### 9.5 Security Headers

**All API responses should include**:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

### 9.6 CORS Configuration

**Allowed origins**: Configure based on frontend domain
**Allowed methods**: GET, POST, PATCH, DELETE, OPTIONS
**Allowed headers**: Authorization, Content-Type
**Credentials**: true (for cookies if used)

### 9.7 Audit Logging Requirements

**Every action must create audit log for**:
- Document lifecycle changes (created, sent, cancelled, completed, etc.)
- Signer actions (viewed, signed, rejected)
- User management (created, updated, deactivated)
- Download actions
- Failed authentication attempts (log separately)

**Audit log must capture**:
- `action_type` - What happened
- `performed_by_type` - User | Signer | System
- `performed_by_user_id` or `performed_by_email`
- `timestamp` - When it happened
- `ip_address` - Where it came from
- `device_info` - User agent
- Status transitions (from/to)

---

## 10. MVP IMPLEMENTATION CHECKLIST

### Phase 1: Core Infrastructure
- [ ] Set up Supabase project
- [ ] Apply database migrations
- [ ] Configure authentication
- [ ] Set up file storage
- [ ] Configure email service

### Phase 2: Auth & User Management
- [ ] Implement auth endpoints (login, logout, refresh)
- [ ] Implement user CRUD endpoints
- [ ] Implement role assignment
- [ ] Test RLS policies for users

### Phase 3: Document Management
- [ ] Implement document CRUD endpoints
- [ ] Implement file upload/download
- [ ] Implement document send functionality
- [ ] Implement document cancel/retract
- [ ] Test RLS policies for documents

### Phase 4: Signer Management
- [ ] Implement signer CRUD endpoints
- [ ] Generate access tokens
- [ ] Implement token-based access endpoints
- [ ] Implement sign/reject functionality
- [ ] Test external signer flow

### Phase 5: Audit & Reporting
- [ ] Implement audit trail endpoints
- [ ] Implement audit log export
- [ ] Test audit log immutability
- [ ] Verify all actions create logs

### Phase 6: Dashboard
- [ ] Implement dashboard summary endpoint
- [ ] Implement recent activity endpoint
- [ ] Implement status summary endpoint
- [ ] Test performance with large datasets

### Phase 7: Testing & Documentation
- [ ] Unit tests for all endpoints
- [ ] Integration tests for workflows
- [ ] Security testing (penetration, RLS bypass attempts)
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Postman collection for testing

---

## 11. FUTURE ENHANCEMENTS (Post-MVP)

- Bulk operations (send multiple documents)
- Document templates
- Advanced filtering and search
- Custom document fields
- Sequential vs parallel signing
- Document versioning
- E-signature biometrics
- Multi-language support
- Webhooks for integrations
- SSO authentication
- Advanced analytics and reporting
- Document comparison tools
- Mobile SDK

---

**Document Version**: 1.0
**Last Updated**: 2024-01-01
**Status**: MVP Ready
