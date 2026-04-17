import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'

export interface CertSignerRecord {
  signatureId: string
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
  appUrl: string
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

  // ── Blockchain Timestamp (OpenTimestamps) ─────────────────────────────
  line('Blockchain Timestamp (OpenTimestamps)', 11, bold)
  y -= 2
  line(
    'Each signature is independently anchored to the Bitcoin blockchain via OpenTimestamps, providing a tamper-proof timestamp that is verifiable without relying on Lunar Sign.',
    8, regular, gray, 10
  )
  y -= 6

  // Pre-generate all QR code buffers (one per signer) before drawing.
  const QR_SIZE = 60
  const qrResults: Array<{ url: string; pngBuf: Buffer | null }> = await Promise.all(
    input.signers.map(async (s) => {
      const url = `${input.appUrl}/verify/${s.signatureId}`
      try {
        const pngBuf = await QRCode.toBuffer(url, { type: 'png', width: 120, margin: 1 })
        return { url, pngBuf: Buffer.from(pngBuf) }
      } catch {
        return { url, pngBuf: null }
      }
    })
  )

  for (let i = 0; i < input.signers.length; i++) {
    const s = input.signers[i]
    const { url, pngBuf } = qrResults[i]

    if (y < margin + 80) break // guard against overflow

    // Snapshot y before drawing text so the QR is top-aligned with this row.
    const rowTopY = y

    // Text occupies the left column, leaving QR_SIZE + 8px gap on the right.
    const textMaxWidth = contentWidth - QR_SIZE - 18
    const drawLine = (text: string, size: number, font = regular, color = rgb(0, 0, 0)) => {
      if (y < margin + 60) return
      page.drawText(text, { x: margin + 10, y, size, font, color, maxWidth: textMaxWidth })
      y -= size + 5
    }

    drawLine(s.signerName, 9, bold, rgb(0.15, 0.15, 0.15))
    drawLine('Verify timestamp:', 7.5, regular, gray)
    drawLine(url, 7, mono, rgb(0.2, 0.2, 0.2))

    // Draw QR code top-aligned with this signer row.
    if (pngBuf) {
      try {
        const qrImage = await doc.embedPng(pngBuf)
        page.drawImage(qrImage, {
          x: width - margin - QR_SIZE,
          y: rowTopY - QR_SIZE,
          width: QR_SIZE,
          height: QR_SIZE,
        })
      } catch {
        // If QR embedding fails, the URL text is still present.
      }
    }

    // Ensure y advances at least past the QR image height.
    const rowBottomY = rowTopY - QR_SIZE - 6
    if (y > rowBottomY) y = rowBottomY
  }

  y -= 6
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
