interface RateLimitOptions {
  windowMs: number
  max: number
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
}

const cache = new Map<string, RateLimitEntry>()

export function rateLimit({ windowMs, max }: RateLimitOptions) {
  function check(key: string): RateLimitResult {
    const now = Date.now()
    const entry = cache.get(key)

    if (!entry || entry.resetAt <= now) {
      cache.set(key, { count: 1, resetAt: now + windowMs })
      return { success: true, remaining: max - 1 }
    }

    if (entry.count >= max)
      return { success: false, remaining: 0 }

    entry.count += 1
    cache.set(key, entry)

    return { success: true, remaining: Math.max(max - entry.count, 0) }
  }

  return { check }
}
