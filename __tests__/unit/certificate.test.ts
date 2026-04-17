import { describe, expect, it } from 'vitest'
import { appendCertificateOfCompletion } from '@/lib/esigning/certificate'
import type { CertificateInput } from '@/lib/esigning/certificate'
import { PDFDocument } from 'pdf-lib'

async function minimalPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create()
  doc.addPage([200, 200])
  return Buffer.from(await doc.save())
}

const input: CertificateInput = {
  documentTitle: 'Service Agreement',
  documentId: 'doc-123',
  originalDocumentHash: 'a'.repeat(64),
  finalDocumentHash: 'b'.repeat(64),
  generatedAt: new Date('2026-04-17T12:00:00Z').toISOString(),
  signers: [
    {
      signerName: 'Alice Example',
      signerEmail: 'alice@example.com',
      signedAt: new Date('2026-04-17T10:00:00Z').toISOString(),
      ipAddress: '203.0.113.1',
      evidenceMac: 'c'.repeat(64),
      otpVerified: true,
    },
    {
      signerName: 'Bob Example',
      signerEmail: 'bob@example.com',
      signedAt: new Date('2026-04-17T11:00:00Z').toISOString(),
      ipAddress: null,
      evidenceMac: 'd'.repeat(64),
      otpVerified: false,
    },
  ],
}

describe('appendCertificateOfCompletion', () => {
  it('returns a larger PDF than the original', async () => {
    const original = await minimalPdf()
    const result = await appendCertificateOfCompletion(original, input)
    expect(result.length).toBeGreaterThan(original.length)
  })

  it('adds exactly one page to the document', async () => {
    const original = await minimalPdf()
    const originalDoc = await PDFDocument.load(original)
    const originalPages = originalDoc.getPageCount()

    const result = await appendCertificateOfCompletion(original, input)
    const resultDoc = await PDFDocument.load(result)
    expect(resultDoc.getPageCount()).toBe(originalPages + 1)
  })

  it('produces a valid PDF buffer', async () => {
    const original = await minimalPdf()
    const result = await appendCertificateOfCompletion(original, input)
    // pdf-lib can load its own output without throwing
    await expect(PDFDocument.load(result)).resolves.toBeTruthy()
  })

  it('handles a signer with null ipAddress', async () => {
    const original = await minimalPdf()
    const inputNoIp: CertificateInput = {
      ...input,
      signers: [{ ...input.signers[0], ipAddress: null }],
    }
    const result = await appendCertificateOfCompletion(original, inputNoIp)
    await expect(PDFDocument.load(result)).resolves.toBeTruthy()
  })
})
