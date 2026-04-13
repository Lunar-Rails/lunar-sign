/** Derived readiness for templates (no status column in DB). */

export type TemplateReadiness = 'draft' | 'pending' | 'completed'

export interface TemplateReadinessInput {
  document_type_id: string | null
  field_metadata: unknown
  /** Linked companies (count or rows). */
  companyLinkCount: number
}

export function getTemplateReadiness(input: TemplateReadinessInput): TemplateReadiness {
  const fields = Array.isArray(input.field_metadata) ? input.field_metadata : []
  const hasType = input.document_type_id != null
  const hasFields = fields.length > 0
  const hasCompanies = input.companyLinkCount > 0
  if (!hasType || !hasFields) return 'draft'
  if (!hasCompanies) return 'pending'
  return 'completed'
}

export function countTemplateReadinessBuckets(
  rows: TemplateReadinessInput[]
): { total: number; draft: number; pending: number; completed: number } {
  const out = { total: rows.length, draft: 0, pending: 0, completed: 0 }
  for (const row of rows) {
    out[getTemplateReadiness(row)] += 1
  }
  return out
}
