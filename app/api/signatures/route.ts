import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'
import crypto from 'crypto'
import { getConfig } from '@/lib/config'
import { sendEmail } from '@/lib/email/client'
import {
  documentCompletedOwnerEmail,
  documentCompletedSignerEmail,
  documentSignedEmail,
} from '@/lib/email/templates'
import type {
  Document,
  SignatureRequestWithToken,
} from '@/lib/types'

interface AllRequestRow {
  id: string
  status: string
  signer_name: string
  signer_email: string
  token: string
}

interface OwnerProfileRow {
  email: string
  full_name: string
}

const signatureRateLimiter = rateLimit({ windowMs: 60_000, max: 10 })
const MAX_SIGNATURE_BODY_BYTES = 20 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip')?.trim() ||
      'unknown'
    const rateLimitResult = signatureRateLimiter.check(ip)
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const contentLength = request.headers.get('content-length')
    if (contentLength && Number(contentLength) > MAX_SIGNATURE_BODY_BYTES) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      )
    }

    const supabase = getServiceClient()
    const body = await request.json()
    const {
      token,
      signature_data,
      signer_name,
      signed_pdf_base64,
      base_version,
    } = body

    if (
      typeof token !== 'string' ||
      typeof signer_name !== 'string' ||
      typeof signature_data !== 'string' ||
      typeof signed_pdf_base64 !== 'string' ||
      typeof base_version !== 'string' ||
      !token ||
      !signer_name ||
      !signature_data ||
      !signed_pdf_base64 ||
      !base_version
    ) {
      return NextResponse.json(
        { error: 'Missing required signing payload' },
        { status: 400 }
      )
    }

    const { data: signatureRequestRaw } = await supabase
      .from('signature_requests')
      .select(
        'id, document_id, signer_name, signer_email, requested_by, status, token, signed_at, created_at'
      )
      .eq('token', token)
      .eq('status', 'pending')
      .single()

    const signatureRequest =
      signatureRequestRaw as SignatureRequestWithToken | null

    if (!signatureRequest) {
      return NextResponse.json(
        { error: 'Invalid or already used signature token' },
        { status: 400 }
      )
    }

    const { data: documentRaw } = await supabase
      .from('documents')
      .select('*')
      .eq('id', signatureRequest.document_id)
      .single()

    const document = documentRaw as Document | null

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Optimistic concurrency: reject if another signer updated the document
    // between the time this client loaded the signing page and submitted.
    // 'original' is the sentinel for a document that has not been signed yet.
    const currentBase = document.latest_signed_pdf_path ?? 'original'
    if (currentBase !== base_version) {
      return NextResponse.json(
        {
          error:
            'Another signer updated this document. Please reload to sign the latest version.',
          code: 'STALE_BASE',
        },
        { status: 409 }
      )
    }

    const signedPdfBytes = Buffer.from(signed_pdf_base64, 'base64')
    if (!signedPdfBytes.length) {
      return NextResponse.json(
        { error: 'Invalid signed PDF payload' },
        { status: 400 }
      )
    }

    const { data: originalPdfData, error: originalPdfError } = await supabase.storage
      .from('documents')
      .download(document.file_path)
    if (originalPdfError || !originalPdfData) {
      console.error('Original PDF download error:', originalPdfError)
      return NextResponse.json(
        { error: 'Failed to load original document' },
        { status: 500 }
      )
    }

    const originalPdfBytes = Buffer.from(await originalPdfData.arrayBuffer())
    const originalDocumentHash = crypto
      .createHash('sha256')
      .update(originalPdfBytes)
      .digest('hex')
    const signedDocumentHash = crypto
      .createHash('sha256')
      .update(signedPdfBytes)
      .digest('hex')

    // Hash the signature image itself so the captured ink is independently verifiable.
    const signatureImageHash = crypto
      .createHash('sha256')
      .update(Buffer.from(signature_data))
      .digest('hex')

    // Pre-compute signed_at so it's identical in the DB row and the evidence hash.
    const signedAt = new Date().toISOString()

    // Evidence hash: canonical commit over all signing event fields.
    // Format: each field on its own line, ordered deterministically.
    // Re-computing this from the DB later proves the record hasn't been tampered with.
    const evidenceInput = [
      signatureRequest.signer_email,
      signer_name,
      signatureImageHash,
      originalDocumentHash,
      signedDocumentHash,
      signedAt,
    ].join('\n')
    const evidenceHash = crypto
      .createHash('sha256')
      .update(evidenceInput)
      .digest('hex')

    const uploadPath = `${document.id}/${signatureRequest.id}_signed.pdf`
    const { error: uploadError } = await supabase.storage
      .from('signed-documents')
      .upload(uploadPath, signedPdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('PDF upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to save signed document' },
        { status: 500 }
      )
    }

    const docUpdateResult = await supabase
      .from('documents')
      .update({ latest_signed_pdf_path: uploadPath })
      .eq('id', document.id)
    const { error: docUpdateError } = docUpdateResult

    if (docUpdateError) {
      console.error('Document update error:', docUpdateError)
      return NextResponse.json(
        { error: 'Failed to update document' },
        { status: 500 }
      )
    }

    const userAgent = request.headers.get('user-agent') || null

    const sigInsertResult = await supabase.from('signatures').insert({
      request_id: signatureRequest.id,
      signature_data,
      document_hash: signedDocumentHash,
      original_document_hash: originalDocumentHash,
      signature_image_hash: signatureImageHash,
      evidence_hash: evidenceHash,
      signed_pdf_path: uploadPath,
      ip_address: ip === 'unknown' ? null : ip,
      user_agent: userAgent,
      signed_at: signedAt,
    })
    const { error: sigInsertError } = sigInsertResult

    if (sigInsertError) {
      console.error('Signature insert error:', sigInsertError)
      return NextResponse.json(
        { error: 'Failed to record signature' },
        { status: 500 }
      )
    }

    const reqUpdateResult = await supabase
      .from('signature_requests')
      .update({ status: 'signed', signed_at: signedAt })
      .eq('id', signatureRequest.id)
    const { error: reqUpdateError } = reqUpdateResult

    if (reqUpdateError) {
      console.error('Request update error:', reqUpdateError)
      return NextResponse.json(
        { error: 'Failed to update signature request' },
        { status: 500 }
      )
    }

    await logAudit(null, 'document_signed', 'document', document.id, {
      token_suffix: token.slice(-8),
      signer_email: signatureRequest.signer_email,
      signer_name,
    })

    const { data: allRequestsRaw } = await supabase
      .from('signature_requests')
      .select('id, status, signer_name, signer_email, token')
      .eq('document_id', document.id)

    const allRequests = (allRequestsRaw ?? []) as AllRequestRow[]

    const allSigned =
      allRequests.length > 0 && allRequests.every((req) => req.status === 'signed')

    // Resolve owner profile once; reused for both partial- and completion-emails.
    const { data: ownerProfileRaw } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', document.uploaded_by)
      .single()

    const ownerProfile = ownerProfileRaw as OwnerProfileRow | null
    const config = getConfig()

    let completed = false
    if (allSigned) {
      const completeResult = await supabase
        .from('documents')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', document.id)
      const { error: completeError } = completeResult

      if (completeError) {
        console.error('Document complete error:', completeError)
      } else {
        completed = true

        await logAudit(null, 'document_completed', 'document', document.id, {
          total_signers: allRequests.length,
        })

        // Completion emails: DB state is already committed above. Failures here
        // must not fail the request or hide the completed state from the UI.
        try {
          if (ownerProfile) {
            const downloadUrl = `${config.NEXT_PUBLIC_APP_URL}/api/documents/${document.id}/download`
            const { subject, html } = documentCompletedOwnerEmail({
              ownerName: ownerProfile.full_name,
              documentTitle: document.title,
              downloadUrl,
            })
            await sendEmail({ to: ownerProfile.email, subject, html })
          }

          for (const req of allRequests) {
            const signerDownloadUrl = `${config.NEXT_PUBLIC_APP_URL}/api/download/${req.token}`
            const { subject, html } = documentCompletedSignerEmail({
              signerName: req.signer_name,
              documentTitle: document.title,
              downloadUrl: signerDownloadUrl,
            })
            await sendEmail({ to: req.signer_email, subject, html })
          }
        } catch (emailError) {
          console.error('Completion email error:', emailError)
        }
      }
    } else if (ownerProfile) {
      // Partial signing: notify the owner of this specific signature.
      // Skipped when the signature also completes the document (owner gets the
      // completion email instead - no double-notify).
      try {
        const documentUrl = `${config.NEXT_PUBLIC_APP_URL}/documents/${document.id}`
        const { subject, html } = documentSignedEmail({
          ownerName: ownerProfile.full_name,
          documentTitle: document.title,
          signerName: signer_name,
          documentUrl,
        })
        await sendEmail({ to: ownerProfile.email, subject, html })
      } catch (emailError) {
        console.error('Partial signing email error:', emailError)
      }
    }

    return NextResponse.json(
      { success: true, data: { completed } },
      { status: 200 }
    )
  } catch (error) {
    console.error('Signature API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
