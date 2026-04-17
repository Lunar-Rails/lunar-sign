/**
 * OpenTimestamps integration.
 *
 * Phase 1 — stamp:   submit a SHA-256 hash to OTS calendars; returns serialized
 *                    proof bytes that represent a pending (unconfirmed) timestamp.
 * Phase 2 — upgrade: fetch the latest proof from calendars; if a Bitcoin block
 *                    attestation is now present, the timestamp is confirmed.
 * verify:            given stored proof bytes, check whether a Bitcoin attestation
 *                    is present and return the block height.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ots = require('opentimestamps') as typeof import('opentimestamps')

const DEFAULT_CALENDARS = [
  'https://alice.btc.calendar.opentimestamps.org',
  'https://bob.btc.calendar.opentimestamps.org',
  'https://finney.calendar.eternitywall.com',
]

function getCalendarUrls(envValue?: string): string[] {
  if (envValue) {
    const parsed = envValue.split(',').map((u) => u.trim()).filter(Boolean)
    if (parsed.length > 0) return parsed
  }
  return DEFAULT_CALENDARS
}

/** Build a DetachedTimestampFile from a hex-encoded SHA-256 hash. */
function detachedFromHex(hexHash: string) {
  const hashBytes = Buffer.from(hexHash, 'hex')
  return ots.DetachedTimestampFile.fromHash(new ots.Ops.OpSHA256(), hashBytes)
}

/**
 * Phase 1: submit to OTS calendars.
 * Returns serialized proof bytes (store in `ots_proof`).
 */
export async function stampHash(hexHash: string, calendarUrls?: string): Promise<Buffer> {
  const detached = detachedFromHex(hexHash)
  const calendars = getCalendarUrls(calendarUrls)
  await ots.stamp(detached, { calendars })
  return Buffer.from(detached.serializeToBytes())
}

export interface UpgradeResult {
  /** Proof bytes to persist (whether confirmed or still pending). */
  proofBytes: Buffer
  /** Whether the proof has been confirmed on the Bitcoin blockchain. */
  confirmed: boolean
  /** Bitcoin block height of the attestation (when confirmed). */
  bitcoinBlock?: number
}

/**
 * Phase 2: upgrade a pending OTS proof.
 * Pass in stored `ots_proof` bytes; the function fetches the latest proof from
 * the calendars embedded in the proof and returns the updated bytes plus
 * confirmation status.
 */
export async function upgradeProof(proofBytes: Buffer): Promise<UpgradeResult> {
  const detached = ots.DetachedTimestampFile.deserialize(proofBytes)
  try {
    await ots.upgrade(detached)
  } catch {
    // Upgrade failure (network issue, calendar unreachable) — return existing bytes.
    return { proofBytes, confirmed: false }
  }

  const updatedBytes = Buffer.from(detached.serializeToBytes())

  // Scan attestations for a Bitcoin block header confirmation.
  let bitcoinBlock: number | undefined
  detached.timestamp.allAttestations().forEach(
    (attestation: InstanceType<typeof ots.Notary.BitcoinBlockHeaderAttestation>) => {
      if (attestation instanceof ots.Notary.BitcoinBlockHeaderAttestation) {
        const h = (attestation as unknown as { height: number }).height
        if (bitcoinBlock === undefined || h < bitcoinBlock) bitcoinBlock = h
      }
    }
  )

  return {
    proofBytes: updatedBytes,
    confirmed: bitcoinBlock !== undefined,
    bitcoinBlock,
  }
}

/**
 * Check whether stored proof bytes contain a Bitcoin block attestation.
 * Returns block height when confirmed, null otherwise.
 */
export function readBitcoinBlock(proofBytes: Buffer): number | null {
  try {
    const detached = ots.DetachedTimestampFile.deserialize(proofBytes)
    let block: number | null = null
    detached.timestamp.allAttestations().forEach(
      (att: InstanceType<typeof ots.Notary.BitcoinBlockHeaderAttestation>) => {
        if (att instanceof ots.Notary.BitcoinBlockHeaderAttestation) {
          const h = (att as unknown as { height: number }).height
          if (block === null || h < block) block = h
        }
      }
    )
    return block
  } catch {
    return null
  }
}
