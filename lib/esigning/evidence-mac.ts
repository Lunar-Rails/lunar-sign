/**
 * HMAC-SHA256 evidence computation for signing events.
 *
 * Replaces the plain SHA-256 evidence_hash — HMAC with an external key means
 * that even someone with full DB write access cannot forge a valid MAC without
 * knowing EVIDENCE_HMAC_KEY.
 *
 * Key: 32-byte (64 hex char) value in EVIDENCE_HMAC_KEY env var.
 * Generate: openssl rand -hex 32
 *
 * Canonical input format — one field per line, order is fixed:
 *   signerEmail\nsignerName\nsignatureImageHash\noriginalDocumentHash\n
 *   signedDocumentHash\nsignedAt\nconsentTextHash\notpVerified
 *
 * If any stored field is mutated after the fact, recomputing the MAC will
 * not match, proving tampering.
 */

import crypto from 'crypto'

export interface EvidenceMacInput {
  signerEmail: string
  signerName: string
  signatureImageHash: string
  originalDocumentHash: string
  signedDocumentHash: string
  signedAt: string
  consentTextHash: string | null
  otpVerified: boolean
}

export function computeEvidenceMac(input: EvidenceMacInput, hmacKey: string): string {
  const canonical = [
    input.signerEmail,
    input.signerName,
    input.signatureImageHash,
    input.originalDocumentHash,
    input.signedDocumentHash,
    input.signedAt,
    input.consentTextHash ?? '',
    input.otpVerified ? '1' : '0',
  ].join('\n')

  const keyBytes = Buffer.from(hmacKey, 'hex')
  return crypto.createHmac('sha256', keyBytes).update(canonical).digest('hex')
}

export function verifyEvidenceMac(input: EvidenceMacInput, hmacKey: string, stored: string): boolean {
  const expected = computeEvidenceMac(input, hmacKey)
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(stored, 'hex'))
}
