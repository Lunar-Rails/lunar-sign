# Complyverse DEMS - End-to-End Sequence Flows

This document defines the step-by-step system behavior for all key workflows in the Complyverse DEMS MVP.

---

## Flow 1: Document Creation & Send Flow (Internal User)

### Prerequisites
- User is authenticated
- User has role: Admin, Manager, or Employee
- User has permission to upload documents (based on role + company/department)

### Sequence

| Step | Actor | Action | System Response | Status Change | Audit Event |
|------|-------|--------|-----------------|---------------|-------------|
| 1 | User | Navigates to Upload Document page | Display upload form | - | - |
| 2 | User | Fills metadata (title, type, description) and uploads file | Validate form inputs | - | - |
| 3 | User | Clicks "Upload" | Create document record in database | `status = 'Draft'` | `document_created` |
| 4 | System | - | Generate unique `document_id` and `document_number` | - | - |
| 5 | System | - | Set `owner_user_id = current_user.id` | - | - |
| 6 | System | - | Set `company_id` and `department_id` from user context | - | - |
| 7 | System | - | Store file reference in `file_name` and `file_url` | - | - |
| 8 | System | - | Set `created_at = now()` | - | - |
| 9 | System | - | Redirect to Document Detail page (Draft) | - | - |
| 10 | User | Clicks "Add Signer" | Display Add Signer modal | - | - |
| 11 | User | Fills signer details (name, email, role, order) | Validate inputs | - | - |
| 12 | User | Clicks "Add Signer" (submit) | Create signer record | `signer_status = 'Pending'` | `signer_added` |
| 13 | System | - | Link signer to document via `document_id` | - | - |
| 14 | System | - | Increment `total_signers` on document | - | - |
| 15 | User | (Optional) Repeats steps 10-14 for additional signers | - | - | `signer_added` (each) |
| 16 | User | Clicks "Send for Signature" | Validate send requirements | - | - |
| 17 | System | - | Check: document has `file_name` | - | - |
| 18 | System | - | Check: at least one signer exists | - | - |
| 19 | System | - | If validation fails, show error and stop | - | - |
| 20 | System | - | If validation passes, update document | `status = 'Sent for Signature'` | `document_sent` |
| 21 | System | - | Set `sent_at = now()` | - | - |
| 22 | System | - | For each signer, generate unique access token | - | - |
| 23 | System | - | Store tokens in `signer_access_tokens` table | - | - |
| 24 | System | - | Send notification email to each signer (simulated in MVP) | - | - |
| 25 | System | - | Email contains unique access link with token | - | - |
| 26 | System | - | Display success message to user | - | - |
| 27 | System | - | Redirect to Document List or stay on detail page | - | - |

### Business Rules
- Draft documents can only be sent if `file_name` exists and `total_signers > 0`
- Once sent, document cannot return to Draft status
- Only document owner, company admin, or system admin can send
- Access tokens must be cryptographically secure (UUID or JWT)
- Each token is single-use per signer

---

## Flow 2: Signer Access & Sign Flow (External)

### Prerequisites
- Document status is `Sent for Signature`, `Viewed`, or `Signed (Partial)`
- Signer has valid access token
- Signer status is `Pending` or `Viewed`

### Sequence

| Step | Actor | Action | System Response | Status Change | Audit Event |
|------|-------|--------|-----------------|---------------|-------------|
| 1 | Signer | Receives email with access link | - | - | - |
| 2 | Signer | Clicks link (format: `/signer/view?token=xxx`) | Load signer view page | - | - |
| 3 | System | - | Validate token exists and is active | - | - |
| 4 | System | - | If token invalid/expired, show error page | - | - |
| 5 | System | - | If valid, retrieve signer and document records | - | - |
| 6 | System | - | Check document status is not terminal | - | - |
| 7 | System | - | Display document preview with signer info | - | - |
| 8 | System | - | Record view timestamp if first view | `signer_status = 'Viewed'` (if was Pending) | `document_viewed` |
| 9 | System | - | Set `viewed_at = now()` on signer | - | - |
| 10 | System | - | If document was `Sent for Signature` and first view | `document.status = 'Viewed'` | - |
| 11 | Signer | Reviews document content | - | - | - |
| 12 | Signer | Clicks "Sign Document" button | Display signature confirmation | - | - |
| 13 | System | - | Show confirmation dialog | - | - |
| 14 | Signer | Confirms signature | Process signature action | - | - |
| 15 | System | - | Update signer record | `signer_status = 'Signed'` | `document_signed` |
| 16 | System | - | Set `signed_at = now()` on signer | - | - |
| 17 | System | - | Increment `signed_signers_count` on document | - | - |
| 18 | System | - | Check if all signers have signed | - | - |
| 19 | System | - | If `signed_signers_count < total_signers` | `document.status = 'Signed (Partial)'` | - |
| 20 | System | - | If `signed_signers_count == total_signers` | `document.status = 'Completed'` | `document_completed` |
| 21 | System | - | Set `completed_at = now()` (if completed) | - | - |
| 22 | System | - | Invalidate signer's access token | - | - |
| 23 | System | - | Display success message to signer | - | - |
| 24 | System | - | (Optional) Send confirmation email to signer | - | - |
| 25 | System | - | (Optional) Notify document owner of signature | - | - |

