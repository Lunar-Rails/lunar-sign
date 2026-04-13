import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

import { logAudit } from '@/lib/audit'
import { canAccessTemplate } from '@/lib/authorization'
import { getConfig } from '@/lib/config'
import { sendEmail } from '@/lib/email/client'
import { signatureRequestEmail } from '@/lib/email/templates'
import {
  mergeCreatorFieldValues,
  parseFieldMetadata,
  validateCreatorFieldsComplete,
} from '@/lib/field-metadata'
import { DocumentFromTemplateSchema } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: templateId } = await params
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const allowed = await canAccessTemplate({
      supabase,
      userId: user.id,
      templateId,
    })
    if (!allowed)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const parsed = DocumentFromTemplateSchema.safeParse(body)
    if (!parsed.success) {
      const err = parsed.error.flatten().fieldErrors
      const msg = Object.values(err)[0]?.[0] || 'Validation error'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const { title, description, field_values, signers, send_now } = parsed.data

    const { data: template } = await supabase
      .from('templates')
      .select(
        'id, title, file_path, field_metadata, document_type_id, signer_count, template_companies(company_id)'
      )
      .eq('id', templateId)
      .is('deleted_at', null)
      .maybeSingle()

    if (!template)
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    const templateSignerCount = typeof (template as Record<string, unknown>).signer_count === 'number'
      ? (template as Record<string, unknown>).signer_count as number
      : 0

    // Validate signer count matches template requirements (when template has declared signers)
    if (templateSignerCount > 0 && signers.length !== templateSignerCount) {
      return NextResponse.json(
        {
          error: `This template requires exactly ${templateSignerCount} signer${templateSignerCount === 1 ? '' : 's'}`,
        },
        { status: 400 }
      )
    }

    const templateFields = parseFieldMetadata(template.field_metadata)
    const merged = mergeCreatorFieldValues({
      templateFields,
      fieldValues: field_values,
    })
    const { valid, missingLabels } = validateCreatorFieldsComplete(merged)
    if (!valid) {
      return NextResponse.json(
        {
          error: 'Missing values for fields',
          missing_labels: missingLabels,
        },
        { status: 400 }
      )
    }

    const service = getServiceClient()
    const { data: pdfBlob, error: dlErr } = await service.storage
      .from('documents')
      .download(template.file_path)

    if (dlErr || !pdfBlob) {
      console.error('Template PDF download:', dlErr)
      return NextResponse.json(
        { error: 'Failed to read template PDF' },
        { status: 500 }
      )
    }

    const pdfBuffer = await pdfBlob.arrayBuffer()
    const documentId = randomUUID()
    const newPath = `${user.id}/${documentId}/original.pdf`

    const { error: upErr } = await service.storage
      .from('documents')
      .upload(newPath, pdfBuffer, { contentType: 'application/pdf' })

    if (upErr) {
      console.error('Document upload from template:', upErr)
      return NextResponse.json(
        { error: 'Failed to create document file' },
        { status: 500 }
      )
    }

    const { data: document, error: docErr } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        title,
        description: description ?? null,
        file_path: newPath,
        uploaded_by: user.id,
        status: 'draft',
        template_id: templateId,
        field_metadata: merged,
      })
      .select()
      .single()

    if (docErr || !document) {
      console.error('Document insert:', docErr)
      await service.storage.from('documents').remove([newPath])
      return NextResponse.json(
        { error: 'Failed to create document' },
        { status: 500 }
      )
    }

    const links = template.template_companies as { company_id: string }[] | null
    if (links?.length) {
      await supabase.from('document_companies').insert(
        links.map((l) => ({
          document_id: documentId,
          company_id: l.company_id,
        }))
      )
    }

    if (template.document_type_id) {
      await supabase.from('document_document_types').insert({
        document_id: documentId,
        document_type_id: template.document_type_id,
      })
    }

    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i]
      const token = randomUUID()
      // Assign signer_index based on position in array (position = slot index)
      const signerIndex = templateSignerCount > 0 ? i : null
      const { error: srErr } = await supabase.from('signature_requests').insert({
        document_id: documentId,
        signer_name: signer.signer_name,
        signer_email: signer.signer_email,
        requested_by: user.id,
        status: 'pending',
        token,
        signer_index: signerIndex,
      })
      if (srErr) {
        console.error('Signature request insert:', srErr)
        return NextResponse.json(
          { error: 'Failed to add signers' },
          { status: 500 }
        )
      }
    }

    await logAudit(user.id, 'document_created_from_template', 'document', documentId, {
      template_id: templateId,
      template_title: template.title,
      signer_count: signers.length,
    })

    if (send_now) {
      const { error: stErr } = await supabase
        .from('documents')
        .update({ status: 'pending' })
        .eq('id', documentId)

      if (stErr) {
        console.error('Document status update:', stErr)
        return NextResponse.json(
          {
            success: true,
            data: { document },
            warning: 'Document created but failed to mark as sent',
          },
          { status: 201 }
        )
      }

      const { data: signatureRequests } = await service
        .from('signature_requests')
        .select('id, signer_name, signer_email, token')
        .eq('document_id', documentId)

      try {
        const config = getConfig()
        for (const sr of signatureRequests ?? []) {
          const signingUrl = `${config.NEXT_PUBLIC_APP_URL}/sign/${sr.token}`
          const { subject, html } = signatureRequestEmail({
            signerName: sr.signer_name,
            documentTitle: title,
            requesterName: user.email ?? 'Document owner',
            signingUrl,
          })
          await sendEmail({ to: sr.signer_email, subject, html })
        }
      } catch (emailError) {
        console.error('Document send emails:', emailError)
      }

      await logAudit(user.id, 'document_sent', 'document', documentId, {
        signer_count: signatureRequests?.length ?? 0,
        from_template: true,
      })
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          document: { ...document, status: send_now ? 'pending' : 'draft' },
        },
      },
      { status: 201 }
    )
  } catch (e) {
    console.error('POST /api/templates/[id]/documents', e)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
