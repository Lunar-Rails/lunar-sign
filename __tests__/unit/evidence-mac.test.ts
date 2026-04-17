import { describe, it, expect } from 'vitest'
import { computeEvidenceMac, verifyEvidenceMac, type EvidenceMacInput } from '@/lib/esigning/evidence-mac'

const TEST_KEY = 'a'.repeat(64)

const baseInput: EvidenceMacInput = {
  signerEmail: 'alice@example.com',
  signerName: 'Alice Smith',
  signatureImageHash: '0'.repeat(64),
  originalDocumentHash: '1'.repeat(64),
  signedDocumentHash: '2'.repeat(64),
  signedAt: '2026-04-16T12:00:00.000Z',
  consentTextHash: '3'.repeat(64),
  otpVerified: true,
}

describe('evidence-mac', () => {
  it('produces a 64-char hex MAC', () => {
    const mac = computeEvidenceMac(baseInput, TEST_KEY)
    expect(mac).toHaveLength(64)
    expect(mac).toMatch(/^[0-9a-f]+$/)
  })

  it('is deterministic', () => {
    const mac1 = computeEvidenceMac(baseInput, TEST_KEY)
    const mac2 = computeEvidenceMac(baseInput, TEST_KEY)
    expect(mac1).toBe(mac2)
  })

  it('differs when any field changes', () => {
    const mac = computeEvidenceMac(baseInput, TEST_KEY)

    const fields: (keyof EvidenceMacInput)[] = [
      'signerEmail', 'signerName', 'signatureImageHash',
      'originalDocumentHash', 'signedDocumentHash', 'signedAt',
    ]
    for (const field of fields) {
      const mutated = { ...baseInput, [field]: 'CHANGED' }
      expect(computeEvidenceMac(mutated, TEST_KEY)).not.toBe(mac)
    }

    expect(computeEvidenceMac({ ...baseInput, otpVerified: false }, TEST_KEY)).not.toBe(mac)
    expect(computeEvidenceMac({ ...baseInput, consentTextHash: null }, TEST_KEY)).not.toBe(mac)
  })

  it('differs when the HMAC key changes', () => {
    const mac1 = computeEvidenceMac(baseInput, TEST_KEY)
    const mac2 = computeEvidenceMac(baseInput, 'b'.repeat(64))
    expect(mac1).not.toBe(mac2)
  })

  it('differs from plain SHA-256 (not interchangeable)', () => {
    const mac = computeEvidenceMac(baseInput, TEST_KEY)
    const input = [
      baseInput.signerEmail, baseInput.signerName,
      baseInput.signatureImageHash, baseInput.originalDocumentHash,
      baseInput.signedDocumentHash, baseInput.signedAt,
    ].join('\n')
    // compute plain SHA-256 without dynamic import
    const { createHash } = require('crypto') as typeof import('crypto')
    const sha = createHash('sha256').update(input).digest('hex')
    expect(mac).not.toBe(sha)
  })

  it('verifyEvidenceMac returns true for correct MAC', () => {
    const mac = computeEvidenceMac(baseInput, TEST_KEY)
    expect(verifyEvidenceMac(baseInput, TEST_KEY, mac)).toBe(true)
  })

  it('verifyEvidenceMac returns false for tampered input', () => {
    const mac = computeEvidenceMac(baseInput, TEST_KEY)
    const tampered = { ...baseInput, signerEmail: 'evil@example.com' }
    expect(verifyEvidenceMac(tampered, TEST_KEY, mac)).toBe(false)
  })
})