### Business Rules
- Signer can only sign once
- Each signature increments `signed_signers_count` atomically
- Status progression: `Sent for Signature` → `Viewed` → `Signed (Partial)` → `Completed`
- Once signed, signer cannot un-sign
- Token becomes invalid after successful signature
- If signing_order is enforced, only current signer in sequence can sign

---

## Flow 3: Partial to Complete Transition (System Logic)

### Prerequisites
- Document status is `Signed (Partial)`
- Multiple signers exist on document

### Sequence

| Step | Actor | Action | System Response | Status Change | Audit Event |
|------|-------|--------|-----------------|---------------|-------------|
| 1 | System | After each signature event | Query current signature counts | - | - |
| 2 | System | - | Calculate `signed_count = COUNT(signers WHERE status='Signed')` | - | - |
| 3 | System | - | Compare `signed_count` vs `total_signers` | - | - |
| 4 | System | - | If `signed_count < total_signers`, no action | Remains `Signed (Partial)` | - |
| 5 | System | - | If `signed_count == total_signers`, trigger completion | `status = 'Completed'` | `document_completed` |
| 6 | System | - | Set `completed_at = now()` | - | - |
| 7 | System | - | Invalidate all remaining access tokens (if any) | - | - |
| 8 | System | - | (Optional) Notify document owner | - | - |
| 9 | System | - | (Optional) Notify all signers of completion | - | - |

### Business Rules
- Completion check happens synchronously after each signature
- All signers must have `signer_status = 'Signed'` for completion
- Rejected or expired signers block completion
- Completion is irreversible (terminal state)

---

## Flow 4: Signer Reject Flow (External)

### Prerequisites
- Document status is not terminal
- Signer has valid access token
- Signer status is `Pending` or `Viewed`

### Sequence

| Step | Actor | Action | System Response | Status Change | Audit Event |
|------|-------|--------|-----------------|---------------|-------------|
| 1 | Signer | Opens document via access link | Display document with actions | - | - |
| 2 | Signer | Clicks "Reject Document" button | Display rejection confirmation | - | - |
| 3 | System | - | Show confirmation dialog with reason field | - | - |
| 4 | Signer | Enters rejection reason (optional) | - | - | - |
| 5 | Signer | Confirms rejection | Process rejection action | - | - |
| 6 | System | - | Update signer record | `signer_status = 'Rejected'` | `document_rejected` |
| 7 | System | - | Set `rejected_at = now()` on signer | - | - |
| 8 | System | - | Store rejection reason in signer notes | - | - |
| 9 | System | - | Update document record | `document.status = 'Rejected'` | - |
| 10 | System | - | Invalidate all signer access tokens | - | - |
| 11 | System | - | Display rejection confirmation to signer | - | - |
| 12 | System | - | Notify document owner of rejection | - | - |
| 13 | System | - | Block all future signing actions | - | - |

### Business Rules
- Single rejection terminates entire document workflow
- Rejected is a terminal state
- No signers can sign after rejection
- Document owner must create new document to retry
- Rejection reason is stored in audit trail

---

## Flow 5: Document Cancel Flow (Internal User)

### Prerequisites
- User is document owner, company admin, or system admin
- Document status is not terminal (`Completed`, `Rejected`, `Expired`, `Cancelled`)

### Sequence

| Step | Actor | Action | System Response | Status Change | Audit Event |
|------|-------|--------|-----------------|---------------|-------------|
| 1 | User | Opens document detail page | Display document with actions | - | - |
| 2 | User | Clicks "Cancel Document" button | Display cancellation confirmation | - | - |
| 3 | System | - | Validate user has permission to cancel | - | - |
| 4 | System | - | Check document status is not terminal | - | - |
| 5 | System | - | Show confirmation dialog | - | - |
| 6 | User | Confirms cancellation | Process cancellation | - | - |
| 7 | System | - | Update document record | `status = 'Cancelled'` | `document_cancelled` |
| 8 | System | - | Set `cancelled_at = now()` | - | - |
| 9 | System | - | Set `cancelled_by_user_id = current_user.id` | - | - |
| 10 | System | - | Invalidate all signer access tokens | - | - |
| 11 | System | - | (Optional) Notify all pending signers | - | - |
| 12 | System | - | Display cancellation confirmation | - | - |
| 13 | System | - | Block all future actions on document | - | - |

