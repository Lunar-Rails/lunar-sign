import { createBrowserClient } from '@supabase/ssr'
import { getPublicConfig } from '@/lib/config'

export function createClient() {
  const config = getPublicConfig()

  return createBrowserClient(
    config.NEXT_PUBLIC_SUPABASE_URL,
    config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
}
