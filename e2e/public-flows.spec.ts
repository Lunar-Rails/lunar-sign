import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { expect, test } from '@playwright/test'

function readFixtures(): { ready: boolean; signToken?: string; downloadToken?: string } {
  const p = join(__dirname, '.fixtures.json')
  if (!existsSync(p)) return { ready: false }
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as {
      ready: boolean
      signToken?: string
      downloadToken?: string
    }
  } catch {
    return { ready: false }
  }
}

test.describe('public flows (unauthenticated)', () => {
  test('sign page loads with seeded document title', async ({ page }) => {
    const f = readFixtures()
    test.skip(!f.ready || !f.signToken, 'E2E fixtures missing — run with .env.local and Supabase')
    await page.goto(`/sign/${f.signToken}`)
    await expect(page.getByText('[E2E] Signing')).toBeVisible()
  })

  test('download API redirects for completed document token', async ({ request }) => {
    const f = readFixtures()
    test.skip(!f.ready || !f.downloadToken, 'E2E fixtures missing — run with .env.local and Supabase')
    const res = await request.get(`/api/download/${f.downloadToken}`, {
      maxRedirects: 0,
    })
    expect([302, 307]).toContain(res.status())
  })
})
