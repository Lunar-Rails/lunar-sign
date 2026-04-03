import { createClient } from '@supabase/supabase-js'
import { getConfig } from '@/lib/config'

let serviceClient: ReturnType<typeof createClient<any>> | null = null

export function getServiceClient() {
  if (!serviceClient) {
    const config = getConfig()

    serviceClient = createClient<any>(
      config.NEXT_PUBLIC_SUPABASE_URL,
      config.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }

  return serviceClient
}
