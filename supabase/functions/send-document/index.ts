import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const { document_id } = await req.json()
    if (!document_id) return json({ error: 'document_id is required' }, 400)

    const { data: demsUser } = await supabaseAdmin
      .from('dems_users')
      .select('user_id, full_name, company_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!demsUser) return json({ error: 'User profile not found' }, 404)

    const { data: document } = await supabaseAdmin
      .from('dems_documents')
      .select('document_id, title, current_status_id, company_id, owner_user_id')
      .eq('document_id', document_id)
      .maybeSingle()

    if (!document) return json({ error: 'Document not found' }, 404)
    if (document.company_id !== demsUser.company_id) return json({ error: 'Forbidden' }, 403)

    // Must be in draft to send
    const { data: draftStatus } = await supabaseAdmin
      .from('dems_document_statuses')
      .select('status_id')
      .eq('status_code', 'draft')
      .single()

    if (!draftStatus || document.current_status_id !== draftStatus.status_id) {
      return json({ error: 'Document is not in draft status' }, 400)
    }

    // Need at least one signer
    const { data: signers } = await supabaseAdmin
      .from('dems_document_signers')
      .select('signer_id, signer_name, signer_email, access_token, signing_order')
      .eq('document_id', document_id)
      .order('signing_order', { ascending: true })

    if (!signers || signers.length === 0) {
      return json({ error: 'Add at least one signer before sending' }, 400)
    }

    // Update document status to sent_for_signature
    const { data: sentStatus } = await supabaseAdmin
      .from('dems_document_statuses')
      .select('status_id')
      .eq('status_code', 'sent_for_signature')
      .single()

    if (!sentStatus) return json({ error: 'Status configuration error' }, 500)

    const { error: updateError } = await supabaseAdmin
      .from('dems_documents')
      .update({
        current_status_id: sentStatus.status_id,
        sent_at: new Date().toISOString(),
      })
      .eq('document_id', document_id)

    if (updateError) {
      console.error('Update document error:', updateError)
      return json({ error: 'Failed to update document status' }, 500)
    }

    // Send signature request emails
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev'

    const emailErrors: string[] = []

    if (resendApiKey) {
      for (const signer of signers) {
        const signingUrl = `${appUrl}/sign/${signer.access_token}`
        const emailHtml = buildSignatureRequestEmail({
          signerName: signer.signer_name,
          documentTitle: document.title,
          senderName: demsUser.full_name ?? user.email ?? 'Document Owner',
          signingUrl,
        })

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: signer.signer_email,
            subject: `Please sign: ${document.title}`,
            html: emailHtml,
          }),
        })

        if (!res.ok) {
          const errText = await res.text()
          console.error(`Email failed for ${signer.signer_email}:`, errText)
          emailErrors.push(signer.signer_email)
        }
      }
    } else {
      console.warn('RESEND_API_KEY not set — skipping emails')
    }

    // Audit log
    await supabaseAdmin.from('dems_audit_logs').insert({
      document_id,
      action_type: 'document_sent',
      from_status_id: draftStatus.status_id,
      to_status_id: sentStatus.status_id,
      performed_by_type: 'User',
      performed_by_user_id: user.id,
      performed_by_email: user.email,
      notes: `Document sent to ${signers.length} signer(s)`,
    })

    return json({
      success: true,
      message: `Document sent to ${signers.length} signer(s)`,
      ...(emailErrors.length > 0 && { email_errors: emailErrors }),
    })
  } catch (err) {
    console.error('Unhandled error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

function buildSignatureRequestEmail(params: {
  signerName: string
  documentTitle: string
  senderName: string
  signingUrl: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <tr>
          <td style="background:#1e40af;padding:32px 40px;text-align:center">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">Complyverse DEMS</h1>
            <p style="margin:8px 0 0;color:#bfdbfe;font-size:14px">Document Execution Management System</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px">
            <p style="margin:0 0 16px;color:#1e293b;font-size:16px">Hi <strong>${params.signerName}</strong>,</p>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6">
              <strong>${params.senderName}</strong> has requested your signature on:
            </p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:0 0 32px">
              <p style="margin:0;color:#1e293b;font-size:18px;font-weight:600">${params.documentTitle}</p>
            </div>
            <div style="text-align:center;margin:0 0 32px">
              <a href="${params.signingUrl}"
                 style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600">
                Review &amp; Sign Document
              </a>
            </div>
            <p style="margin:0 0 8px;color:#94a3b8;font-size:13px">
              This signing link expires in 7 days. If you did not expect this request, you can safely ignore this email.
            </p>
            <p style="margin:0;color:#94a3b8;font-size:13px">
              Or copy this link: <a href="${params.signingUrl}" style="color:#2563eb">${params.signingUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center">
            <p style="margin:0;color:#94a3b8;font-size:12px">© 2026 Complyverse. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
