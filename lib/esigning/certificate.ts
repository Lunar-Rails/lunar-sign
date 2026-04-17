import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export interface CertSignerRecord {
  signerName: string
  signerEmail: string
  signedAt: string
  ipAddress: string | null
  evidenceMac: string
  otpVerified: boolean
}

export interface CertificateInput {
  documentTitle: string
  documentId: string
  originalDocumentHash: string
  finalDocumentHash: string
  signers: CertSignerRecord[]
  generatedAt: string
}

/**
 * Appends a Certificate of Completion page to the given PDF bytes.
 * Returns the new PDF bytes (Buffer).
 */
export async function appendCertificateOfCompletion(
  pdfBytes: Buffer,
  input: CertificateInput
): Promise<Buffer> {
  const doc = await PDFDocument.load(pdfBytes)
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const mono = await doc.embedFont(StandardFonts.Courier)

  // A4 page
  const page = doc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()
  const margin = 50
  const contentWidth = width - margin * 2

  let y = height - margin

  function line(text: string, size: number, font = regular, color = rgb(0, 0, 0), indent = 0) {
    if (y < margin + 60) return // guard against overflow
    page.drawText(text, { x: margin + indent, y, size, font, color, maxWidth: contentWidth - indent })
    y -= size + 5
  }

  function hRule() {
    page.drawLine({
      start: { x: margin, y: y + 6 },
      end: { x: width - margin, y: y + 6 },
      thickness: 0.5,
      color: rgb(0.75, 0.75, 0.75),
    })
    y -= 12
  }

  const gray = rgb(0.45, 0.45, 0.45)
  const blue = rgb(0.09, 0.17, 0.52)

  // ── Header ───────────────────────────────────────────────────────────
  line('CERTIFICATE OF COMPLETION', 16, bold, blue)
  y -= 2
  hRule()
  y -= 2

  line(input.documentTitle, 13, bold)
  y -= 2
  line(`Document ID: ${input.documentId}`, 8, regular, gray)
  line(`Issued: ${new Date(input.generatedAt).toUTCString()}`, 8, regular, gray)
  y -= 10

  // ── Integrity ────────────────────────────────────────────────────────
  line('Document Integrity', 11, bold)
  y -= 2
  line('Original (unsigned) SHA-256:', 8, regular, gray, 10)
  line(input.originalDocumentHash, 7.5, mono, rgb(0.15, 0.15, 0.15), 10)
  y -= 2
  line('Final (all signatures + certificate) SHA-256:', 8, regular, gray, 10)
  line(input.finalDocumentHash, 7.5, mono, rgb(0.15, 0.15, 0.15), 10)
  y -= 12

  // ── Signers ──────────────────────────────────────────────────────────
  line('Signature Records', 11, bold)
  y -= 4

  for (const s of input.signers) {
    hRule()
    line(`${s.signerName}  <${s.signerEmail}>`, 10, bold)
    line(`Signed at: ${new Date(s.signedAt).toUTCString()}`, 9, regular, gray, 10)
    if (s.ipAddress) line(`IP address: ${s.ipAddress}`, 9, regular, gray, 10)
    line(
      `Email OTP identity check: ${s.otpVerified ? 'Passed' : 'Not performed'}`,
      9,
      regular,
      s.otpVerified ? rgb(0.1, 0.5, 0.1) : gray,
      10
    )
    line('Evidence MAC (HMAC-SHA256):', 8, regular, gray, 10)
    line(s.evidenceMac, 7, mono, rgb(0.2, 0.2, 0.2), 10)
    y -= 4
  }

  hRule()
  y -= 6

  // ── Footer ────────────────────────────────────────────────────────────
  const footerY = margin + 14
  page.drawText(
    'Electronically signed via Lunar Sign. This document is legally binding under applicable e-signature laws (ESIGN/UETA/eIDAS).',
    { x: margin, y: footerY, size: 7.5, font: regular, color: gray, maxWidth: contentWidth }
  )

  const outBytes = await doc.save()
  return Buffer.from(outBytes)
}
