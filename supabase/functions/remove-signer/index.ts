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

    const { signer_id } = await req.json()
    if (!signer_id) return json({ error: 'signer_id is required' }, 400)

    // Fetch signer and its parent document together
    const { data: signer } = await supabaseAdmin
      .from('dems_document_signers')
      .select('signer_id, document_id, signer_name, signer_email')
      .eq('signer_id', signer_id)
      .maybeSingle()

    if (!signer) return json({ error: 'Signer not found' }, 404)

    const { data: demsUser } = await supabaseAdmin
      .from('dems_users')
      .select('user_id, company_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!demsUser) return json({ error: 'User profile not found' }, 404)

    const { data: document } = await supabaseAdmin
      .from('dems_documents')
      .select('document_id, current_status_id, company_id, total_signers')
      .eq('document_id', signer.document_id)
      .maybeSingle()

    if (!document) return json({ error: 'Document not found' }, 404)
    if (document.company_id !== demsUser.company_id) return json({ error: 'Forbidden' }, 403)

    // Must be in draft to remove signers
    const { data: draftStatus } = await supabaseAdmin
      .from('dems_document_statuses')
      .select('status_id')
      .eq('status_code', 'draft')
      .single()

    if (!draftStatus || document.current_status_id !== draftStatus.status_id) {
      return json({ error: 'Can only remove signers from draft documents' }, 400)
    }

    const { error: deleteError } = await supabaseAdmin
      .from('dems_document_signers')
      .delete()
      .eq('signer_id', signer_id)

    if (deleteError) {
      console.error('Delete signer error:', deleteError)
      return json({ error: 'Failed to remove signer' }, 500)
    }

    // Keep total_signers in sync
    await supabaseAdmin
      .from('dems_documents')
      .update({ total_signers: Math.max(0, document.total_signers - 1) })
      .eq('document_id', signer.document_id)

    // Audit log
    await supabaseAdmin.from('dems_audit_logs').insert({
      document_id: signer.document_id,
      action_type: 'signer_removed',
      performed_by_type: 'User',
      performed_by_user_id: user.id,
      performed_by_email: user.email,
      notes: `${signer.signer_name} (${signer.signer_email}) removed as signer`,
    })

    return json({ success: true })
  } catch (err) {
    console.error('Unhandled error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
