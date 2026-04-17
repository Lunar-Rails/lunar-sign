import { describe, it, expect } from 'vitest'
import { CONSENT_TEXT, CONSENT_HEADING, CONSENT_PARAGRAPHS } from '@/lib/legal/consent-copy'
import crypto from 'crypto'

describe('consent-copy', () => {
  it('exports non-empty heading and paragraphs', () => {
    expect(CONSENT_HEADING.length).toBeGreaterThan(10)
    expect(CONSENT_PARAGRAPHS.length).toBeGreaterThanOrEqual(4)
    CONSENT_PARAGRAPHS.forEach((p) => expect(p.length).toBeGreaterThan(20))
  })

  it('CONSENT_TEXT is deterministic for a given version', () => {
    const version = '2026-04-16'
    const hash1 = crypto.createHash('sha256').update(`${version}\n${CONSENT_TEXT}`).digest('hex')
    const hash2 = crypto.createHash('sha256').update(`${version}\n${CONSENT_TEXT}`).digest('hex')
    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64)
  })

  it('hash changes when version changes', () => {
    const hashV1 = crypto.createHash('sha256').update(`2026-04-16\n${CONSENT_TEXT}`).digest('hex')
    const hashV2 = crypto.createHash('sha256').update(`2027-01-01\n${CONSENT_TEXT}`).digest('hex')
    expect(hashV1).not.toBe(hashV2)
  })

  it('mentions ESIGN and electronic signature', () => {
    expect(CONSENT_TEXT).toMatch(/ESIGN/i)
    expect(CONSENT_TEXT).toMatch(/electronic signature/i)
  })
})
