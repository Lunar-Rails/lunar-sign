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
 * Ordered checklist of what this signer still must complete on the PDF.
 * Skips auto-filled types: date, fullName, title (values synced separately).
 * Collapses all signature placements into one step until a PNG exists.
 */
export function getPendingGuideSteps(
  fields: FieldPlacement[],
  hasSignatureDataUrl: boolean
): GuideStep[] {
  const sorted = sortFieldsDocOrder(fields)
  const out: GuideStep[] = []
  let addedSignature = false
  for (const f of sorted) {
    if (f.type === 'date' || f.type === 'fullName' || f.type === 'title') continue
    if (f.type === 'signature') {
      if (!hasSignatureDataUrl && !addedSignature) {
        out.push({ kind: 'signature', fieldId: f.id, pageIndex: f.pageIndex })
        addedSignature = true
      }
      continue
    }
    if (f.type === 'text' && !f.value?.trim()) {
      out.push({ kind: 'text', fieldId: f.id, pageIndex: f.pageIndex })
    }
  }
  return out
}
