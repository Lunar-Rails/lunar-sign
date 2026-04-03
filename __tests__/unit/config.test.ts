import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const baseEnv = () => ({
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'pk',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000/',
  SUPABASE_SERVICE_ROLE_KEY: 'sr',
  MAILTRAP_HOST: 'sandbox.smtp.mailtrap.io',
  MAILTRAP_PORT: '2525',
  MAILTRAP_USER: 'u',
  MAILTRAP_PASSWORD: 'p',
  EMAIL_FROM: 'test@example.com',
})

describe('lib/config', () => {
  beforeEach(() => {
    vi.resetModules()
    const e = baseEnv()
    for (const [k, v] of Object.entries(e)) {
      process.env[k] = v
    }
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('getPublicConfig returns normalized app URL', async () => {
    const { getPublicConfig } = await import('@/lib/config')
    const c = getPublicConfig()
    expect(c.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000')
    expect(c.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co')
  })

  it('getPublicConfig throws when URL missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    const { getPublicConfig } = await import('@/lib/config')
    expect(() => getPublicConfig()).toThrow('Invalid public environment configuration')
  })

  it('getConfig returns mailtrap fields', async () => {
    const { getConfig } = await import('@/lib/config')
    const c = getConfig()
    expect(c.MAILTRAP_PORT).toBe(2525)
    expect(c.EMAIL_FROM).toBe('test@example.com')
  })

  it('getConfig throws on invalid MAILTRAP_PORT', async () => {
    process.env.MAILTRAP_PORT = 'not-a-number'
    const { getConfig } = await import('@/lib/config')
    expect(() => getConfig()).toThrow('Invalid environment configuration')
  })
})
