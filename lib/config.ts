import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  MAILTRAP_HOST: z.string().min(1),
  MAILTRAP_PORT: z.string().transform(Number).pipe(z.number().int().positive()),
  MAILTRAP_USER: z.string().min(1),
  MAILTRAP_PASSWORD: z.string().min(1),
  EMAIL_FROM: z.string().email(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
})

type EnvConfig = z.infer<typeof envSchema>

let config: EnvConfig | null = null

export function getConfig(): EnvConfig {
  if (!config) {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      MAILTRAP_HOST: process.env.MAILTRAP_HOST,
      MAILTRAP_PORT: process.env.MAILTRAP_PORT,
      MAILTRAP_USER: process.env.MAILTRAP_USER,
      MAILTRAP_PASSWORD: process.env.MAILTRAP_PASSWORD,
      EMAIL_FROM: process.env.EMAIL_FROM,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    })

    if (!result.success) {
      console.error('Invalid environment configuration:', result.error.flatten())
      throw new Error('Invalid environment configuration')
    }

    config = result.data
  }

  return config
}
