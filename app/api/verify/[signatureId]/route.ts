import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'

interface SignatureRow {
  id: string
  signed_at: string
  evidence_mac: string | null
  ots_pending: boolean
  ots_bitcoin_block: number | null
  ots_upgraded_at: string | null
  signature_requests: {
    signer_name: string
    signer_email: string
    documents: { title: string } | null
  } | null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ signatureId: string }> }
) {
  const { signatureId } = await params
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('signatures')
    .select(
      'id, signed_at, evidence_mac, ots_pending, ots_bitcoin_block, ots_upgraded_at, signature_requests(signer_name, signer_email, documents(title))'
    )
    .eq('id', signatureId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Signature not found' }, { status: 404 })
  }

  const row = data as unknown as SignatureRow
  const req = row.signature_requests

  return NextResponse.json({
    signatureId: row.id,
    documentTitle: req?.documents?.title ?? null,
    signerName: req?.signer_name ?? null,
    signerEmail: req?.signer_email ?? null,
    signedAt: row.signed_at,
    evidenceMac: row.evidence_mac,
    otsPending: row.ots_pending,
    otsBitcoinBlock: row.ots_bitcoin_block,
    otsUpgradedAt: row.ots_upgraded_at,
  })
}
