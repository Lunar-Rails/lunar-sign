import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getServiceClient } from '@/lib/supabase/service'

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
  }

  return redirectResponse
}
