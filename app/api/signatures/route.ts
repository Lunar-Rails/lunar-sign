import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'
import { PDFDocument, rgb } from 'pdf-lib'
import crypto from 'crypto'
import { getConfig } from '@/lib/config'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    const body = await request.json()
    const { token, signature_data, signer_name } = body

    // Validate token and fetch signature request
    const { data: signatureRequest } = await supabase
      .from('signature_requests')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single() as any

    if (!signatureRequest) {
      return NextResponse.json(
        { error: 'Invalid or already used signature token' },
        { status: 400 }
      )
    }

    // Fetch document
    const { data: document } = await supabase
      .from('documents')
      .select('*')
      .eq('id', signatureRequest.document_id)
      .single() as any

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Determine which PDF to download
    const pdfPath = document.latest_signed_pdf_path || document.file_path
    const bucket = document.latest_signed_pdf_path ? 'signed-documents' : 'documents'

    // Download current PDF
    const { data: pdfBlob, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(pdfPath)

    if (downloadError || !pdfBlob) {
      console.error('PDF download error:', downloadError)
      return NextResponse.json(
        { error: 'Failed to download document' },
        { status: 500 }
      )
    }

    // Convert blob to buffer
    const pdfArrayBuffer = await pdfBlob.arrayBuffer()
    const pdfBytes = Buffer.from(pdfArrayBuffer)

    // Calculate hash of original PDF
    const documentHash = crypto
      .createHash('sha256')
      .update(pdfBytes)
      .digest('hex')

    // Load PDF and embed signature
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()
    const lastPage = pages[pages.length - 1]
    const { height } = lastPage.getSize()

    // Process signature image data URL
    let signatureImageBytes: Uint8Array

    if (signature_data.startsWith('data:image/png;base64,')) {
      const base64 = signature_data.substring('data:image/png;base64,'.length)
      signatureImageBytes = Buffer.from(base64, 'base64')
    } else if (signature_data.startsWith('data:image/jpeg;base64,')) {
      const base64 = signature_data.substring('data:image/jpeg;base64,'.length)
      signatureImageBytes = Buffer.from(base64, 'base64')
    } else {
      // Assume it's already base64
      signatureImageBytes = Buffer.from(signature_data, 'base64')
    }

    // Embed image
    let signatureImage
    try {
      signatureImage = await pdfDoc.embedPng(signatureImageBytes)
    } catch {
      try {
        signatureImage = await pdfDoc.embedJpg(signatureImageBytes)
      } catch {
        return NextResponse.json(
          { error: 'Invalid signature image format' },
          { status: 400 }
        )
      }
    }

    // Draw signature box at bottom right
    const signatureBoxWidth = 150
    const signatureBoxHeight = 80
    const margin = 20
    const x = lastPage.getWidth() - signatureBoxWidth - margin
    const y = margin

    // Draw background
    lastPage.drawRectangle({
      x,
      y,
      width: signatureBoxWidth,
      height: signatureBoxHeight,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
      color: rgb(1, 1, 1),
    })

    // Draw signature image (scaled to fit)
    const imgScaledHeight = signatureBoxHeight * 0.7
    const imgScaledWidth = (signatureImage.width / signatureImage.height) * imgScaledHeight
    lastPage.drawImage(signatureImage, {
      x: x + (signatureBoxWidth - imgScaledWidth) / 2,
      y: y + 40,
      height: imgScaledHeight,
      width: imgScaledWidth,
    })

    // Draw signer name
    lastPage.drawText(signer_name, {
      x: x + 5,
      y: y + 15,
      size: 10,
      color: rgb(0, 0, 0),
    })

    // Draw date
    const date = new Date().toLocaleDateString()
    lastPage.drawText(date, {
      x: x + 5,
      y: y + 5,
      size: 8,
      color: rgb(0.5, 0.5, 0.5),
    })

    // Save modified PDF
    const signedPdfBytes = await pdfDoc.save()

    // Upload signed PDF to storage
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

    // Update document latest_signed_pdf_path
    const docUpdateResult = await (supabase as any)
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

    // Get client IP and user agent
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      null
    const userAgent = request.headers.get('user-agent') || null

    // Insert signature record
    const sigInsertResult = await (supabase as any)
      .from('signatures')
      .insert({
        request_id: signatureRequest.id,
        signature_data,
        document_hash: documentHash,
        signed_pdf_path: uploadPath,
        ip_address: ip,
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

    // Update signature request status
    const reqUpdateResult = await (supabase as any)
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

    // Log audit
    await logAudit(null, 'document_signed', 'document', document.id, {
      token,
      signer_email: signatureRequest.signer_email,
      signer_name,
    })

    // Check if all signature requests are signed
    const { data: allRequests } = await supabase
      .from('signature_requests')
      .select('*')
      .eq('document_id', document.id) as any

    const allSigned = allRequests?.every((req: any) => req.status === 'signed')

    let completed = false
    if (allSigned) {
      // Update document status to completed
      const completeResult = await (supabase as any)
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

        // Log audit
        await logAudit(null, 'document_completed', 'document', document.id, {
          total_signers: allRequests?.length,
        })

        // Send completion emails
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

          // Email to document owner
          const { data: ownerProfile } = await (supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', document.uploaded_by)
            .single() as any)

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

          // Email to all signers
          if (allRequests) {
            for (const req of allRequests as any) {
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