### Business Rules
- Only authorized users can cancel
- Cancellation is permanent (terminal state)
- Cannot cancel completed documents
- All pending signatures are voided
- Cancelled documents remain in system for audit purposes

---

## Flow 6: Document Expiry Flow (System)

### Prerequisites
- Document has `expiry_date` set
- System scheduler runs periodic checks (e.g., hourly)

### Sequence

| Step | Actor | Action | System Response | Status Change | Audit Event |
|------|-------|--------|-----------------|---------------|-------------|
| 1 | System | Cron job executes | Query documents with pending status | - | - |
| 2 | System | - | Filter documents where `expiry_date < now()` | - | - |
| 3 | System | - | Filter where status NOT IN (`Completed`, `Cancelled`, `Rejected`, `Expired`) | - | - |
| 4 | System | - | For each expired document | - | - |
| 5 | System | - | Update document record | `status = 'Expired'` | `document_expired` |
| 6 | System | - | Set `expired_at = now()` | - | - |
| 7 | System | - | Invalidate all signer access tokens | - | - |
| 8 | System | - | (Optional) Notify document owner | - | - |
| 9 | System | - | (Optional) Notify pending signers | - | - |
| 10 | System | - | Log expiry event in audit trail | - | - |

### Business Rules
- Expiry only applies to active documents
- Expired documents cannot be signed
- Expiry is automatic (no user action required)
- Expired is a terminal state
- Owner can set expiry_date at upload or leave null (no expiry)

---

## Flow 7: Draft Signer Management (Internal User)

### Prerequisites
- Document status is `Draft`
- User is document owner or has edit permission

### Add Signer Sequence

| Step | Actor | Action | System Response | Status Change | Audit Event |
|------|-------|--------|-----------------|---------------|-------------|
| 1 | User | On Draft document detail page, clicks "Add Signer" | Display Add Signer modal | - | - |
| 2 | User | Fills signer details (name, email, role, order) | Validate inputs | - | - |
| 3 | User | Clicks "Add Signer" (submit) | Create signer record | `signer_status = 'Pending'` | `signer_added` |
| 4 | System | - | Link signer to document via `document_id` | - | - |
| 5 | System | - | Increment `total_signers` on document | - | - |
| 6 | System | - | Close modal and refresh signers list | - | - |
| 7 | System | - | Enable "Send for Signature" if first signer | - | - |

### Edit Signer Sequence

| Step | Actor | Action | System Response | Status Change | Audit Event |
|------|-------|--------|-----------------|---------------|-------------|
| 1 | User | Clicks "Edit" icon on signer row | Open Add Signer modal in edit mode | - | - |
| 2 | System | - | Pre-fill form with existing signer data | - | - |
| 3 | User | Modifies signer details (name, email, role, order) | Validate inputs | - | - |
| 4 | User | Clicks "Update Signer" | Update signer record | - | `signer_updated` |
| 5 | System | - | Set `updated_at = now()` on signer | - | - |
| 6 | System | - | Close modal and refresh signers list | - | - |

### Remove Signer Sequence

| Step | Actor | Action | System Response | Status Change | Audit Event |
|------|-------|--------|-----------------|---------------|-------------|
| 1 | User | Clicks "Remove" icon on signer row | Display confirmation dialog | - | - |
| 2 | System | - | Show "Remove Signer" confirmation with signer name | - | - |
| 3 | User | Confirms removal | Delete signer record | - | `signer_removed` |
| 4 | System | - | Remove signer from database | - | - |
| 5 | System | - | Decrement `total_signers` on document | - | - |
| 6 | System | - | Close dialog and refresh signers list | - | - |
| 7 | System | - | If no signers remain, disable "Send for Signature" | - | - |

### Business Rules
- Add/Edit/Remove only available in Draft status
- Once document is sent, signer list is read-only
- Removing all signers disables send action
- Email uniqueness not enforced (same person can be added multiple times)
- Signing order is optional (null = parallel signing)

---

## Flow 8: Send Reminder Flow (Internal User)

### Prerequisites
- Document status is `Sent for Signature`, `Viewed`, or `Signed (Partial)`
- User has permission to send reminders
- At least one signer has status `Pending` or `Viewed`

### Sequence

| Step | Actor | Action | System Response | Status Change | Audit Event |
|------|-------|--------|-----------------|---------------|-------------|
| 1 | User | On document detail page, clicks "Send Reminder" | Display reminder options | - | - |
| 2 | System | - | Show list of signers with status `Pending` or `Viewed` | - | - |
| 3 | User | (Optional) Selects specific signers or "All pending" | - | - | - |
| 4 | User | Clicks "Send" | Process reminder action | - | - |
| 5 | System | - | For each selected signer, send reminder email | - | `reminder_sent` (per signer) |
| 6 | System | - | Email contains access link with existing token | - | - |
| 7 | System | - | Record reminder timestamp in signer record | - | - |
| 8 | System | - | Display success message | - | - |

