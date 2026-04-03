# Document Signing Portal – Product Requirements

This document desscribes the functional requirements for Lunar Sign, an internal document e-signing system used by my company - Lunar Rails.


## 2. Goals

Delevop the Basic Workflow Summary
System workflow should be:
1.  1   User logs in
2.  2   Upload document
3.  3   Add signers
4.  4   Send document
5.  5   Signers receive email
6.  6   Sign document
7.  7   Final signed PDF generated
8.  8   Stored in Supabase Storage
9.  9   Sent to all parties

## 3. Non-goals (MVP)


Optional Future Features (Phase 2) To be Added later, not now:

Company branding
Templates
Bulk send
Approval workflow before signing
Multi-company accounts
API integration
WhatsApp notifications
Payment per document
KYC / OTP signing
Reminder emails for unsigned documents
Google Drive storage integration
Signing link expiration
Manager role (intermediate permissions between admin and member)
Document retraction / cancellation
Sequential signing workflows


## 4. Target users
Document Owner (User)- this is the authenticated user. He wants to get documents signed
Signing Parties - they want to sign documents sent to them


#MVP

1. User Authentication & Access
Objective: Only authorized users can access the portal.
Requirements:
*   •   Google login (OAuth)
*   •   Role-based access:
    *   ◦   Admin
    *   ◦   Member
*   •   Each user can only see their own documents
*   •   Secure session logout

2. Document Upload
Objective: Users upload documents to be signed.
Requirements:
*   •   Upload PDF documents
*   •   Enter document name
*   •   Add document description (optional)
*   •   Store original document
*   •   Generate document ID
*   •   Document status:
    *   ◦   Draft
    *   ◦   Pending
    *   ◦   Completed

3. Add Signing Parties
Objective: User can define who needs to sign.
Requirements:
*   •   Add 1 or multiple signing parties
*   •   Capture for each signer:
    *   ◦   Full Name
    *   ◦   Email Address
*   •   Each signer receives unique secure link
*   •   Signers do not need login

4. Notifications
Objective: Notify signing parties and users about signing events.
Requirements:
*   •   Email notification when document is sent
*   •   Email when document is signed
*   •   Email to all parties when signing completed

5. Signing Process
Objective: Signers sign document digitally.
Requirements:
*   •   Sign via:
    *   ◦   Draw signature
    *   ◦   Type signature
    *   ◦   Upload signature
*   •   Capture:
    *   ◦   Full Name
    *   ◦   Signature
    *   ◦   Signature Date (auto timestamp)
    *   ◦   IP Address (optional)
*   •   Lock document after signing
*   •   Maintain audit trail:
    *   ◦   Sent date
    *   ◦   Viewed date
    *   ◦   Signed date

6. Completed Document Access
Objective: Signed document accessible to all parties.
Requirements:
*   •   Generate final signed PDF
*   •   Email signed copy to all signing parties
*   •   User can download signed document
*   •   Maintain version history
*   •   Store signed document permanently

7. Dashboard
Objective: User can manage documents.
Dashboard should show:
*   •   Draft Documents
*   •   Sent Documents
*   •   Pending Signatures
*   •   Completed Documents
*   •   Cancelled Documents
*   •   Search documents
*   •   Filter by date / status

8. Audit Trail (Important for Compliance)
Each document must store:
*   •   Uploaded by
*   •   Upload date
*   •   Sent date
*   •   Signer email
*   •   Viewed timestamp
*   •   Signed timestamp
*   •   IP address (optional)
*   •   Document hash

#POST-MVP


*These requirements will be implemented after the MVP has been developed and validated. Leaving them here for context*

9. Retract / Cancel Document
Objective: User can retract incorrectly sent documents.
Requirements:
*   •   Retract allowed only before all parties sign
*   •   Retracted document status = Cancelled
*   •   Notify all signers document is cancelled
*   •   Prevent further signing


10. Google Drive Storage Integration
Objective: Store signed documents automatically.
Requirements:
*   •   Connect user Google account
*   •   Store signed documents in Google Drive
*   •   Folder structure:
    *   ◦   Document Signing Portal
    *   ◦   Completed Documents
    *   ◦   Draft Documents
*   •   Save:
    *   ◦   Original document
    *   ◦   Signed document
    *   ◦   Audit log





