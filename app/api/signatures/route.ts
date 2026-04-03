import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'
import crypto from 'crypto'
import { getConfig } from '@/lib/config'
import nodemailer from 'nodemailer'
import type {
  Document,
  SignatureRequest,
  SignatureRequestWithToken,
} from '@/lib/types'

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
    const { token, signature_data, signer_name, signed_pdf_base64 } = body

    if (
      typeof token !== 'string' ||
      typeof signer_name !== 'string' ||
      typeof signature_data !== 'string' ||
      typeof signed_pdf_base64 !== 'string' ||
      !token ||
      !signer_name ||
      !signature_data ||
      !signed_pdf_base64
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
      signed_pdf_path: uploadPath,
      ip_address: ip === 'unknown' ? null : ip,
      user_agent: userAgent,
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
      .update({ status: 'signed', signed_at: new Date().toISOString() })
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
      .select('id, status, signer_name, signer_email')
      .eq('document_id', document.id)

    const allRequests = (allRequestsRaw ?? []) as SignatureRequest[]

    const allSigned = allRequests.every((req) => req.status === 'signed')

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

        try {
          const config = getConfig()
          const transporter = nodemailer.createTransport({
            host: config.MAILTRAP_HOST,
            port: config.MAILTRAP_PORT,
            auth: {
              user: config.MAILTRAP_USER,
              pass: config.MAILTRAP_PASSWORD,
            },
          })

          const { data: ownerProfileRaw } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', document.uploaded_by)
            .single()

          const ownerProfile = ownerProfileRaw as OwnerProfileRow | null

          if (ownerProfile) {
            const downloadUrl = `${config.NEXT_PUBLIC_APP_URL}/api/documents/${document.id}/download`
            await transporter.sendMail({
              from: config.EMAIL_FROM,
              to: ownerProfile.email,
              subject: `Document Completed: ${document.title}`,
              html: `
                <h2>All Signatures Received</h2>
                <p>Hello ${ownerProfile.full_name},</p>
                <p>All parties have signed your document <strong>${document.title}</strong>.</p>
                <p>
                  <a href="${downloadUrl}" style="display: inline-block; padding: 10px 20px; background-color: #1a202c; color: white; text-decoration: none; border-radius: 5px;">
                    Download Signed Document
                  </a>
                </p>
              `,
            })
          }

          for (const req of allRequests) {
            await transporter.sendMail({
              from: config.EMAIL_FROM,
              to: req.signer_email,
              subject: `Document Fully Signed: ${document.title}`,
              html: `
                  <h2>Document Complete</h2>
                  <p>Hello ${req.signer_name},</p>
                  <p>All parties have now signed <strong>${document.title}</strong>.</p>
                  <p>Thank you for signing.</p>
                `,
            })
          }
        } catch (emailError) {
          console.error('Completion email error:', emailError)
        }
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
