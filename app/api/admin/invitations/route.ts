import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { CreateInvitationSchema } from '@/lib/schemas'
import { logAudit } from '@/lib/audit'

interface InvitationCompanyRow {
  company_id: string
  companies:
    | {
        id: string
        name: string
        slug: string
      }
    | {
        id: string
        name: string
        slug: string
      }[]
    | null
}

function normalizeInvitationEmail(email: string) {
  return email.trim().toLowerCase()
}

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: requesterProfile, error: requesterError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (requesterError || requesterProfile?.role !== 'admin')
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  return { user }
}

function mapInvitationCompanies(rows: InvitationCompanyRow[] | null) {
  if (!rows?.length) return []

  return rows.flatMap((row) => {
    if (!row.companies) return []
    if (Array.isArray(row.companies)) return row.companies
    return [row.companies]
  })
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const serviceClient = getServiceClient()
    const { data, error } = await (serviceClient as any)
      .from('invitations')
      .select(
        'id, email, role, invited_by, status, created_at, invitation_companies(company_id, companies(id, name, slug))'
      )
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch invitations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      )
    }

    const invitations = ((data || []) as any[]).map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      invited_by: row.invited_by,
      status: row.status,
      created_at: row.created_at,
      companies: mapInvitationCompanies(
        (row.invitation_companies as InvitationCompanyRow[] | null) || []
      ),
    }))

    return NextResponse.json({ invitations }, { status: 200 })
  } catch (error) {
    console.error('Admin invitations GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const body = await request.json()
    const parsed = CreateInvitationSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid invitation data' },
        { status: 400 }
      )

    const email = normalizeInvitationEmail(parsed.data.email)
    const uniqueCompanyIds = [...new Set(parsed.data.companyIds)]

    const serviceClient = getServiceClient()

    const { data: pendingInvitation } = await (serviceClient as any)
      .from('invitations')
      .select('id')
      .ilike('email', email)
      .eq('status', 'pending')
      .maybeSingle()

    if (pendingInvitation)
      return NextResponse.json(
        { error: 'A pending invitation already exists for this email' },
        { status: 409 }
      )

    const { data: existingProfile } = await (serviceClient as any)
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle()

    if (existingProfile)
      return NextResponse.json(
        {
          error:
            'This user already exists. Manage their access from the existing users list.',
        },
        { status: 409 }
      )

    if (uniqueCompanyIds.length > 0) {
      const { data: existingCompanies, error: companyError } = await (serviceClient as any)
        .from('companies')
        .select('id')
        .in('id', uniqueCompanyIds)

      if (companyError)
        return NextResponse.json(
          { error: 'Failed to validate selected companies' },
          { status: 500 }
        )

      if ((existingCompanies || []).length !== uniqueCompanyIds.length)
        return NextResponse.json(
          { error: 'One or more selected companies are invalid' },
          { status: 400 }
        )
    }

    const { data: invitation, error: invitationError } = await (serviceClient as any)
      .from('invitations')
      .insert({
        email,
        role: parsed.data.role,
        invited_by: auth.user.id,
      })
      .select('id, email, role, invited_by, status, created_at')
      .single()

    if (invitationError) {
      console.error('Failed to create invitation:', invitationError)
      const isDuplicate = invitationError.code === '23505'
      return NextResponse.json(
        {
          error: isDuplicate
            ? 'A pending invitation already exists for this email'
            : 'Failed to create invitation',
        },
        { status: isDuplicate ? 409 : 500 }
      )
    }

    if (uniqueCompanyIds.length > 0) {
      const invitationCompanies = uniqueCompanyIds.map((companyId) => ({
        invitation_id: invitation.id,
        company_id: companyId,
      }))

      const { error: companiesError } = await (serviceClient as any)
        .from('invitation_companies')
        .insert(invitationCompanies)

      if (companiesError) {
        console.error('Failed to assign invitation companies:', companiesError)
        await (serviceClient as any).from('invitations').delete().eq('id', invitation.id)
        return NextResponse.json(
          { error: 'Failed to assign invitation companies' },
          { status: 500 }
        )
      }
    }

    await logAudit(auth.user.id, 'user_invited', 'invitation', invitation.id, {
      email,
      role: parsed.data.role,
      company_ids: uniqueCompanyIds,
    })

    return NextResponse.json({ invitation }, { status: 201 })
  } catch (error) {
    console.error('Admin invitations POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
