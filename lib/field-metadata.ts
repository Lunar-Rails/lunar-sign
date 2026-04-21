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
  return normalizeStoredFields(r.data)
}

export function serializeFieldMetadata(fields: StoredField[]): string {
  return JSON.stringify(fields)
}

/**
 * Resolve the effective signer index for a stored field.
 * Handles both new (signerIndex) and legacy (forSigner) formats.
 */
export function resolveSignerIndex(f: StoredField): number | null {
  if (f.signerIndex !== undefined) return f.signerIndex ?? null
  return f.forSigner ? 0 : null
}

/**
 * Normalize stored fields to always have a consistent signerIndex value,
 * bridging the legacy forSigner boolean and the new signerIndex number.
 */
export function normalizeStoredFields(fields: StoredField[]): StoredField[] {
  return fields.map((f) => {
    const idx = resolveSignerIndex(f)
    return {
      ...f,
      signerIndex: idx,
      forSigner: idx !== null,
    }
  })
}

/**
 * Signer session: all boxes fixed; creator values shown; only the current
 * signer's fields are editable.
 *
 * Multi-signer note: other signers' fields are filtered OUT of the overlay.
 * The library renders the global `preview` (current signer's name / signature)
 * on any empty signature/fullName field, so keeping them would show the
 * current signer's preview in slots that belong to another signer. Those
 * slots are already burned into the PDF by the previous signer (or will be
 * by the next one), so omitting them here is correct — the overlay only
 * represents what *this* signer still needs to do.
 *
 * Legacy (currentSignerIndex == null) keeps all signer fields — single-signer
 * flow where every signer-assigned field belongs to the one signer.
 */
export function hydrateForSigner(
  stored: StoredField[],
  currentSignerIndex?: number | null
): FieldPlacement[] {
  return stored
    .filter((f) => {
      const idx = resolveSignerIndex(f)
      if (idx === null) return true
      if (currentSignerIndex == null) return true
      return idx === currentSignerIndex
    })
    .map((f) => {
      const idx = resolveSignerIndex(f)
      const isCurrentSigner =
        currentSignerIndex != null && idx === currentSignerIndex
      return {
        id: f.id,
        type: f.type,
        pageIndex: f.pageIndex,
        xPercent: f.xPercent,
        yPercent: f.yPercent,
        widthPercent: f.widthPercent,
        heightPercent: f.heightPercent,
        label: f.label,
        locked: true,
        // Current signer's fields start empty so the library overlay shows the preview;
        // creator fields display their persisted value. Date is auto-filled (read-only UX).
        value: isCurrentSigner
          ? f.type === 'date'
            ? new Date().toLocaleDateString()
            : undefined
          : (f.value ?? undefined),
      }
    })
}

/** Document-from-template UI: creator can move/edit only their fields. */
export function hydrateForDocumentCreator(stored: StoredField[]): FieldPlacement[] {
  return stored.map((f) => {
    const idx = resolveSignerIndex(f)
    return {
      id: f.id,
      type: f.type,
      pageIndex: f.pageIndex,
      xPercent: f.xPercent,
      yPercent: f.yPercent,
      widthPercent: f.widthPercent,
      heightPercent: f.heightPercent,
      label: f.label,
      locked: idx !== null,
      value: undefined,
    }
  })
}

export function mergeCreatorFieldValues({
  templateFields,
  fieldValues,
}: {
  templateFields: StoredField[]
  fieldValues: Record<string, string>
}): StoredField[] {
  return templateFields.map((f) => {
    const idx = resolveSignerIndex(f)
    if (idx !== null) return { ...f }
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
    const idx = resolveSignerIndex(f)
    if (idx !== null) continue
    const v = f.value?.trim()
    if (!v) missingLabels.push(f.label?.trim() || f.type)
  }
  return { valid: missingLabels.length === 0, missingLabels }
}

export function validateSignerFieldAssignments(
  fields: StoredField[],
  signerCount: number
): {
  valid: boolean
  missingSignerIndexes: number[]
} {
  const normalizedSignerCount = Math.min(2, Math.max(0, Math.trunc(signerCount)))
  const missingSignerIndexes: number[] = []

  for (let i = 0; i < normalizedSignerCount; i++) {
    const hasAssignedField = fields.some((f) => resolveSignerIndex(f) === i)
    if (!hasAssignedField) missingSignerIndexes.push(i)
  }

  return {
    valid: missingSignerIndexes.length === 0,
    missingSignerIndexes,
  }
}

/** Persist template layout from editor: library placements + signer index flags. */
export function storedFieldsFromPlacements({
  fields,
  signerIndexById,
}: {
  fields: FieldPlacement[]
  signerIndexById: Record<string, number | null>
}): StoredField[] {
  return fields.map((f) => {
    const idx = signerIndexById[f.id] ?? null
    return {
      id: f.id,
      type: f.type as StoredField['type'],
      pageIndex: f.pageIndex,
      xPercent: f.xPercent,
      yPercent: f.yPercent,
      widthPercent: f.widthPercent,
      heightPercent: f.heightPercent,
      label: f.label,
      value: undefined,
      forSigner: idx !== null,
      signerIndex: idx,
    }
  })
}

/** Load template editor from persisted `StoredField[]`. */
export function placementsFromStored(stored: StoredField[]): {
  fields: FieldPlacement[]
  signerIndexById: Record<string, number | null>
} {
  const signerIndexById: Record<string, number | null> = {}
  const fields: FieldPlacement[] = stored.map((f) => {
    signerIndexById[f.id] = resolveSignerIndex(f)
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
  return { fields, signerIndexById }
}

/** Merge signer-derived values into placements before `modifyPdf`. */
export function applySignerValuesToPlacements({
  fields,
  stored,
  currentSignerIndex,
  displayName,
  signerTitle,
  signatureDataUrl,
  dateText,
}: {
  fields: FieldPlacement[]
  stored: StoredField[]
  /** Which signer slot is currently signing. Null means legacy single-signer. */
  currentSignerIndex?: number | null
  displayName: string
  signerTitle: string
  signatureDataUrl: string
  dateText: string
}): FieldPlacement[] {
  const byId = new Map(stored.map((s) => [s.id, s]))
  return fields.map((f) => {
    const s = byId.get(f.id)
    if (!s) return f
    const idx = resolveSignerIndex(s)
    const isCurrentSigner =
      currentSignerIndex == null
        ? idx !== null // legacy: any signer field belongs to the signer
        : idx === currentSignerIndex
    if (!isCurrentSigner) return { ...f, value: f.value }
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
