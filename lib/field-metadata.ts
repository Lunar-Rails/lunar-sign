import type { FieldPlacement, FieldType } from '@drvillo/react-browser-e-signing'

import { FieldMetadataSchema } from '@/lib/schemas'
import type { StoredField } from '@/lib/types'

export function parseFieldMetadataJson(json: string): StoredField[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Invalid field metadata JSON')
  }
  return parseFieldMetadata(parsed)
}

export function parseFieldMetadata(value: unknown): StoredField[] {
  const r = FieldMetadataSchema.safeParse(value)
  if (!r.success) throw new Error('Invalid field metadata shape')
  return r.data
}

export function serializeFieldMetadata(fields: StoredField[]): string {
  return JSON.stringify(fields)
}

/** Signer session: all boxes fixed; creator values shown; signer fills the rest. */
export function hydrateForSigner(stored: StoredField[]): FieldPlacement[] {
  return stored.map((f) => ({
    id: f.id,
    type: f.type,
    pageIndex: f.pageIndex,
    xPercent: f.xPercent,
    yPercent: f.yPercent,
    widthPercent: f.widthPercent,
    heightPercent: f.heightPercent,
    label: f.label,
    locked: true,
    value: f.forSigner ? undefined : f.value,
  }))
}

/** Document-from-template UI: creator can move/edit only their fields. */
export function hydrateForDocumentCreator(stored: StoredField[]): FieldPlacement[] {
  return stored.map((f) => ({
    id: f.id,
    type: f.type,
    pageIndex: f.pageIndex,
    xPercent: f.xPercent,
    yPercent: f.yPercent,
    widthPercent: f.widthPercent,
    heightPercent: f.heightPercent,
    label: f.label,
    locked: f.forSigner,
    value: undefined,
  }))
}

export function mergeCreatorFieldValues({
  templateFields,
  fieldValues,
}: {
  templateFields: StoredField[]
  fieldValues: Record<string, string>
}): StoredField[] {
  return templateFields.map((f) => {
    if (f.forSigner) return { ...f }
    const merged = fieldValues[f.id] ?? f.value ?? ''
    return { ...f, value: merged }
  })
}

export function validateCreatorFieldsComplete(fields: StoredField[]): {
  valid: boolean
  missingLabels: string[]
} {
  const missingLabels: string[] = []
  for (const f of fields) {
    if (f.forSigner) continue
    const v = f.value?.trim()
    if (!v) missingLabels.push(f.label?.trim() || f.type)
  }
  return { valid: missingLabels.length === 0, missingLabels }
}

/** Persist template layout from editor: library placements + for-signer flags. */
export function storedFieldsFromPlacements({
  fields,
  forSignerById,
}: {
  fields: FieldPlacement[]
  forSignerById: Record<string, boolean>
}): StoredField[] {
  return fields.map((f) => ({
    id: f.id,
    type: f.type as StoredField['type'],
    pageIndex: f.pageIndex,
    xPercent: f.xPercent,
    yPercent: f.yPercent,
    widthPercent: f.widthPercent,
    heightPercent: f.heightPercent,
    label: f.label,
    value: undefined,
    forSigner: forSignerById[f.id] ?? false,
  }))
}

/** Load template editor from persisted `StoredField[]`. */
export function placementsFromStored(stored: StoredField[]): {
  fields: FieldPlacement[]
  forSignerById: Record<string, boolean>
} {
  const forSignerById: Record<string, boolean> = {}
  const fields: FieldPlacement[] = stored.map((f) => {
    forSignerById[f.id] = f.forSigner
    return {
      id: f.id,
      type: f.type as FieldType,
      pageIndex: f.pageIndex,
      xPercent: f.xPercent,
      yPercent: f.yPercent,
      widthPercent: f.widthPercent,
      heightPercent: f.heightPercent,
      label: f.label,
      locked: false,
    }
  })
  return { fields, forSignerById }
}

/** Merge signer-derived values into placements before `modifyPdf`. */
export function applySignerValuesToPlacements({
  fields,
  stored,
  displayName,
  signerTitle,
  signatureDataUrl,
  dateText,
}: {
  fields: FieldPlacement[]
  stored: StoredField[]
  displayName: string
  signerTitle: string
  signatureDataUrl: string
  dateText: string
}): FieldPlacement[] {
  const byId = new Map(stored.map((s) => [s.id, s]))
  return fields.map((f) => {
    const s = byId.get(f.id)
    if (!s) return f
    if (!s.forSigner) return { ...f, value: f.value }
    switch (f.type) {
      case 'signature':
        return { ...f, value: signatureDataUrl }
      case 'fullName':
        return { ...f, value: displayName }
      case 'title':
        return { ...f, value: signerTitle }
      case 'date':
        return { ...f, value: dateText }
      case 'text':
        return { ...f, value: f.value ?? '' }
      default:
        return f
    }
  })
}
