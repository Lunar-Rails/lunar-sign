import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_ROUTE_PREFIXES = [
  '/login',
  '/auth',
  '/sign',
  '/api/signatures',
  '/api/download',
]

function isPublicRoute(path: string) {
  if (path === '/') return true

  if (
    PUBLIC_ROUTE_PREFIXES.some(
      (route) => path === route || path.startsWith(`${route}/`)
    )
  ) {
    return true
  }

  // PDF preview is guarded in the route handler itself.
  // Skipping proxy auth refresh here avoids client remount loops on /documents/[id].
  return /^\/api\/documents\/[^/]+\/preview\/?$/.test(path)
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const path = request.nextUrl.pathname

  if (isPublicRoute(path)) return supabaseResponse

  // Only run Supabase session refresh if env vars are configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
        Object.entries(headers).forEach(([key, value]) =>
          supabaseResponse.headers.set(key, value)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
