import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401)
    }

    // User client — validates the JWT
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    // Admin client — bypasses RLS for trusted server-side writes
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    const { document_id, signer_name, signer_email, signer_role, signing_order } = body

    if (!document_id || !signer_name?.trim() || !signer_email?.trim()) {
      return json({ error: 'document_id, signer_name, and signer_email are required' }, 400)
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signer_email)) {
      return json({ error: 'Invalid email format' }, 400)
    }

    // Verify caller has a dems_users profile
    const { data: demsUser } = await supabaseAdmin
      .from('dems_users')
      .select('user_id, company_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!demsUser) return json({ error: 'User profile not found' }, 404)

    // Fetch the document and verify it belongs to the caller's company
    const { data: document } = await supabaseAdmin
      .from('dems_documents')
      .select('document_id, current_status_id, company_id, total_signers')
      .eq('document_id', document_id)
      .maybeSingle()

    if (!document) return json({ error: 'Document not found' }, 404)
    if (document.company_id !== demsUser.company_id) return json({ error: 'Forbidden' }, 403)

    // Verify document is still in draft
    const { data: draftStatus } = await supabaseAdmin
      .from('dems_document_statuses')
      .select('status_id')
      .eq('status_code', 'draft')
      .single()

    if (!draftStatus || document.current_status_id !== draftStatus.status_id) {
      return json({ error: 'Can only add signers to draft documents' }, 400)
    }

    // Determine signing order if not provided
    const { count } = await supabaseAdmin
      .from('dems_document_signers')
      .select('signer_id', { count: 'exact', head: true })
      .eq('document_id', document_id)

    const resolvedOrder = signing_order || (count ?? 0) + 1

    // Generate signing token (7-day expiry)
    const access_token = crypto.randomUUID()
    const access_token_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: newSigner, error: insertError } = await supabaseAdmin
      .from('dems_document_signers')
      .insert({
        document_id,
        signer_name: signer_name.trim(),
        signer_email: signer_email.trim().toLowerCase(),
        signer_role: signer_role?.trim() || null,
        signing_order: resolvedOrder,
        signer_status: 'Pending',
        access_token,
        access_token_expires_at,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert signer error:', insertError)
      return json({ error: 'Failed to add signer' }, 500)
    }

    // Keep total_signers in sync
    await supabaseAdmin
      .from('dems_documents')
      .update({ total_signers: (count ?? 0) + 1 })
      .eq('document_id', document_id)

    // Audit log
    await supabaseAdmin.from('dems_audit_logs').insert({
      document_id,
      signer_id: newSigner.signer_id,
      action_type: 'signer_added',
      performed_by_type: 'User',
      performed_by_user_id: user.id,
      performed_by_email: user.email,
      notes: `${signer_name.trim()} (${signer_email.trim()}) added as signer`,
    })

    return json({ success: true, data: newSigner }, 201)
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
