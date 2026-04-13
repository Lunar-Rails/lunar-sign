import { NextRequest, NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit'
import { canAccessTemplate, isMemberOfCompany } from '@/lib/authorization'
import { createClient } from '@/lib/supabase/server'
import { TemplateUpdateBodySchema } from '@/lib/schemas'

export async function GET(
  _request: NextRequest,
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

    const { data: template } = await supabase
      .from('templates')
      .select(
        `
        *,
        document_types(id, name),
        template_companies(company_id, companies(id, name, slug))
      `
      )
      .eq('id', templateId)
      .is('deleted_at', null)
      .maybeSingle()

    if (!template)
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    const ok = await canAccessTemplate({
      supabase,
      userId: user.id,
      templateId,
    })
    if (!ok)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    return NextResponse.json({ success: true, data: { template } })
  } catch (e) {
    console.error('GET /api/templates/[id]', e)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    const ok = await canAccessTemplate({
      supabase,
      userId: user.id,
      templateId,
    })
    if (!ok)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const parsed = TemplateUpdateBodySchema.safeParse(body)
    if (!parsed.success) {
      const err = parsed.error.flatten().fieldErrors
      const msg = Object.values(err)[0]?.[0] || 'Validation error'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const patch = parsed.data
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (patch.title !== undefined) updates.title = patch.title
    if (patch.description !== undefined) updates.description = patch.description
    if (patch.document_type_id !== undefined)
      updates.document_type_id = patch.document_type_id
    if (patch.field_metadata !== undefined)
      updates.field_metadata = patch.field_metadata
    if (patch.signer_count !== undefined)
      updates.signer_count = patch.signer_count

    if (Object.keys(updates).length > 1) {
      const { error: upErr } = await supabase
        .from('templates')
        .update(updates)
        .eq('id', templateId)
        .is('deleted_at', null)

      if (upErr) {
        console.error('Template update error:', upErr)
        return NextResponse.json(
          { error: 'Failed to update template' },
          { status: 500 }
        )
      }
    }

    if (patch.companyIds !== undefined) {
      const unique = [...new Set(patch.companyIds)]
      for (const companyId of unique) {
        const member = await isMemberOfCompany({
          supabase,
          userId: user.id,
          companyId,
        })
        if (!member)
          return NextResponse.json(
            { error: 'You do not have access to one or more companies' },
            { status: 403 }
          )
      }

      await supabase.from('template_companies').delete().eq('template_id', templateId)
      if (unique.length > 0) {
        await supabase.from('template_companies').insert(
          unique.map((company_id) => ({ template_id: templateId, company_id }))
        )
      }
    }

    const { data: template } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single()

    await logAudit(user.id, 'template_updated', 'template', templateId, {
      keys: Object.keys(patch),
    })

    return NextResponse.json({ success: true, data: { template } })
  } catch (e) {
    console.error('PUT /api/templates/[id]', e)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
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

    const ok = await canAccessTemplate({
      supabase,
      userId: user.id,
      templateId,
    })
    if (!ok)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: existing } = await supabase
      .from('templates')
      .select('id, title')
      .eq('id', templateId)
      .is('deleted_at', null)
      .maybeSingle()

    if (!existing)
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    const { error } = await supabase
      .from('templates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', templateId)

    if (error) {
      console.error('Template soft delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      )
    }

    await logAudit(user.id, 'template_deleted', 'template', templateId, {
      title: existing.title,
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/templates/[id]', e)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
