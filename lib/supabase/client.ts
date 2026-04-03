import { createBrowserClient } from '@supabase/ssr'
import { getConfig } from '@/lib/config'

export function createClient() {
  const config = getConfig()

  return createBrowserClient(
    config.NEXT_PUBLIC_SUPABASE_URL,
    config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
}
