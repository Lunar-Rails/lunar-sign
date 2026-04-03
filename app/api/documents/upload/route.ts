import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  DocumentCompanyIdsSchema,
  DocumentTypeNamesSchema,
  DocumentUploadSchema,
} from '@/lib/schemas'
import { logAudit } from '@/lib/audit'
import { isMemberOfCompany } from '@/lib/authorization'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const file = formData.get('file') as File
    const companyIdsInput = formData
      .getAll('companyIds')
      .filter((value): value is string => typeof value === 'string')
    const typeNamesInput = formData
      .getAll('typeNames')
      .filter((value): value is string => typeof value === 'string')

    // Validate
    const validation = DocumentUploadSchema.safeParse({
      title,
      description: description || null,
    })

    if (!validation.success) {
      const firstError = validation.error.flatten().fieldErrors
      const errorMessage = Object.values(firstError)[0]?.[0] || 'Validation error'
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    const companyValidation = DocumentCompanyIdsSchema.safeParse({
      companyIds: companyIdsInput,
    })
    if (!companyValidation.success) {
      return NextResponse.json(
        { error: 'Invalid company selection' },
        { status: 400 }
      )
    }
    const typeValidation = DocumentTypeNamesSchema.safeParse({
      typeNames: typeNamesInput,
    })
    if (!typeValidation.success)
      return NextResponse.json(
        { error: 'Invalid document type selection' },
        { status: 400 }
      )

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      )
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File must be smaller than 50MB' },
        { status: 400 }
      )
    }

    // Generate document ID
    const documentId = randomUUID()
    const uniqueCompanyIds = [...new Set(companyValidation.data.companyIds)]
    const uniqueTypeNames = Array.from(
      new Map(
        typeValidation.data.typeNames.map((typeName) => [typeName.toLowerCase(), typeName])
      ).values()
    )

    if (uniqueCompanyIds.length > 0) {
      const { data: matchedCompanies, error: companyLookupError } = await supabase
        .from('companies')
        .select('id')
        .in('id', uniqueCompanyIds)

      if (companyLookupError) {
        console.error('Company lookup error:', companyLookupError)
        return NextResponse.json(
          { error: 'Failed to validate company selection' },
          { status: 500 }
        )
      }

      if ((matchedCompanies || []).length !== uniqueCompanyIds.length) {
        return NextResponse.json(
          { error: 'Some selected companies do not exist' },
          { status: 400 }
        )
      }

      const membershipChecks = await Promise.all(
        uniqueCompanyIds.map((companyId) =>
          isMemberOfCompany({ supabase, userId: user.id, companyId })
        )
      )

      const hasUnauthorizedCompany = membershipChecks.some(
        (hasAccess) => !hasAccess
      )
      if (hasUnauthorizedCompany) {
        return NextResponse.json(
          { error: 'You do not have access to one or more selected companies' },
          { status: 403 }
        )
      }
    }

    const resolvedTypeIds: string[] = []
    for (const typeName of uniqueTypeNames) {
      const { data: existingType, error: existingTypeError } = await supabase
        .from('document_types')
        .select('id')
        .ilike('name', typeName)
        .maybeSingle()

      if (existingTypeError) {
        console.error('Document type lookup error:', existingTypeError)
        return NextResponse.json(
          { error: 'Failed to validate document type selection' },
          { status: 500 }
        )
      }

      if (existingType) {
        resolvedTypeIds.push(existingType.id)
        continue
      }

      const { data: createdType, error: createdTypeError } = await supabase
        .from('document_types')
        .insert({
          name: typeName,
          created_by: user.id,
        })
        .select('id')
        .single()

      if (!createdTypeError && createdType) {
        resolvedTypeIds.push(createdType.id)
        continue
      }

      const isDuplicateType = createdTypeError?.code === '23505'
      if (!isDuplicateType) {
        console.error('Document type insert error:', createdTypeError)
        return NextResponse.json(
          { error: 'Failed to create document type' },
          { status: 500 }
        )
      }

      const { data: duplicateType, error: duplicateLookupError } = await supabase
        .from('document_types')
        .select('id')
        .ilike('name', typeName)
        .maybeSingle()

      if (duplicateLookupError || !duplicateType) {
        console.error('Duplicate document type lookup error:', duplicateLookupError)
        return NextResponse.json(
          { error: 'Failed to resolve document type' },
          { status: 500 }
        )
      }

      resolvedTypeIds.push(duplicateType.id)
    }

    // Upload to storage
    const fileBuffer = await file.arrayBuffer()
    const fileName = `documents/${user.id}/${documentId}/original.pdf`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, fileBuffer, {
        contentType: 'application/pdf',
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Create document record
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        title,
        description: description || null,
        file_path: fileName,
        uploaded_by: user.id,
        status: 'draft',
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to create document' },
        { status: 500 }
      )
    }

    if (uniqueCompanyIds.length > 0) {
      const companyLinks = uniqueCompanyIds.map((companyId) => ({
        document_id: documentId,
        company_id: companyId,
      }))

      const { error: documentCompaniesError } = await supabase
        .from('document_companies')
        .insert(companyLinks)

      if (documentCompaniesError) {
        console.error('Document companies insert error:', documentCompaniesError)
        return NextResponse.json(
          { error: 'Document created but failed to assign companies' },
          { status: 500 }
        )
      }
    }

    if (resolvedTypeIds.length > 0) {
      const typeLinks = resolvedTypeIds.map((documentTypeId) => ({
        document_id: documentId,
        document_type_id: documentTypeId,
      }))

      const { error: documentTypesError } = await supabase
        .from('document_document_types')
        .insert(typeLinks)

      if (documentTypesError) {
        console.error('Document types insert error:', documentTypesError)
        return NextResponse.json(
          { error: 'Document created but failed to assign document types' },
          { status: 500 }
        )
      }
    }

    // Log audit
    await logAudit(user.id, 'document_uploaded', 'document', documentId, {
      title,
      fileName: file.name,
      company_ids: uniqueCompanyIds,
      document_type_names: uniqueTypeNames,
    })

    return NextResponse.json(
      {
        success: true,
        data: { document },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