### Business Rules
- Reminders only sent to non-signed signers
- Cannot remind signed, rejected, or cancelled signers
- Reminder uses same access token (not regenerated)
- Rate limiting: max 1 reminder per signer per 24 hours (optional)
- Document owner and admins can send reminders

---

## Flow 9: Audit Trail View (Internal User)

### Prerequisites
- User is authenticated
- User has permission to view audit trail

### Sequence

| Step | Actor | Action | System Response | Status Change | Audit Event |
|------|-------|--------|-----------------|---------------|-------------|
| 1 | User | Navigates to Audit Trail page or clicks "View Audit Trail" | Load audit events query | - | - |
| 2 | System | - | Query audit events based on user permissions | - | - |
| 3 | System | - | If user is Admin, show all events | - | - |
| 4 | System | - | If user is Manager/Employee, filter by company/department | - | - |
| 5 | System | - | Display events in reverse chronological order | - | - |
| 6 | System | - | Show: timestamp, action, user/email, document, notes | - | - |
| 7 | User | (Optional) Filters by document, date range, or action type | Re-query with filters | - | - |
| 8 | System | - | Display filtered results | - | - |
| 9 | User | (Optional) Clicks on event for details | Show event detail modal | - | - |

### Business Rules
- Audit events are immutable (cannot be edited/deleted)
- All system actions generate audit events
- Events include actor (user_id or signer email)
- Timestamp precision: milliseconds
- Retention: indefinite (unless compliance requires deletion)

---

## System Rules Summary

### Terminal States
Documents in these states cannot transition to any other state:
- **Completed**: All signers signed
- **Cancelled**: Manually cancelled by authorized user
- **Rejected**: At least one signer rejected
- **Expired**: Expiry date passed without completion

### State Transition Rules

```
Draft
  ↓ (send)
Sent for Signature
  ↓ (first view)
Viewed
  ↓ (partial signatures)
Signed (Partial)
  ↓ (all signatures)
Completed [TERMINAL]

From any non-terminal state:
  → Cancelled [TERMINAL] (user action)
  → Rejected [TERMINAL] (signer action)
  → Expired [TERMINAL] (system action)
```

### Audit Event Types
- `document_created`
- `document_sent`
- `document_viewed`
- `document_signed`
- `document_completed`
- `document_cancelled`
- `document_rejected`
- `document_expired`
- `signer_added`
- `signer_updated`
- `signer_removed`
- `reminder_sent`

### Access Control by Role

**Admin (System Admin)**
- Full access to all documents across all companies
- Can upload, send, cancel, view, download all documents
- Can manage users and companies
- Can view full audit trail

**Manager (Company/Department Manager)**
- Access to documents in their company/department
- Can upload, send, cancel own documents
- Can view documents in their scope
- Can download documents in their scope
- Can view audit trail for their scope

**Employee**
- Can upload documents to their department
- Can send own documents
- Can cancel own documents
- Can view own documents
- Limited audit trail access

**Signer (External/Internal)**
- Token-based access only
- Can view assigned document
- Can sign or reject
- Cannot access system otherwise

### Token Security Rules
- Tokens are UUID v4 or cryptographically secure random strings
- Each signer gets unique token per document
- Tokens are single-use (invalidated after signature)
- Token validation checks:
  - Token exists in database
  - Token is active (not invalidated)
  - Associated document is not terminal
  - Associated signer has not signed/rejected
- Tokens expire with document (cancelled/rejected/expired)

---

## Implementation Notes

### Database Constraints
- `signed_signers_count` must always be ≤ `total_signers`
- Status transitions must follow defined flow (enforced in application layer)
- Audit events must be created atomically with state changes
- Signer actions must validate token and document state before processing

### Concurrency Handling
- Signature processing must use database transactions
- `signed_signers_count` increment must be atomic
- Status transition checks must be race-condition safe
- Use optimistic locking for document updates

### Error Handling
- Invalid token: Show "Access Denied" page
- Expired document: Show "Document Expired" message
- Already signed: Show "Already Signed" confirmation
- Terminal state: Show appropriate status message
- Permission denied: Redirect with error message

### Notification Strategy (Future)
- Email notifications for:
  - Document sent (to signers)
  - Signature confirmation (to signer)
  - Document completed (to owner and signers)
  - Document rejected (to owner)
  - Reminder (to pending signers)
- In MVP: Simulated via console logs or alerts

---

*End of Sequence Flows Document*
