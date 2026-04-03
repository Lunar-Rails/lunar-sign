import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AddCompanyMemberSchema } from '@/lib/schemas'
import { logAudit } from '@/lib/audit'

async function ensureAdmin({
  supabase,
  userId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
}) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  return profile?.role === 'admin'
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: companyId } = await params
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = await ensureAdmin({ supabase, userId: user.id })
    if (!isAdmin)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: members, error } = await supabase
      .from('company_members')
      .select(
        `
        company_id,
        user_id,
        created_at,
        profiles:user_id (
          id,
          email,
          full_name
        )
      `
      )
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('List company members error:', error)
      return NextResponse.json(
        { error: 'Failed to load company members' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: { members: members || [] } })
  } catch (error) {
    console.error('List company members API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: companyId } = await params
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = await ensureAdmin({ supabase, userId: user.id })
    if (!isAdmin)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const validation = AddCompanyMemberSchema.safeParse(body)
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors
      const errorMessage = Object.values(fieldErrors)[0]?.[0] || 'Validation error'
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const normalizedEmail = validation.data.email.trim().toLowerCase()

    const [{ data: company }, { data: targetProfile }] = await Promise.all([
      supabase.from('companies').select('id, name').eq('id', companyId).maybeSingle(),
      supabase
        .from('profiles')
        .select('id, email, full_name')
        .ilike('email', normalizedEmail)
        .maybeSingle(),
    ])

    if (!company)
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })

    if (!targetProfile) {
      return NextResponse.json(
        { error: 'User not found in profiles' },
        { status: 404 }
      )
    }

    const { error: upsertError } = await supabase
      .from('company_members')
      .upsert(
        {
          company_id: companyId,
          user_id: targetProfile.id,
        },
        {
          onConflict: 'company_id,user_id',
          ignoreDuplicates: true,
        }
      )

    if (upsertError) {
      console.error('Add company member error:', upsertError)
      return NextResponse.json(
        { error: 'Failed to add member to company' },
        { status: 500 }
      )
    }

    await logAudit(user.id, 'company_member_added', 'company', companyId, {
      member_user_id: targetProfile.id,
      member_email: targetProfile.email,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          member: {
            company_id: companyId,
            user_id: targetProfile.id,
            profiles: {
              id: targetProfile.id,
              email: targetProfile.email,
              full_name: targetProfile.full_name,
            },
          },
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Add company member API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
