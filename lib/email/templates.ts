import { renderEmail } from './render'

export function signatureRequestEmail(params: {
  signerName: string
  documentTitle: string
  requesterName: string
  signingUrl: string
}): { subject: string; html: string } {
  const subject = `Please sign: ${params.documentTitle}`

  const html = renderEmail('signature-request', {
    subject,
    preheader: `${params.requesterName} requested your signature on ${params.documentTitle}`,
    signerName: params.signerName,
    documentTitle: params.documentTitle,
    requesterName: params.requesterName,
    signingUrl: params.signingUrl,
  })

  return { subject, html }
}

export function documentSignedEmail(params: {
  ownerName: string
  documentTitle: string
  signerName: string
  documentUrl: string
}): { subject: string; html: string } {
  const subject = `Signature Received: ${params.documentTitle}`

  const html = renderEmail('document-signed', {
    subject,
    preheader: `${params.signerName} has signed ${params.documentTitle}`,
    ownerName: params.ownerName,
    documentTitle: params.documentTitle,
    signerName: params.signerName,
    documentUrl: params.documentUrl,
  })

  return { subject, html }
}

export function allPartiesSignedEmail(params: {
  recipientName: string
  documentTitle: string
  downloadUrl: string
}): { subject: string; html: string } {
  const subject = `All Signatures Complete: ${params.documentTitle}`

  const html = renderEmail('all-parties-signed', {
    subject,
    preheader: `All parties have signed ${params.documentTitle}`,
    recipientName: params.recipientName,
    documentTitle: params.documentTitle,
    downloadUrl: params.downloadUrl,
  })

  return { subject, html }
}

export function documentCompleteSignerEmail(params: {
  signerName: string
  documentTitle: string
}): { subject: string; html: string } {
  const subject = `Document Fully Signed: ${params.documentTitle}`

  const html = renderEmail('document-complete-signer', {
    subject,
    preheader: `All parties have signed ${params.documentTitle}`,
    signerName: params.signerName,
    documentTitle: params.documentTitle,
  })

  return { subject, html }
}

export function userInvitationEmail(params: {
  inviteeEmail: string
  inviterName: string
  role: 'admin' | 'member'
  loginUrl: string
}): { subject: string; html: string } {
  const roleLabel = params.role === 'admin' ? 'Admin' : 'Member'
  const subject = 'You have been invited to Lunar Sign'

  const html = renderEmail('user-invitation', {
    subject,
    preheader: `${params.inviterName} invited you to join Lunar Sign as ${roleLabel}`,
    inviteeEmail: params.inviteeEmail,
    inviterName: params.inviterName,
    roleLabel,
    loginUrl: params.loginUrl,
  })

  return { subject, html }
}
