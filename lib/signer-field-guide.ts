import type { FieldPlacement } from '@drvillo/react-browser-e-signing'

export type GuideStep =
  | { kind: 'signature'; fieldId: string; pageIndex: number }
  | { kind: 'text'; fieldId: string; pageIndex: number }

export function sortFieldsDocOrder(fields: FieldPlacement[]): FieldPlacement[] {
  return [...fields].sort((a, b) => {
    if (a.pageIndex !== b.pageIndex) return a.pageIndex - b.pageIndex
    if (a.yPercent !== b.yPercent) return a.yPercent - b.yPercent
    return a.xPercent - b.xPercent
  })
}

/**
 * All signer-actionable fields in document order (filled or not).
 * Each signature placement is a separate step.
 */
export function getAllGuideSteps(fields: FieldPlacement[]): GuideStep[] {
  const sorted = sortFieldsDocOrder(fields)
  const out: GuideStep[] = []
  for (const f of sorted) {
    if (f.type === 'date' || f.type === 'fullName' || f.type === 'title') continue
    if (f.type === 'signature') {
      out.push({ kind: 'signature', fieldId: f.id, pageIndex: f.pageIndex })
      continue
    }
    if (f.type === 'text') {
      out.push({ kind: 'text', fieldId: f.id, pageIndex: f.pageIndex })
    }
  }
  return out
}

/**
 * Fields still needing user action.
 * - Signature fields: pending if the field ID is not in `acknowledgedSignatureIds`
 *   OR if no signature data URL exists yet.
 * - Text fields: pending if empty.
 */
export function getPendingGuideSteps(
  fields: FieldPlacement[],
  hasSignatureDataUrl: boolean,
  acknowledgedSignatureIds?: ReadonlySet<string>
): GuideStep[] {
  const acked = acknowledgedSignatureIds ?? new Set<string>()
  const sorted = sortFieldsDocOrder(fields)
  const out: GuideStep[] = []
  for (const f of sorted) {
    if (f.type === 'date' || f.type === 'fullName' || f.type === 'title') continue
    if (f.type === 'signature') {
      if (!hasSignatureDataUrl || !acked.has(f.id)) {
        out.push({ kind: 'signature', fieldId: f.id, pageIndex: f.pageIndex })
      }
      continue
    }
    if (f.type === 'text' && !f.value?.trim()) {
      out.push({ kind: 'text', fieldId: f.id, pageIndex: f.pageIndex })
    }
  }
  return out
}
