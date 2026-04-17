import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'
import { getConfig } from '@/lib/config'
import { stampHash, upgradeProof } from '@/lib/esigning/timestamps'

const BATCH_SIZE = 10

interface SigRow {
  id: string
  document_id: string | null
  evidence_mac: string | null
  ots_proof: Buffer | null
  ots_pending: boolean
}

export async function POST(request: NextRequest) {
  try {
    const config = getConfig()

    // Shared-secret auth — only the Netlify Scheduled Function should call this.
    const secret = config.OTS_CRON_SECRET
    if (!secret) {
      return NextResponse.json({ error: 'OTS_CRON_SECRET not configured' }, { status: 503 })
    }
    if (request.headers.get('x-cron-secret') !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceClient()
    const results = { phase1: 0, phase2_confirmed: 0, phase2_pending: 0, errors: 0 }

    // ── Phase 1: stamp new signatures ──────────────────────────────────────
    // Signatures where ots_pending=true but ots_proof is null need initial stamping.
    const { data: unstamped } = await supabase
      .from('signatures')
      .select('id, document_id, evidence_mac')
      .eq('ots_pending', true)
      .is('ots_proof', null)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE)

    for (const row of (unstamped ?? []) as SigRow[]) {
      try {
        // Use the evidence_mac (HMAC) as the content to timestamp —
        // it's the canonical fingerprint of the signing event.
        const hexHash = row.evidence_mac
        if (!hexHash) continue

        const proofBytes = await stampHash(hexHash, config.OTS_CALENDAR_URLS)

        await supabase
          .from('signatures')
          .update({ ots_proof: proofBytes })
          .eq('id', row.id)

        await logAudit(null, 'ots_stamped', 'document', row.document_id ?? '', {
          signature_id: row.id,
        })

        results.phase1++
      } catch (err) {
        console.error(`OTS phase-1 stamp failed for sig ${row.id}:`, err)
        results.errors++
      }
    }

    // ── Phase 2: upgrade pending proofs ────────────────────────────────────
    // Signatures that have a proof but are still pending Bitcoin confirmation.
    const { data: pendingUpgrade } = await supabase
      .from('signatures')
      .select('id, document_id, ots_proof')
      .eq('ots_pending', true)
      .not('ots_proof', 'is', null)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE)

    for (const row of (pendingUpgrade ?? []) as SigRow[]) {
      try {
        if (!row.ots_proof) continue

        const proofBuf = Buffer.isBuffer(row.ots_proof)
          ? row.ots_proof
          : Buffer.from(row.ots_proof)

        const { proofBytes, confirmed, bitcoinBlock } = await upgradeProof(proofBuf)

        if (confirmed && bitcoinBlock !== undefined) {
          await supabase
            .from('signatures')
            .update({
              ots_proof: proofBytes,
              ots_pending: false,
              ots_upgraded_at: new Date().toISOString(),
              ots_bitcoin_block: bitcoinBlock,
            })
            .eq('id', row.id)

          await logAudit(null, 'ots_confirmed', 'document', row.document_id ?? '', {
            signature_id: row.id,
            bitcoin_block: bitcoinBlock,
          })

          results.phase2_confirmed++
        } else {
          // Update the proof bytes even if not confirmed (the calendar may have
          // added more attestation data).
          await supabase
            .from('signatures')
            .update({ ots_proof: proofBytes })
            .eq('id', row.id)

          results.phase2_pending++
        }
      } catch (err) {
        console.error(`OTS phase-2 upgrade failed for sig ${row.id}:`, err)
        results.errors++
      }
    }

    return NextResponse.json({ ok: true, results })
  } catch (err) {
    console.error('OTS upgrade route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
