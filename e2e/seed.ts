import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

const DOC_SIGN = 'e2e00001-0000-4000-8000-000000000001'
const DOC_DL = 'e2e00002-0000-4000-8000-000000000002'
const REQ_SIGN = 'e2e00003-0000-4000-8000-000000000003'
const REQ_DL = 'e2e00004-0000-4000-8000-000000000004'
const SIGN_TOKEN = 'e1e0e0e0-e0e0-40e0-80e0-e0e0e0e0e0e1'
const DOWNLOAD_TOKEN = 'e1e0e0e0-e0e0-40e0-80e0-e0e0e0e0e0e2'

function loadEnvLocal() {
  const p = join(process.cwd(), '.env.local')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    )
      val = val.slice(1, -1)
    if (process.env[key] === undefined) process.env[key] = val
  }
}

function writeFixtures(payload: Record<string, unknown>) {
  writeFileSync(join(__dirname, '.fixtures.json'), JSON.stringify(payload, null, 2))
}

/**
 * Playwright global setup: seed Supabase with two documents (pending sign + completed download).
 * Writes `e2e/.fixtures.json` for tests. On failure, writes `{ ready: false }` so tests skip.
 */
export default async function globalSetup() {
  loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.warn('[e2e] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — skipping seed')
    writeFixtures({ ready: false })
    return
  }

  const supabase = createClient(url, key)
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')

  try {
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (profErr || !profiles?.length) {
      console.warn('[e2e] No profiles row — skipping seed (need at least one signed-up user)')
      writeFixtures({ ready: false })
      return
    }

    const uploadedBy = profiles[0].id

    await supabase.from('signature_requests').delete().in('id', [REQ_SIGN, REQ_DL])
    await supabase.from('documents').delete().in('id', [DOC_SIGN, DOC_DL])

    const origSignPath = `e2e/${DOC_SIGN}/original.pdf`
    const origDlPath = `e2e/${DOC_DL}/original.pdf`
    const signedPath = `e2e/${DOC_DL}/signed.pdf`

    const { error: up1 } = await supabase.storage
      .from('documents')
      .upload(origSignPath, pdf, { contentType: 'application/pdf', upsert: true })
    if (up1) throw up1

    const { error: up2 } = await supabase.storage
      .from('documents')
      .upload(origDlPath, pdf, { contentType: 'application/pdf', upsert: true })
    if (up2) throw up2

    const { error: up3 } = await supabase.storage
      .from('signed-documents')
      .upload(signedPath, pdf, { contentType: 'application/pdf', upsert: true })
    if (up3) throw up3

    const { error: d1 } = await supabase.from('documents').insert({
      id: DOC_SIGN,
      title: '[E2E] Signing',
      description: null,
      file_path: origSignPath,
      uploaded_by: uploadedBy,
      status: 'pending',
    })
    if (d1) throw d1

    const { error: d2 } = await supabase.from('documents').insert({
      id: DOC_DL,
      title: '[E2E] Download',
      description: null,
      file_path: origDlPath,
      uploaded_by: uploadedBy,
      status: 'completed',
      latest_signed_pdf_path: signedPath,
      completed_at: new Date().toISOString(),
    })
    if (d2) throw d2

    const { error: s1 } = await supabase.from('signature_requests').insert({
      id: REQ_SIGN,
      document_id: DOC_SIGN,
      signer_name: 'E2E Signer',
      signer_email: 'e2e-signer@example.com',
      requested_by: uploadedBy,
      status: 'pending',
      token: SIGN_TOKEN,
    })
    if (s1) throw s1

    const { error: s2 } = await supabase.from('signature_requests').insert({
      id: REQ_DL,
      document_id: DOC_DL,
      signer_name: 'E2E Downloader',
      signer_email: 'e2e-dl@example.com',
      requested_by: uploadedBy,
      status: 'signed',
      token: DOWNLOAD_TOKEN,
    })
    if (s2) throw s2

    writeFixtures({
      ready: true,
      signToken: SIGN_TOKEN,
      downloadToken: DOWNLOAD_TOKEN,
    })
    console.log('[e2e] Seed OK — fixtures written')
  } catch (e) {
    console.warn('[e2e] Seed failed:', e)
    writeFixtures({ ready: false })
  }
}
