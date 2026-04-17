/**
 * Diagnose OTS confirmation status for all pending signatures.
 * Fetches each proof from Supabase and tries to upgrade it directly
 * (bypassing the cron) to see if Bitcoin has confirmed.
 *
 * Run: pnpm tsx scripts/check-ots-status.ts
 */
import { createClient } from '@supabase/supabase-js'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ots = require('opentimestamps') as typeof import('opentimestamps')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function fromByteaHex(value: string): Buffer {
  const hex = value.startsWith('\\x') ? value.slice(2) : value
  return Buffer.from(hex, 'hex')
}

function readBitcoinBlock(proofBytes: Buffer): number | null {
  try {
    const detached = ots.DetachedTimestampFile.deserialize(proofBytes)
    let block: number | null = null
    detached.timestamp.allAttestations().forEach((att: unknown) => {
      if (att instanceof ots.Notary.BitcoinBlockHeaderAttestation) {
        const h = (att as unknown as { height: number }).height
        if (block === null || h < block) block = h
      }
    })
    return block
  } catch (e) {
    return null
  }
}

async function main() {
  // Fetch all pending signatures with their document info
  const { data: rows, error } = await supabase
    .from('signatures')
    .select('id, signed_at, evidence_mac, ots_proof, ots_bitcoin_block, signature_requests(document_id, signer_name, documents(title))')
    .eq('ots_pending', true)
    .not('ots_proof', 'is', null)
    .order('signed_at', { ascending: true })

  if (error) { console.error('Query failed:', error); process.exit(1) }
  if (!rows?.length) { console.log('No pending signatures with proofs.'); return }

  const hoursAgo = (iso: string) => ((Date.now() - new Date(iso).getTime()) / 3600000).toFixed(1)

  console.log(`\nFound ${rows.length} pending signature(s):\n`)

  for (const row of rows as any[]) {
    const req = row.signature_requests
    console.log(`─── ${row.id}`)
    console.log(`    Document : ${req?.documents?.title ?? '?'}`)
    console.log(`    Signer   : ${req?.signer_name ?? '?'}`)
    console.log(`    Signed   : ${row.signed_at}  (${hoursAgo(row.signed_at)}h ago)`)

    if (!row.ots_proof) {
      console.log(`    OTS proof: MISSING — Phase 1 hasn't run yet`)
      continue
    }

    const proofBuf = fromByteaHex(row.ots_proof as string)

    // Check what block the stored proof already attests (pre-upgrade)
    const storedBlock = readBitcoinBlock(proofBuf)
    console.log(`    Stored proof: ${proofBuf.length} bytes, block in stored proof: ${storedBlock ?? 'none (pending)'}`)

    // Attempt a live upgrade directly from the calendars
    console.log(`    Attempting live upgrade from calendars...`)
    try {
      const detached = ots.DetachedTimestampFile.deserialize(proofBuf)
      await ots.upgrade(detached)
      const upgradedBuf = Buffer.from(detached.serializeToBytes())
      const block = readBitcoinBlock(upgradedBuf)
      if (block !== null) {
        console.log(`    ✅ CONFIRMED at Bitcoin block #${block}`)
        console.log(`    → The cron should pick this up on its next run.`)
        console.log(`       If the cron is running and still shows phase2_pending,`)
        console.log(`       check that the cron is hitting the correct deployment URL.`)
      } else {
        console.log(`    ⏳ Still pending — calendars have not yet produced a Bitcoin attestation.`)
        console.log(`       This is normal within the first 1-6 hours.`)
      }
    } catch (err) {
      console.log(`    ❌ Upgrade attempt failed: ${(err as Error).message}`)
      console.log(`       This could indicate a calendar connectivity issue.`)
    }
    console.log()
  }
}

main().catch((err) => { console.error('FAILED:', err); process.exit(1) })
