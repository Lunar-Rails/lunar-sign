import { describe, expect, it } from 'vitest'
import {
  allPartiesSignedEmail,
  documentCompleteSignerEmail,
  documentSignedEmail,
  documentCompletedOwnerEmail,
  documentCompletedSignerEmail,
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

  it('uses table-based layout', () => {
    const { html } = signatureRequestEmail({
      signerName: 'Sam',
      documentTitle: 'Lease',
      requesterName: 'Pat',
      signingUrl: 'https://app/sign/abc',
    })
    expect(html).toContain('role="presentation"')
    expect(html).toContain('Lunar Sign')
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
  it('includes signer name, document title, and download URL', () => {
    const { subject, html } = documentCompleteSignerEmail({
      signerName: 'Alice',
      documentTitle: 'Contract',
      downloadUrl: 'https://app/api/download/tok-1',
    })
    expect(subject).toContain('Contract')
    expect(subject).toContain('Fully Signed')
    expect(html).toContain('Alice')
    expect(html).toContain('Contract')
    expect(html).toContain('Thank you for your signature')
    expect(html).toContain('https://app/api/download/tok-1')
    expect(html).toContain('Download Signed Document')
  })
})

describe('documentCompletedOwnerEmail', () => {
  it('includes owner name, title, and download URL', () => {
    const { subject, html } = documentCompletedOwnerEmail({
      ownerName: 'Alice',
      documentTitle: 'Contract',
      downloadUrl: 'https://dl/2',
    })
    expect(subject).toContain('Contract')
    expect(html).toContain('Alice')
    expect(html).toContain('https://dl/2')
  })
})

describe('documentCompletedSignerEmail', () => {
  it('includes signer name, title, and token-specific download URL', () => {
    const { subject, html } = documentCompletedSignerEmail({
      signerName: 'Bob',
      documentTitle: 'Agreement',
      downloadUrl: 'https://app/api/download/tok-xyz',
    })
    expect(subject).toContain('Agreement')
    expect(html).toContain('Bob')
    expect(html).toContain('Agreement')
    expect(html).toContain('https://app/api/download/tok-xyz')
    expect(html).toContain('Download Signed Document')
  })

  it('CTA renders both MSO and non-MSO branches', () => {
    const { html } = documentCompletedSignerEmail({
      signerName: 'Bob',
      documentTitle: 'Agreement',
      downloadUrl: 'https://app/api/download/tok',
    })
    // Guards against regressions where one branch is accidentally removed.
    expect(html).toContain('<!--[if mso]>')
    expect(html).toContain('<v:roundrect')
    expect(html).toContain('<!--[if !mso]><!-->')
    expect(html).toContain('class="button-a"')
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

describe('shared layout structure', () => {
  it('wraps all templates in the same branded layout', () => {
    const templates = [
      signatureRequestEmail({
        signerName: 'S',
        documentTitle: 'D',
        requesterName: 'R',
        signingUrl: 'https://s',
      }),
      documentSignedEmail({
        ownerName: 'O',
        documentTitle: 'D',
        signerName: 'S',
        documentUrl: 'https://d',
      }),
      allPartiesSignedEmail({
        recipientName: 'R',
        documentTitle: 'D',
        downloadUrl: 'https://d',
      }),
      documentCompletedOwnerEmail({
        ownerName: 'O',
        documentTitle: 'D',
        downloadUrl: 'https://d',
      }),
      documentCompletedSignerEmail({
        signerName: 'S',
        documentTitle: 'D',
        downloadUrl: 'https://d',
      }),
      userInvitationEmail({
        inviteeEmail: 'e@e.com',
        inviterName: 'I',
        role: 'member',
        loginUrl: 'https://l',
      }),
    ]

    for (const { html } of templates) {
      expect(html).toContain('<!DOCTYPE html')
      expect(html).toContain('Lunar Sign')
      expect(html).toContain('Lunar Rails')
      expect(html).toContain('role="presentation"')
      expect(html).toContain('automated message')
    }
  })

  it('every CTA-bearing template has both MSO and non-MSO button branches', () => {
    const ctaTemplates = [
      signatureRequestEmail({
        signerName: 'S',
        documentTitle: 'D',
        requesterName: 'R',
        signingUrl: 'https://s',
      }).html,
      documentSignedEmail({
        ownerName: 'O',
        documentTitle: 'D',
        signerName: 'S',
        documentUrl: 'https://d',
      }).html,
      allPartiesSignedEmail({
        recipientName: 'R',
        documentTitle: 'D',
        downloadUrl: 'https://d',
      }).html,
      documentCompletedOwnerEmail({
        ownerName: 'O',
        documentTitle: 'D',
        downloadUrl: 'https://d',
      }).html,
      documentCompletedSignerEmail({
        signerName: 'S',
        documentTitle: 'D',
        downloadUrl: 'https://d',
      }).html,
      userInvitationEmail({
        inviteeEmail: 'e@e.com',
        inviterName: 'I',
        role: 'member',
        loginUrl: 'https://l',
      }).html,
    ]

    for (const html of ctaTemplates) {
      expect(html).toContain('<!--[if mso]>')
      expect(html).toContain('<v:roundrect')
      expect(html).toContain('<!--[if !mso]><!-->')
      expect(html).toContain('class="button-a"')
    }
  })
})
