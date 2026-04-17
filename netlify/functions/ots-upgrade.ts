/**
 * Netlify Scheduled Function — OTS upgrade worker.
 *
 * Runs every 30 minutes. Calls the internal /api/internal/ots/upgrade
 * Next.js route which handles both:
 *   Phase 1 — initial OTS stamp submission for new signatures
 *   Phase 2 — upgrade of pending proofs once Bitcoin confirms (~1h)
 *
 * Vercel migration: delete this file, add to vercel.json:
 *   { "crons": [{ "path": "/api/internal/ots/upgrade", "schedule": "*/30 * * * *" }] }
 *   and replace x-cron-secret check with Authorization: Bearer ${CRON_SECRET}.
 */

import type { Config } from '@netlify/functions'

export default async (): Promise<Response> => {
  const appUrl = process.env.URL ?? process.env.NEXT_PUBLIC_APP_URL
  const secret = process.env.OTS_CRON_SECRET

  if (!appUrl) {
    console.error('[ots-upgrade] URL env var not set')
    return new Response('URL not set', { status: 500 })
  }

  if (!secret) {
    console.error('[ots-upgrade] OTS_CRON_SECRET not set')
    return new Response('OTS_CRON_SECRET not set', { status: 500 })
  }

  const endpoint = `${appUrl}/api/internal/ots/upgrade`

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-cron-secret': secret,
        'content-type': 'application/json',
      },
      body: '{}',
    })

    const text = await res.text()
    console.log(`[ots-upgrade] upstream ${res.status}: ${text}`)
    return new Response(`upstream ${res.status}`, { status: res.ok ? 200 : res.status })
  } catch (err) {
    console.error('[ots-upgrade] fetch error:', err)
    return new Response('fetch error', { status: 500 })
  }
}

export const config: Config = {
  schedule: '*/30 * * * *',
}
