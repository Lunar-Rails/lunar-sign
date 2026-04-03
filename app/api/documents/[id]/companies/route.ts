import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentCompanyIdsSchema } from '@/lib/schemas'
import { logAudit } from '@/lib/audit'
import { canAccessDocument, isMemberOfCompany } from '@/lib/authorization'

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
    const validation = DocumentCompanyIdsSchema.safeParse(body)
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors
      const errorMessage = Object.values(fieldErrors)[0]?.[0] || 'Validation error'
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const uniqueCompanyIds = [...new Set(validation.data.companyIds)]

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
    if (!hasDocumentAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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

      if (membershipChecks.some((hasAccess) => !hasAccess)) {
        return NextResponse.json(
          { error: 'You do not have access to one or more selected companies' },
          { status: 403 }
        )
      }
    }

    const { error: deleteError } = await supabase
      .from('document_companies')
      .delete()
      .eq('document_id', documentId)

    if (deleteError) {
      console.error('Delete document companies error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to update companies' },
        { status: 500 }
      )
    }

    if (uniqueCompanyIds.length > 0) {
      const links = uniqueCompanyIds.map((companyId) => ({
        document_id: documentId,
        company_id: companyId,
      }))
      const { error: insertError } = await supabase
        .from('document_companies')
        .insert(links)

      if (insertError) {
        console.error('Insert document companies error:', insertError)
        return NextResponse.json(
          { error: 'Failed to update companies' },
          { status: 500 }
        )
      }
    }

    await logAudit(user.id, 'document_companies_updated', 'document', documentId, {
      company_ids: uniqueCompanyIds,
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Update document companies API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
