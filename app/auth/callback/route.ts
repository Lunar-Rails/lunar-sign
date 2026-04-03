import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'

interface InvitationRow {
  id: string
  role: 'admin' | 'member'
}

interface InvitationCompanyRow {
  company_id: string
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!supabaseUrl || !supabaseKey)
    return NextResponse.redirect(
      new URL('/login?error=missing-supabase-config', request.url)
    )

  if (!code)
    return NextResponse.redirect(
      new URL('/login?error=auth-code-error', request.url)
    )

  const redirectResponse = NextResponse.redirect(
    new URL('/dashboard', request.url)
  )

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          redirectResponse.cookies.set(name, value, options)
        })
        Object.entries(headers).forEach(([key, value]) =>
          redirectResponse.headers.set(key, value)
        )
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error)
    return NextResponse.redirect(
      new URL('/login?error=auth-code-error', request.url)
    )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.id && user.email) {
    const serviceClient = getServiceClient()

    await serviceClient.from('profiles').upsert(
      {
        id: user.id,
        email: user.email,
        full_name:
          user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
      },
      { onConflict: 'id' }
    )

    const { data: invitationRaw, error: invitationError } = await serviceClient
      .from('invitations')
      .select('id, role')
      .ilike('email', user.email.toLowerCase())
      .eq('status', 'pending')
      .maybeSingle()

    const invitation = invitationRaw as InvitationRow | null

    if (invitationError) {
      console.error('Failed to load invitation:', invitationError)
      return redirectResponse
    }

    if (invitation) {
      const { error: roleUpdateError } = await serviceClient
        .from('profiles')
        .update({ role: invitation.role })
        .eq('id', user.id)

      if (roleUpdateError) {
        console.error('Failed to apply invitation role:', roleUpdateError)
        return redirectResponse
      }

      const { data: invitationCompaniesRaw, error: invitationCompaniesError } =
        await serviceClient
          .from('invitation_companies')
          .select('company_id')
          .eq('invitation_id', invitation.id)

      if (invitationCompaniesError) {
        console.error(
          'Failed to load invitation companies:',
          invitationCompaniesError
        )
        return redirectResponse
      }

      const invitationCompanies =
        (invitationCompaniesRaw ?? []) as InvitationCompanyRow[]

      const companyMemberships = invitationCompanies.map((row) => ({
        company_id: row.company_id,
        user_id: user.id,
      }))

      if (companyMemberships.length > 0) {
        const { error: membershipError } = await serviceClient
          .from('company_members')
          .upsert(companyMemberships, {
            onConflict: 'company_id,user_id',
          })

        if (membershipError) {
          console.error('Failed to apply invitation memberships:', membershipError)
          return redirectResponse
        }
      }

      const { error: invitationStatusError } = await serviceClient
        .from('invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id)
        .eq('status', 'pending')

      if (invitationStatusError) {
        console.error('Failed to mark invitation as accepted:', invitationStatusError)
        return redirectResponse
      }

      await logAudit(user.id, 'invitation_accepted', 'invitation', invitation.id, {
        email: user.email.toLowerCase(),
        role: invitation.role,
        company_ids: companyMemberships.map((m) => m.company_id),
      })
    }
  }

  return redirectResponse
}
