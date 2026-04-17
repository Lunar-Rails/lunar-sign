import crypto from 'crypto'

/** Generate a cryptographically-random 6-digit OTP (zero-padded). */
export function generateOtpCode(): string {
  // Use 3 bytes → 0-16777215, mod 1_000_000 → 0-999999.
  // Rejection-sampling not needed: bias is negligible at 1M range over 16M.
  const bytes = crypto.randomBytes(3)
  const num = bytes.readUIntBE(0, 3) % 1_000_000
  return String(num).padStart(6, '0')
}

/**
 * Hash an OTP code tied to a specific request.
 * Storing a salted hash means leaking the `signing_otps` table reveals nothing.
 */
export function hashOtpCode(requestId: string, code: string): string {
  return crypto
    .createHash('sha256')
    .update(`${requestId}:${code}`)
    .digest('hex')
}

/** Compute constant-time equality of two strings (for hash comparison). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export const OTP_TTL_MINUTES = 15
export const OTP_MAX_ATTEMPTS = 5
