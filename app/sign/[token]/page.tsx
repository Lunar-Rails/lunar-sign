import { redirect, notFound } from 'next/navigation'

import { getServiceClient } from '@/lib/supabase/service'

import { logAudit } from '@/lib/audit'

import SigningInterfaceClient from '@/components/SigningInterfaceClient'

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
        'id, document_id, signer_name, signer_email, requested_by, status, token, signed_at, created_at, signer_index'
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

        if (isRevoked) {
          outcome = { kind: 'revoked', documentTitle: document.title }
        } else if (signatureRequest.status !== 'pending') {
          outcome = { kind: 'already_signed' }
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

  if (outcome.kind === 'revoked') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-lr-bg px-4">
        <div className="w-full max-w-md rounded-lr-lg border border-lr-border bg-lr-surface p-8 text-center shadow-lr-card">
          <h1 className="font-display text-lr-xl font-semibold text-lr-text">
            Signing request cancelled
          </h1>
          <p className="mt-2 text-lr-sm text-lr-muted">
            <span className="font-medium text-lr-text">{outcome.documentTitle}</span>
          </p>
          <p className="mt-4 text-lr-sm text-lr-muted">
            This signing request has been cancelled by the document owner. You can close this page.
          </p>
        </div>
      </div>
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
