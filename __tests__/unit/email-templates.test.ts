import { describe, expect, it } from 'vitest'
import {
  allPartiesSignedEmail,
  documentSignedEmail,
  signatureRequestEmail,
  userInvitationEmail,
} from '@/lib/email/templates'

describe('signatureRequestEmail', () => {
  it('includes title, signer, and signing URL in output', () => {
    const { subject, html } = signatureRequestEmail({
      signerName: 'Sam',
      documentTitle: 'Lease',
      requesterName: 'Pat',
      signingUrl: 'https://app/sign/abc',
    })
    expect(subject).toContain('Lease')
    expect(html).toContain('Sam')
    expect(html).toContain('https://app/sign/abc')
  })
})

describe('documentSignedEmail', () => {
  it('includes owner, signer, and document URL', () => {
    const { subject, html } = documentSignedEmail({
      ownerName: 'Owner',
      documentTitle: 'NDA',
      signerName: 'Signer',
      documentUrl: 'https://app/doc/1',
    })
    expect(subject).toContain('NDA')
    expect(html).toContain('Owner')
    expect(html).toContain('Signer')
    expect(html).toContain('https://app/doc/1')
  })
})

describe('allPartiesSignedEmail', () => {
  it('includes download URL', () => {
    const { subject, html } = allPartiesSignedEmail({
      recipientName: 'R',
      documentTitle: 'T',
      downloadUrl: 'https://dl/1',
    })
    expect(subject).toContain('T')
    expect(html).toContain('https://dl/1')
  })
})

describe('userInvitationEmail', () => {
  it('maps admin role label and includes login URL', () => {
    const admin = userInvitationEmail({
      inviteeEmail: 'x@y.com',
      inviterName: 'Admin',
      role: 'admin',
      loginUrl: 'https://login',
    })
    expect(admin.html).toContain('Admin')
    expect(admin.html).toContain('Workspace role:</strong> Admin')
    expect(admin.html).toContain('https://login')
  })
  it('maps member role label', () => {
    const m = userInvitationEmail({
      inviteeEmail: 'x@y.com',
      inviterName: 'A',
      role: 'member',
      loginUrl: 'https://l',
    })
    expect(m.html).toContain('Workspace role:</strong> Member')
  })
})
