import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Finds an existing document type by case-insensitive name, or inserts one.
 * Mirrors the resolution logic used for document uploads.
 */
export async function resolveOrCreateDocumentTypeIdByName(
  supabase: SupabaseClient,
  userId: string,
  typeName: string
): Promise<
  { ok: true; id: string } | { ok: false; error: string; status: number }
> {
  const { data: existingType, error: existingTypeError } = await supabase
    .from('document_types')
    .select('id')
    .ilike('name', typeName)
    .maybeSingle()

  if (existingTypeError) {
    console.error('Document type lookup error:', existingTypeError)
    return { ok: false, error: 'Failed to validate document type', status: 500 }
  }

  if (existingType) return { ok: true, id: existingType.id }

  const { data: createdType, error: createdTypeError } = await supabase
    .from('document_types')
    .insert({
      name: typeName,
      created_by: userId,
    })
    .select('id')
    .single()

  if (!createdTypeError && createdType) return { ok: true, id: createdType.id }

  const isDuplicateType = createdTypeError?.code === '23505'
  if (!isDuplicateType) {
    console.error('Document type insert error:', createdTypeError)
    return { ok: false, error: 'Failed to create document type', status: 500 }
  }

  const { data: duplicateType, error: duplicateLookupError } = await supabase
    .from('document_types')
    .select('id')
    .ilike('name', typeName)
    .maybeSingle()

  if (duplicateLookupError || !duplicateType) {
    console.error('Duplicate document type lookup error:', duplicateLookupError)
    return { ok: false, error: 'Failed to resolve document type', status: 500 }
  }

  return { ok: true, id: duplicateType.id }
}
