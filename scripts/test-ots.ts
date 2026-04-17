/**
 * Smoke test for OpenTimestamps integration.
 * Run: pnpm tsx scripts/test-ots.ts
 *
 * Phase 1: stamp a fake hash on the public calendars (returns pending proof).
 * Phase 2: immediately try to upgrade (will be pending — Bitcoin needs ~1-6h).
 */
import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ots = require('opentimestamps') as typeof import('opentimestamps')

const CALENDARS = [
  'https://alice.btc.calendar.opentimestamps.org',
  'https://bob.btc.calendar.opentimestamps.org',
  'https://finney.calendar.eternitywall.com',
]

function readBitcoinBlock(proofBytes: Buffer): number | null {
  const detached = ots.DetachedTimestampFile.deserialize(proofBytes)
  let block: number | null = null
  detached.timestamp.allAttestations().forEach((att: unknown) => {
    if (att instanceof ots.Notary.BitcoinBlockHeaderAttestation) {
      const h = (att as unknown as { height: number }).height
      if (block === null || h < block) block = h
    }
  })
  return block
}

async function main() {
  const fakeHash = crypto.randomBytes(32).toString('hex')
  console.log('hash:', fakeHash)

  console.log('\n[1] stamping on calendars...')
  const t0 = Date.now()
  const detached = ots.DetachedTimestampFile.fromHash(
    new ots.Ops.OpSHA256(),
    Buffer.from(fakeHash, 'hex')
  )
  await ots.stamp(detached, { calendars: CALENDARS })
  const proof = Buffer.from(detached.serializeToBytes())
  console.log(`    proof bytes: ${proof.length}  (${Date.now() - t0}ms)`)
  console.log(`    bitcoin block in proof: ${readBitcoinBlock(proof)} (expected: null)`)

  console.log('\n[2] attempting immediate upgrade...')
  const detached2 = ots.DetachedTimestampFile.deserialize(proof)
  try {
    await ots.upgrade(detached2)
    const upgradedBytes = Buffer.from(detached2.serializeToBytes())
    const block = readBitcoinBlock(upgradedBytes)
    console.log(`    confirmed: ${block !== null}`)
    console.log(`    block:     ${block ?? 'pending'}`)
    console.log(`    new bytes: ${upgradedBytes.length}`)
  } catch (err) {
    console.log(`    upgrade not yet possible: ${(err as Error).message}`)
  }

  console.log('\nOK — calendar reachability and serialization both work.')
}

main().catch((err) => {
  console.error('FAILED:', err)
  process.exit(1)
})
