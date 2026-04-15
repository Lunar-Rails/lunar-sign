import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

import { logAudit } from '@/lib/audit'
import { isMemberOfCompany } from '@/lib/authorization'
import { createClient } from '@/lib/supabase/server'
import {
  DocumentCompanyIdsSchema,
  DocumentUploadSchema,
  FieldMetadataSchema,
} from '@/lib/schemas'
import type { StoredField } from '@/lib/types'
import { validateSignerFieldAssignments } from '@/lib/field-metadata'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const companySlug = searchParams.get('company')
    const documentTypeId = searchParams.get('document_type_id')
    const q = searchParams.get('q')?.trim().toLowerCase() ?? ''

    let companyId: string | null = null
    if (companySlug) {
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('slug', companySlug)
        .maybeSingle()
      companyId = company?.id ?? null
    }

    const { data: rows, error } = await supabase
      .from('templates')
      .select(
        `
        id,
        title,
        description,
        document_type_id,
        file_path,
        field_metadata,
        created_by,
        created_at,
        updated_at,
        document_types(id, name),
        template_companies(company_id)
      `
      )
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Templates list error:', error)
      return NextResponse.json(
        { error: 'Failed to list templates' },
        { status: 500 }
      )
    }

    let list = rows ?? []

    if (companyId) {
      list = list.filter((row) => {
        const links = row.template_companies as { company_id: string }[] | null
        return (links ?? []).some((l) => l.company_id === companyId)
      })
    }

    if (documentTypeId) {
      list = list.filter((row) => row.document_type_id === documentTypeId)
    }

    if (q) {
      list = list.filter((row) => row.title.toLowerCase().includes(q))
    }

    const data = list.map((row) => {
      const meta = row.field_metadata as StoredField[] | null
      const fieldCount = Array.isArray(meta) ? meta.length : 0
      const signerCount = Array.isArray(meta)
        ? meta.filter((f) => f.forSigner).length
        : 0
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        document_type_id: row.document_type_id,
        document_type: row.document_types,
        created_at: row.created_at,
        updated_at: row.updated_at,
        field_count: fieldCount,
        signer_field_count: signerCount,
        template_companies: row.template_companies,
      }
    })

    return NextResponse.json({ success: true, data: { templates: data } })
  } catch (e) {
    console.error('GET /api/templates', e)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function missingSignerFieldsMessage(missingSignerIndexes: number[]): string {
  if (missingSignerIndexes.length === 1) {
    return `Assign at least one field to Signer ${missingSignerIndexes[0] + 1} before saving the template`
  }

  const labels = missingSignerIndexes.map((index) => `Signer ${index + 1}`)
  const head = labels.slice(0, -1).join(', ')
  const tail = labels[labels.length - 1]
  return `Assign at least one field to ${head} and ${tail} before saving the template`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const title = formData.get('title') as string
    const description = (formData.get('description') as string) || ''
    const file = formData.get('file') as File | null
    const fieldMetadataRaw = formData.get('field_metadata') as string | null
    const documentTypeIdRaw = formData.get('document_type_id') as string | null

    const companyIdsInput = formData
      .getAll('companyIds')
      .filter((v): v is string => typeof v === 'string')
    const signerCountRaw = formData.get('signer_count') as string | null
    const signerCount = signerCountRaw ? Math.min(2, Math.max(1, parseInt(signerCountRaw, 10) || 1)) : 1

    const titleValidation = DocumentUploadSchema.safeParse({
      title,
      description: description || null,
    })
    if (!titleValidation.success) {
      const err = titleValidation.error.flatten().fieldErrors
      const msg = Object.values(err)[0]?.[0] || 'Validation error'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const companyValidation = DocumentCompanyIdsSchema.safeParse({
      companyIds: companyIdsInput,
    })
    if (!companyValidation.success)
      return NextResponse.json(
        { error: 'Invalid company selection' },
        { status: 400 }
      )

    if (!file || file.type !== 'application/pdf')
      return NextResponse.json(
        { error: 'A PDF file is required' },
        { status: 400 }
      )

    if (file.size > 50 * 1024 * 1024)
      return NextResponse.json(
        { error: 'File must be smaller than 50MB' },
        { status: 400 }
      )

    let fieldMetadata: StoredField[] = []
    if (fieldMetadataRaw) {
      let parsed: unknown
      try {
        parsed = JSON.parse(fieldMetadataRaw)
      } catch {
        return NextResponse.json(
          { error: 'Invalid field_metadata JSON' },
          { status: 400 }
        )
      }
      const fm = FieldMetadataSchema.safeParse(parsed)
      if (!fm.success)
        return NextResponse.json(
          { error: 'Invalid field_metadata shape' },
          { status: 400 }
        )
      fieldMetadata = fm.data
    }

    const signerFieldValidation = validateSignerFieldAssignments(fieldMetadata, signerCount)
    if (!signerFieldValidation.valid) {
      return NextResponse.json(
        {
          error: missingSignerFieldsMessage(signerFieldValidation.missingSignerIndexes),
          missing_signer_indexes: signerFieldValidation.missingSignerIndexes,
        },
        { status: 400 }
      )
    }

    const uniqueCompanyIds = [...new Set(companyValidation.data.companyIds)]

    for (const companyId of uniqueCompanyIds) {
      const ok = await isMemberOfCompany({ supabase, userId: user.id, companyId })
      if (!ok)
        return NextResponse.json(
          { error: 'You do not have access to one or more selected companies' },
          { status: 403 }
        )
    }

    let documentTypeId: string | null = null
    if (documentTypeIdRaw && documentTypeIdRaw.trim()) {
      const uuid = documentTypeIdRaw.trim()
      const { data: dt } = await supabase
        .from('document_types')
        .select('id')
        .eq('id', uuid)
        .maybeSingle()
      if (!dt)
        return NextResponse.json(
          { error: 'Document type not found' },
          { status: 400 }
        )
      documentTypeId = dt.id
    }

    const templateId = randomUUID()
    const filePath = `templates/${user.id}/${templateId}/original.pdf`
    const buffer = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, { contentType: 'application/pdf' })

    if (uploadError) {
      console.error('Template upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload template PDF' },
        { status: 500 }
      )
    }

    const { data: template, error: insertError } = await supabase
      .from('templates')
      .insert({
        id: templateId,
        title: titleValidation.data.title,
        description: titleValidation.data.description ?? null,
        document_type_id: documentTypeId,
        file_path: filePath,
        field_metadata: fieldMetadata,
        signer_count: signerCount,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError || !template) {
      console.error('Template insert error:', insertError)
      await supabase.storage.from('documents').remove([filePath])
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      )
    }

    if (uniqueCompanyIds.length > 0) {
      const { error: linkError } = await supabase.from('template_companies').insert(
        uniqueCompanyIds.map((company_id) => ({
          template_id: templateId,
          company_id,
        }))
      )
      if (linkError) {
        console.error('template_companies error:', linkError)
        await supabase.from('templates').delete().eq('id', templateId)
        await supabase.storage.from('documents').remove([filePath])
        return NextResponse.json(
          { error: 'Failed to link companies' },
          { status: 500 }
        )
      }
    }

    await logAudit(user.id, 'template_created', 'template', templateId, {
      title: template.title,
      company_ids: uniqueCompanyIds,
    })

    return NextResponse.json(
      { success: true, data: { template } },
      { status: 201 }
    )
  } catch (e) {
    console.error('POST /api/templates', e)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
