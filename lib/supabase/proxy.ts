import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getConfig } from '@/lib/config'

export async function updateSession() {
  const config = getConfig()
  const cookieStore = await cookies()

  const supabase = createServerClient(
    config.NEXT_PUBLIC_SUPABASE_URL,
    config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore cookie setting errors
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return supabase
}
