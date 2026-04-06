import { describe, expect, it } from 'vitest'
import {
  allPartiesSignedEmail,
  documentCompleteSignerEmail,
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
    expect(html).toContain('Pat')
    expect(html).toContain('https://app/sign/abc')
    expect(html).toContain('Lease')
    expect(html).toContain('Sign Document')
  })

  it('renders a valid HTML document with table layout', () => {
    const { html } = signatureRequestEmail({
      signerName: 'Sam',
      documentTitle: 'Lease',
      requesterName: 'Pat',
      signingUrl: 'https://app/sign/abc',
    })
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<table')
    expect(html).toContain('Lunar Sign')
    expect(html).toContain('role="presentation"')
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
    expect(html).toContain('View Document')
  })
})

describe('allPartiesSignedEmail', () => {
  it('includes download URL and document title', () => {
    const { subject, html } = allPartiesSignedEmail({
      recipientName: 'R',
      documentTitle: 'T',
      downloadUrl: 'https://dl/1',
    })
    expect(subject).toContain('T')
    expect(html).toContain('https://dl/1')
    expect(html).toContain('Download Signed Document')
    expect(html).toContain('Complete')
  })
})

describe('documentCompleteSignerEmail', () => {
  it('includes signer name and document title', () => {
    const { subject, html } = documentCompleteSignerEmail({
      signerName: 'Alice',
      documentTitle: 'Contract',
    })
    expect(subject).toContain('Contract')
    expect(subject).toContain('Fully Signed')
    expect(html).toContain('Alice')
    expect(html).toContain('Contract')
    expect(html).toContain('Thank you for signing')
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
    expect(admin.html).toContain('Workspace role:')
    expect(admin.html).toContain('Admin')
    expect(admin.html).toContain('https://login')
    expect(admin.html).toContain('Join Workspace')
  })
  it('maps member role label', () => {
    const m = userInvitationEmail({
      inviteeEmail: 'x@y.com',
      inviterName: 'A',
      role: 'member',
      loginUrl: 'https://l',
    })
    expect(m.html).toContain('Member')
  })
})
