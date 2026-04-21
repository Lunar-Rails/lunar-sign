import { redirect, notFound } from 'next/navigation'

import { getServiceClient } from '@/lib/supabase/service'

import { logAudit } from '@/lib/audit'

import SigningInterfaceClient from '@/components/SigningInterfaceClient'
import { SignerShell } from '@/components/signer/SignerShell'
import { SignerStateCard } from '@/components/signer/SignerStateCard'
import { Clock, XCircle } from 'lucide-react'

import type { SignatureRequestWithToken, Document, StoredField } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface SigningPageProps {
  params: Promise<{ token: string }>
}

type SigningOutcome =
  | { kind: 'not_found' }
  | { kind: 'deleted' }
  | { kind: 'revoked'; documentTitle: string }
  | { kind: 'already_signed' }
  | { kind: 'needs_consent' }
  | { kind: 'needs_otp' }
  | { kind: 'expired' }
  | {
      kind: 'ready'
      signatureRequest: SignatureRequestWithToken
      document: Document
      pdfBase64: string
      signerIndex: number | null
      baseVersion: string
    }

export default async function SigningPage({ params }: SigningPageProps) {
  const { token } = await params
  const supabase = getServiceClient()

  let outcome: SigningOutcome
  try {
    const { data: signatureRequestRaw } = await supabase
      .from('signature_requests')
      .select(
        'id, document_id, signer_name, signer_email, requested_by, status, token, signed_at, created_at, signer_index, consent_given_at, expires_at'
      )
      .eq('token', token)
      .single()

    const signatureRequest =
      signatureRequestRaw as SignatureRequestWithToken | null

    if (!signatureRequest) {
      outcome = { kind: 'not_found' }
    } else {
      const { data: documentRaw } = await supabase
        .from('documents')
        .select('*')
        .eq('id', signatureRequest.document_id)
        .single()

      const document = documentRaw as Document | null

      if (!document || document.deleted_at) {
        outcome = document?.deleted_at ? { kind: 'deleted' } : { kind: 'not_found' }
      } else {
        const isRevoked =
          document.status === 'cancelled' ||
          signatureRequest.status === 'cancelled'

        const expiresAt = (signatureRequest as unknown as { expires_at?: string | null }).expires_at
        const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false

        if (isRevoked) {
          outcome = { kind: 'revoked', documentTitle: document.title }
        } else if (signatureRequest.status !== 'pending') {
          outcome = { kind: 'already_signed' }
        } else if (isExpired) {
          outcome = { kind: 'expired' }
        } else if (!(signatureRequest as unknown as { consent_given_at?: string | null }).consent_given_at) {
          outcome = { kind: 'needs_consent' }
        } else {
          const { data: otpRow } = await supabase
            .from('signing_otps')
            .select('verified_at')
            .eq('request_id', signatureRequest.id)
            .maybeSingle()

          // Check OTP verification — only gate when a code has been sent but not yet verified.
          // If no OTP record exists yet, we send one from the OTP page.
          // If a record exists but is unverified, the signer must complete OTP.
          if (otpRow !== undefined && !otpRow?.verified_at) {
            outcome = { kind: 'needs_otp' }
          } else {
          let pdfPath = document.file_path
          if (document.latest_signed_pdf_path) {
            pdfPath = document.latest_signed_pdf_path
          }

          const { data: pdfData, error: downloadError } = await supabase.storage
            .from(
              document.latest_signed_pdf_path
                ? 'signed-documents'
                : 'documents'
            )
            .download(pdfPath)

          if (downloadError || !pdfData) {
            console.error('PDF download error:', downloadError)
            outcome = { kind: 'not_found' }
          } else {
            const arrayBuffer = await pdfData.arrayBuffer()
            const pdfBase64 = Buffer.from(arrayBuffer).toString('base64')

            await logAudit(null, 'document_viewed', 'document', document.id, {
              token_suffix: token.slice(-8),
              signer_email: signatureRequest.signer_email,
            })

            outcome = {
              kind: 'ready',
              signatureRequest,
              document,
              pdfBase64,
              signerIndex: (signatureRequest as unknown as { signer_index?: number | null }).signer_index ?? null,
              baseVersion: document.latest_signed_pdf_path ?? 'original',
            }
          }
          } // close OTP else block
        }
      }
    }
  } catch (error) {
    console.error('Signing page error:', error)
    outcome = { kind: 'not_found' }
  }

  if (outcome.kind === 'not_found') {
    redirect(`/sign/${token}/not-found`)
  }

  if (outcome.kind === 'deleted') {
    notFound()
  }

  if (outcome.kind === 'already_signed') {
    redirect(`/sign/${token}/already-signed`)
  }

  if (outcome.kind === 'needs_consent') {
    redirect(`/sign/${token}/consent`)
  }

  if (outcome.kind === 'needs_otp') {
    redirect(`/sign/${token}/otp`)
  }

  if (outcome.kind === 'expired') {
    return (
      <SignerShell width="narrow" align="center">
        <SignerStateCard
          tone="warning"
          icon={Clock}
          kicker="Expired"
          title="Signing link expired"
          description="This signing link has expired. Please contact the document owner to request a new link."
        />
      </SignerShell>
    )
  }

  if (outcome.kind === 'revoked') {
    return (
      <SignerShell width="narrow" align="center">
        <SignerStateCard
          tone="error"
          icon={XCircle}
          kicker="Cancelled"
          title="Signing request cancelled"
          description={`"${outcome.documentTitle}" has been cancelled by the document owner. You can close this page.`}
        />
      </SignerShell>
    )
  }

  const meta = outcome.document.field_metadata
  const initialFieldsJson =
    Array.isArray(meta) && (meta as StoredField[]).length > 0
      ? JSON.stringify(meta)
      : null

  return (
    <SigningInterfaceClient
      token={token}
      signerName={outcome.signatureRequest.signer_name}
      signerEmail={outcome.signatureRequest.signer_email}
      documentTitle={outcome.document.title}
      pdfBase64={outcome.pdfBase64}
      initialFieldsJson={initialFieldsJson}
      signerIndex={outcome.signerIndex}
      baseVersion={outcome.baseVersion}
    />
  )
}
