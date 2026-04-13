import type { SupabaseClient } from '@supabase/supabase-js'

async function isAdmin(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  return profile?.role === 'admin'
}

export async function isMemberOfCompany({
  supabase,
  userId,
  companyId,
}: {
  supabase: SupabaseClient
  userId: string
  companyId: string
}) {
  if (await isAdmin(supabase, userId)) return true

  const { data: membership } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .maybeSingle()

  return !!membership
}

export async function canAccessDocument({
  supabase,
  userId,
  documentId,
}: {
  supabase: SupabaseClient
  userId: string
  documentId: string
}) {
  if (await isAdmin(supabase, userId)) return true

  const { data: ownedDocument } = await supabase
    .from('documents')
    .select('id')
    .eq('id', documentId)
    .eq('uploaded_by', userId)
    .maybeSingle()

  if (ownedDocument) return true

  const { data: links } = await supabase
    .from('document_companies')
    .select('company_id')
    .eq('document_id', documentId)

  const companyIds = (links || []).map((row) => row.company_id)
  if (!companyIds.length) return false

  const { data: memberships } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', userId)
    .in('company_id', companyIds)

  return (memberships || []).length > 0
}

export async function canAccessTemplate({
  supabase,
  userId,
  templateId,
}: {
  supabase: SupabaseClient
  userId: string
  templateId: string
}) {
  if (await isAdmin(supabase, userId)) return true

  const { data: ownedTemplate } = await supabase
    .from('templates')
    .select('id')
    .eq('id', templateId)
    .eq('created_by', userId)
    .is('deleted_at', null)
    .maybeSingle()

  if (ownedTemplate) return true

  const { data: links } = await supabase
    .from('template_companies')
    .select('company_id')
    .eq('template_id', templateId)

  const companyIds = (links || []).map((row) => row.company_id)
  if (!companyIds.length) return false

  const { data: memberships } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', userId)
    .in('company_id', companyIds)

  return (memberships || []).length > 0
}
