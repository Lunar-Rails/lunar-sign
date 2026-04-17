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
    preheader: `${params.requesterName} has requested your signature on ${params.documentTitle}`,
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

export function documentCompletedOwnerEmail(params: {
  ownerName: string
  documentTitle: string
  downloadUrl: string
}): { subject: string; html: string } {
  const subject = `Document Completed: ${params.documentTitle}`
  const html = renderEmail('document-completed-owner', {
    subject,
    preheader: `All parties have signed ${params.documentTitle}`,
    ownerName: params.ownerName,
    documentTitle: params.documentTitle,
    downloadUrl: params.downloadUrl,
  })
  return { subject, html }
}

export function documentCompletedSignerEmail(params: {
  signerName: string
  documentTitle: string
  downloadUrl: string
}): { subject: string; html: string } {
  const subject = `Document Fully Signed: ${params.documentTitle}`
  const html = renderEmail('document-completed-signer', {
    subject,
    preheader: `All parties have signed ${params.documentTitle}`,
    signerName: params.signerName,
    documentTitle: params.documentTitle,
    downloadUrl: params.downloadUrl,
  })
  return { subject, html }
}

export function signatureReminderEmail(params: {
  signerName: string
  documentTitle: string
  requesterName: string
  signingUrl: string
}): { subject: string; html: string } {
  const subject = `Reminder: Please sign ${params.documentTitle}`
  const html = renderEmail('signature-request', {
    subject,
    preheader: `Reminder from ${params.requesterName}: your signature is still needed on ${params.documentTitle}`,
    signerName: params.signerName,
    documentTitle: params.documentTitle,
    requesterName: params.requesterName,
    signingUrl: params.signingUrl,
  })
  return { subject, html }
}

// Backward-compatible alias for legacy call sites.
export function documentCompleteSignerEmail(params: {
  signerName: string
  documentTitle: string
  downloadUrl: string
}): { subject: string; html: string } {
  return documentCompletedSignerEmail(params)
}

export function documentDeclinedOwnerEmail(params: {
  ownerName: string
  documentTitle: string
  signerName: string
  signerEmail: string
  reason: string | null
}): { subject: string; html: string } {
  const subject = `Signature Declined: ${params.documentTitle}`
  const reasonRow = params.reason
    ? `<span style="font-size: 13px; color: #b8b4c8; margin-top: 4px; display: block;">Reason: ${params.reason}</span>`
    : `<span style="font-size: 13px; color: #7e7a92; margin-top: 4px; display: block;">No reason was provided.</span>`
  const html = renderEmail('document-declined-owner', {
    subject,
    preheader: `${params.signerName} declined to sign ${params.documentTitle}`,
    ownerName: params.ownerName,
    documentTitle: params.documentTitle,
    signerName: params.signerName,
    signerEmail: params.signerEmail,
    reasonRow,
  })
  return { subject, html }
}

export function signingOtpEmail(params: {
  signerName: string
  documentTitle: string
  otpCode: string
}): { subject: string; html: string } {
  const subject = `Your signing code: ${params.otpCode}`
  const html = renderEmail('signing-otp', {
    subject,
    preheader: `Your one-time code for ${params.documentTitle} — expires in 15 minutes`,
    signerName: params.signerName,
    documentTitle: params.documentTitle,
    otpCode: params.otpCode,
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
    preheader: `${params.inviterName} has invited you to join Lunar Sign`,
    inviteeEmail: params.inviteeEmail,
    inviterName: params.inviterName,
    roleLabel,
    loginUrl: params.loginUrl,
  })
  return { subject, html }
}
