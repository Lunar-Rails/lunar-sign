import { notFound } from 'next/navigation'
import { getServiceClient } from '@/lib/supabase/service'
import { CheckCircle, Clock, ExternalLink, Shield } from 'lucide-react'
import QRCode from 'qrcode'

export const dynamic = 'force-dynamic'

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

interface VerifyPageProps {
  params: Promise<{ signatureId: string }>
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { signatureId } = await params
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('signatures')
    .select(
      'id, signed_at, evidence_mac, ots_pending, ots_bitcoin_block, ots_upgraded_at, signature_requests(signer_name, signer_email, documents(title))'
    )
    .eq('id', signatureId)
    .single()

  if (error || !data) notFound()

  const row = data as unknown as SignatureRow
  const sigReq = row.signature_requests
  const isConfirmed = !row.ots_pending && row.ots_bitcoin_block !== null

  // Build the canonical URL using the configured app URL so it's correct in production.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? ''
  const pageUrl = `${appUrl}/verify/${signatureId}`

  const qrDataUrl = await QRCode.toDataURL(pageUrl, {
    width: 160,
    margin: 1,
    color: { dark: '#0d0f1a', light: '#f4f2f7' },
  })

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-lr-bg px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-baseline gap-1">
          <span className="font-display text-lr-3xl font-bold text-lr-accent">Lunar</span>
          <span className="font-display text-lr-3xl font-bold text-lr-gold">Sign</span>
        </div>
        <p className="mt-1 text-lr-sm text-lr-muted">Signature Verification</p>
      </div>

      <div className="w-full max-w-lg space-y-4">
        {/* Main card */}
        <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-8 shadow-lr-card">
          <div className="mb-6 flex items-center gap-3">
            <Shield size={20} className="text-lr-accent" />
            <h1 className="text-page-title text-lr-text">Signature Record</h1>
          </div>

          {/* Document + signer */}
          <div className="space-y-3">
            <div>
              <p className="text-kicker text-lr-muted">Document</p>
              <p className="text-card-title text-lr-text">{sigReq?.documents?.title ?? '—'}</p>
            </div>
            <div className="flex gap-8">
              <div>
                <p className="text-kicker text-lr-muted">Signer</p>
                <p className="text-body text-lr-text">{sigReq?.signer_name ?? '—'}</p>
                <p className="text-caption text-lr-muted">{sigReq?.signer_email ?? ''}</p>
              </div>
              <div>
                <p className="text-kicker text-lr-muted">Signed at</p>
                <p className="text-body text-lr-text">
                  {new Date(row.signed_at).toUTCString()}
                </p>
              </div>
            </div>
          </div>

          <div className="my-6 border-t border-lr-border" />

          {/* Evidence MAC */}
          <div className="mb-6">
            <p className="text-kicker text-lr-muted mb-1">Evidence MAC (HMAC-SHA256)</p>
            <p className="break-all font-mono text-xs text-lr-text/70 leading-relaxed">
              {row.evidence_mac ?? '—'}
            </p>
          </div>

          {/* OTS status */}
          <div className="mb-6">
            <p className="text-kicker text-lr-muted mb-2">Blockchain Timestamp</p>
            {isConfirmed ? (
              <div className="flex items-start gap-3 rounded-lr border border-lr-success/20 bg-lr-success/10 px-4 py-3">
                <CheckCircle size={16} className="mt-0.5 shrink-0 text-lr-success" />
                <div>
                  <p className="text-body font-medium text-lr-success">
                    Anchored to Bitcoin block #{row.ots_bitcoin_block}
                  </p>
                  {row.ots_upgraded_at && (
                    <p className="text-caption text-lr-success/70">
                      Confirmed {new Date(row.ots_upgraded_at).toUTCString()}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-lr border border-lr-warning/20 bg-lr-warning/10 px-4 py-3">
                <Clock size={16} className="mt-0.5 shrink-0 text-lr-warning" />
                <div>
                  <p className="text-body font-medium text-lr-warning">
                    Pending Bitcoin confirmation
                  </p>
                  <p className="text-caption text-lr-warning/70">
                    The proof has been submitted to the OpenTimestamps network and is awaiting Bitcoin block inclusion. This typically takes 1–6 hours.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* QR code */}
          <div className="flex flex-col items-center gap-2 border-t border-lr-border pt-6">
            <p className="text-caption text-lr-muted">Scan to share this verification</p>
            {/* Light background ensures QR code is scannable regardless of theme */}
            <div className="rounded-lr bg-[#f4f2f7] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR code for this verification page" width={160} height={160} />
            </div>
            <p className="text-caption text-lr-muted break-all text-center">{pageUrl}</p>
          </div>
        </div>

        {/* Explanation card */}
        <div className="rounded-lr-lg border border-lr-border bg-lr-surface/60 px-8 py-6 space-y-4">
          <h2 className="text-card-title text-lr-text">What is OpenTimestamps?</h2>
          <p className="text-body text-lr-muted">
            OpenTimestamps is an open protocol that anchors a cryptographic fingerprint of each signing event to the Bitcoin blockchain. This creates an independent, tamper-proof record that the signature existed at a specific point in time — without relying on Lunar Sign or any single authority.
          </p>
          <h2 className="text-card-title text-lr-text">What does this prove?</h2>
          <p className="text-body text-lr-muted">
            Once confirmed, the blockchain attestation guarantees that the document was signed no later than the recorded time, and that neither the document nor the signing evidence has been altered since. This timestamp is independently verifiable by anyone using the open-source{' '}
            <a
              href="https://opentimestamps.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-lr-accent underline-offset-2 hover:underline"
            >
              OpenTimestamps client
              <ExternalLink size={12} />
            </a>
            .
          </p>
        </div>

        <p className="text-caption text-lr-muted text-center pb-4">
          Verified by Lunar Sign · Signature ID: {signatureId}
        </p>
      </div>
    </div>
  )
}
