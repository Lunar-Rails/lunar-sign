import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'

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
    await (serviceClient as any).from('profiles').upsert(
      {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
      },
      { onConflict: 'id' }
    )

    const { data: invitation, error: invitationError } = await (serviceClient as any)
      .from('invitations')
      .select('id, role')
      .ilike('email', user.email.toLowerCase())
      .eq('status', 'pending')
      .maybeSingle()

    if (invitationError) {
      console.error('Failed to load invitation:', invitationError)
      return redirectResponse
    }

    if (invitation) {
      const { error: roleUpdateError } = await (serviceClient as any)
        .from('profiles')
        .update({ role: invitation.role })
        .eq('id', user.id)

      if (roleUpdateError) {
        console.error('Failed to apply invitation role:', roleUpdateError)
        return redirectResponse
      }

      const { data: invitationCompanies, error: invitationCompaniesError } = await (
        serviceClient as any
      )
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

      const companyMemberships = (invitationCompanies || []).map(
        (row: { company_id: string }) => ({
          company_id: row.company_id,
          user_id: user.id,
        })
      ) as { company_id: string; user_id: string }[]

      if (companyMemberships.length > 0) {
        const { error: membershipError } = await (serviceClient as any)
          .from('company_members')
          .upsert(companyMemberships, {
            onConflict: 'company_id,user_id',
          })

        if (membershipError) {
          console.error('Failed to apply invitation memberships:', membershipError)
          return redirectResponse
        }
      }

      const { error: invitationStatusError } = await (serviceClient as any)
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
        company_ids: companyMemberships.map(
          (membership: { company_id: string }) => membership.company_id
        ),
      })
    }
  }

  return redirectResponse
}
