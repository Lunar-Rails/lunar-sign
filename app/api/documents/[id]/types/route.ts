import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentTypeNamesSchema } from '@/lib/schemas'
import { logAudit } from '@/lib/audit'
import { canAccessDocument } from '@/lib/authorization'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: documentId } = await params
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const validation = DocumentTypeNamesSchema.safeParse(body)
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors
      const errorMessage = Object.values(fieldErrors)[0]?.[0] || 'Validation error'
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const uniqueTypeNames = Array.from(
      new Map(
        validation.data.typeNames.map((typeName) => [typeName.toLowerCase(), typeName])
      ).values()
    )

    const { data: document } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .maybeSingle()

    if (!document)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    const hasDocumentAccess = await canAccessDocument({
      supabase,
      userId: user.id,
      documentId,
    })
    if (!hasDocumentAccess)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

    const { error: deleteError } = await supabase
      .from('document_document_types')
      .delete()
      .eq('document_id', documentId)

    if (deleteError) {
      console.error('Delete document types error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to update document types' },
        { status: 500 }
      )
    }

    if (resolvedTypeIds.length > 0) {
      const links = resolvedTypeIds.map((documentTypeId) => ({
        document_id: documentId,
        document_type_id: documentTypeId,
      }))
      const { error: insertError } = await supabase
        .from('document_document_types')
        .insert(links)

      if (insertError) {
        console.error('Insert document types error:', insertError)
        return NextResponse.json(
          { error: 'Failed to update document types' },
          { status: 500 }
        )
      }
    }

    await logAudit(user.id, 'document_types_updated', 'document', documentId, {
      document_type_names: uniqueTypeNames,
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Update document types API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
