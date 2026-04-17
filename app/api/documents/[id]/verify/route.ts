import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { canAccessDocument } from '@/lib/authorization'
import { getConfig } from '@/lib/config'
import { computeEvidenceMac } from '@/lib/esigning/evidence-mac'
import crypto from 'crypto'

export interface SignerVerificationResult {
  request_id: string
  signer_email: string
  signer_name: string
  signed_at: string | null
  /** SHA-256 of the stored signed PDF re-downloaded from storage matches document_hash */
  pdf_integrity: 'verified' | 'tampered' | 'no_signature'
  /**
   * HMAC-SHA256 evidence_mac verified with EVIDENCE_HMAC_KEY (preferred).
   * Falls back to plain SHA-256 evidence_hash for legacy rows without evidence_mac.
   */
  evidence_integrity: 'verified' | 'tampered' | 'no_hash'
}

export interface VerifyResponse {
  document_id: string
  verified_at: string
  signers: SignerVerificationResult[]
  overall: 'verified' | 'tampered' | 'incomplete'
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: documentId } = await params

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const hasAccess = await canAccessDocument({ supabase, userId: user.id, documentId })
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const serviceSupabase = getServiceClient()

    // Fetch all signature requests for this document, joined to their signatures.
    const { data: rows, error: fetchError } = await serviceSupabase
      .from('signature_requests')
      .select(
        `id,
         signer_email,
         signer_name,
         consent_text_hash,
         signatures (
           document_hash,
           original_document_hash,
           signature_image_hash,
           evidence_hash,
           evidence_mac,
           otp_verified,
           signed_pdf_path,
           signed_at
         )`
      )
      .eq('document_id', documentId)
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Verify fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to load signature data' }, { status: 500 })
    }

    const verifiedAt = new Date().toISOString()
    const signers: SignerVerificationResult[] = []

    for (const row of rows ?? []) {
      // Supabase returns the joined row as an object or array depending on the relation cardinality.
      const sig = Array.isArray(row.signatures) ? row.signatures[0] : row.signatures

      if (!sig) {
        signers.push({
          request_id: row.id,
          signer_email: row.signer_email,
          signer_name: row.signer_name,
          signed_at: null,
          pdf_integrity: 'no_signature',
          evidence_integrity: 'no_hash',
        })
        continue
      }

      // 1. PDF integrity — re-download and recompute SHA-256.
      let pdfIntegrity: SignerVerificationResult['pdf_integrity'] = 'no_signature'
      if (sig.signed_pdf_path && sig.document_hash) {
        const { data: pdfBlob, error: dlError } = await serviceSupabase.storage
          .from('signed-documents')
          .download(sig.signed_pdf_path)

        if (dlError || !pdfBlob) {
          pdfIntegrity = 'tampered' // file missing from storage
        } else {
          const pdfBytes = Buffer.from(await pdfBlob.arrayBuffer())
          const recomputed = crypto.createHash('sha256').update(pdfBytes).digest('hex')
          pdfIntegrity = recomputed === sig.document_hash ? 'verified' : 'tampered'
        }
      }

      // 2. Evidence integrity.
      // Prefer HMAC evidence_mac (new rows) over legacy plain SHA-256 evidence_hash.
      let evidenceIntegrity: SignerVerificationResult['evidence_integrity'] = 'no_hash'
      const config = getConfig()
      if (
        sig.signature_image_hash &&
        sig.original_document_hash &&
        sig.document_hash &&
        sig.signed_at
      ) {
        if (sig.evidence_mac) {
          // New path: HMAC-SHA256 with external key.
          const recomputedMac = computeEvidenceMac(
            {
              signerEmail: row.signer_email,
              signerName: row.signer_name,
              signatureImageHash: sig.signature_image_hash,
              originalDocumentHash: sig.original_document_hash,
              signedDocumentHash: sig.document_hash,
              signedAt: sig.signed_at,
              consentTextHash: (row as { consent_text_hash?: string | null }).consent_text_hash ?? null,
              otpVerified: Boolean(sig.otp_verified),
            },
            config.EVIDENCE_HMAC_KEY
          )
          try {
            evidenceIntegrity = crypto.timingSafeEqual(
              Buffer.from(recomputedMac, 'hex'),
              Buffer.from(sig.evidence_mac, 'hex')
            ) ? 'verified' : 'tampered'
          } catch {
            evidenceIntegrity = 'tampered'
          }
        } else if (sig.evidence_hash) {
          // Legacy path: plain SHA-256.
          const evidenceInput = [
            row.signer_email,
            row.signer_name,
            sig.signature_image_hash,
            sig.original_document_hash,
            sig.document_hash,
            sig.signed_at,
          ].join('\n')
          const recomputed = crypto.createHash('sha256').update(evidenceInput).digest('hex')
          evidenceIntegrity = recomputed === sig.evidence_hash ? 'verified' : 'tampered'
        }
      }

      signers.push({
        request_id: row.id,
        signer_email: row.signer_email,
        signer_name: row.signer_name,
        signed_at: sig.signed_at,
        pdf_integrity: pdfIntegrity,
        evidence_integrity: evidenceIntegrity,
      })
    }

    const allVerified = signers.every(
      (s) => s.pdf_integrity === 'verified' && s.evidence_integrity === 'verified'
    )
    const anyTampered = signers.some(
      (s) => s.pdf_integrity === 'tampered' || s.evidence_integrity === 'tampered'
    )

    const overall: VerifyResponse['overall'] = anyTampered
      ? 'tampered'
      : allVerified
        ? 'verified'
        : 'incomplete'

    const body: VerifyResponse = {
      document_id: documentId,
      verified_at: verifiedAt,
      signers,
      overall,
    }

    return NextResponse.json(body)
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
