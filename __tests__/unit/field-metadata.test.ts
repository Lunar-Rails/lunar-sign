import { describe, expect, it } from 'vitest'
import type { FieldPlacement } from '@drvillo/react-browser-e-signing'

import {
  applySignerValuesToPlacements,
  hydrateForDocumentCreator,
  hydrateForSigner,
  mergeCreatorFieldValues,
  normalizeStoredFields,
  parseFieldMetadata,
  parseFieldMetadataJson,
  placementsFromStored,
  resolveSignerIndex,
  serializeFieldMetadata,
  storedFieldsFromPlacements,
  validateCreatorFieldsComplete,
  validateSignerFieldAssignments,
} from '@/lib/field-metadata'
import type { StoredField } from '@/lib/types'

const creatorField: StoredField = {
  id: 'f1',
  type: 'text',
  pageIndex: 0,
  xPercent: 1,
  yPercent: 2,
  widthPercent: 10,
  heightPercent: 5,
  label: 'Company',
  value: 'Acme',
  forSigner: false,
}

const signerField: StoredField = {
  id: 'f2',
  type: 'signature',
  pageIndex: 0,
  xPercent: 5,
  yPercent: 50,
  widthPercent: 20,
  heightPercent: 5,
  label: 'Sign',
  forSigner: true,
}

const signer1Field: StoredField = {
  id: 's1',
  type: 'signature',
  pageIndex: 0,
  xPercent: 5,
  yPercent: 50,
  widthPercent: 20,
  heightPercent: 5,
  label: 'S1 Sig',
  forSigner: true,
  signerIndex: 0,
}

const signer2Field: StoredField = {
  id: 's2',
  type: 'fullName',
  pageIndex: 0,
  xPercent: 5,
  yPercent: 60,
  widthPercent: 20,
  heightPercent: 5,
  label: 'S2 Name',
  forSigner: true,
  signerIndex: 1,
}

// ─── resolveSignerIndex ───────────────────────────────────────────────────────

describe('resolveSignerIndex', () => {
  it('returns null for creator field (forSigner: false)', () => {
    expect(resolveSignerIndex(creatorField)).toBe(null)
  })
  it('returns 0 for legacy signer field (forSigner: true, no signerIndex)', () => {
    expect(resolveSignerIndex(signerField)).toBe(0)
  })
  it('returns 0 for explicit signerIndex: 0', () => {
    expect(resolveSignerIndex(signer1Field)).toBe(0)
  })
  it('returns 1 for explicit signerIndex: 1', () => {
    expect(resolveSignerIndex(signer2Field)).toBe(1)
  })
  it('returns null for signerIndex: null', () => {
    expect(resolveSignerIndex({ ...signerField, signerIndex: null })).toBe(null)
  })
})

// ─── normalizeStoredFields ────────────────────────────────────────────────────

describe('normalizeStoredFields', () => {
  it('upgrades legacy forSigner: true to signerIndex: 0', () => {
    const out = normalizeStoredFields([signerField])
    expect(out[0].signerIndex).toBe(0)
    expect(out[0].forSigner).toBe(true)
  })
  it('sets forSigner: false for creator fields', () => {
    const out = normalizeStoredFields([creatorField])
    expect(out[0].signerIndex).toBe(null)
    expect(out[0].forSigner).toBe(false)
  })
  it('preserves explicit signerIndex: 1', () => {
    const out = normalizeStoredFields([signer2Field])
    expect(out[0].signerIndex).toBe(1)
    expect(out[0].forSigner).toBe(true)
  })
})

// ─── parseFieldMetadataJson ───────────────────────────────────────────────────

describe('parseFieldMetadataJson', () => {
  it('parses valid JSON array and normalizes', () => {
    const json = JSON.stringify([creatorField])
    const out = parseFieldMetadataJson(json)
    expect(out[0].id).toBe('f1')
    expect(out[0].signerIndex).toBe(null)
  })
  it('throws on malformed JSON', () => {
    expect(() => parseFieldMetadataJson('{')).toThrow()
  })
})

describe('parseFieldMetadata', () => {
  it('throws on invalid shape', () => {
    expect(() => parseFieldMetadata([{ id: '' }] as never)).toThrow()
  })
})

// ─── hydrateForSigner ─────────────────────────────────────────────────────────

describe('hydrateForSigner', () => {
  it('legacy: sets locked true, preserves creator value, clears signer value', () => {
    const out = hydrateForSigner([creatorField, signerField])
    expect(out.every((f) => f.locked)).toBe(true)
    expect(out.find((f) => f.id === 'f1')?.value).toBe('Acme')
    expect(out.find((f) => f.id === 'f2')?.value).toBeUndefined()
  })

  it('signer 0: keeps creator + S1 fields, drops S2 fields so the shared preview does not leak', () => {
    const out = hydrateForSigner([creatorField, signer1Field, signer2Field], 0)
    expect(out.find((f) => f.id === 'f1')?.value).toBe('Acme')
    // S1 field kept, empty so library overlay shows the current signer's preview
    expect(out.find((f) => f.id === 's1')?.value).toBeUndefined()
    // S2 field dropped entirely — avoids the library painting S1's preview into S2's slot
    expect(out.find((f) => f.id === 's2')).toBeUndefined()
    expect(out.every((f) => f.locked)).toBe(true)
  })

  it('signer 1: keeps only S2 fields among signer-assigned fields', () => {
    const stored: StoredField[] = [
      { ...signer1Field, value: 'already-signed' },
      signer2Field,
    ]
    const out = hydrateForSigner(stored, 1)
    expect(out.find((f) => f.id === 's1')).toBeUndefined()
    expect(out.find((f) => f.id === 's2')?.value).toBeUndefined()
  })
})

// ─── hydrateForDocumentCreator ────────────────────────────────────────────────

describe('hydrateForDocumentCreator', () => {
  it('unlocks creator fields and locks signer fields', () => {
    const out = hydrateForDocumentCreator([creatorField, signerField])
    expect(out.find((f) => f.id === 'f1')?.locked).toBe(false)
    expect(out.find((f) => f.id === 'f2')?.locked).toBe(true)
  })
})

// ─── storedFieldsFromPlacements + placementsFromStored ────────────────────────

describe('storedFieldsFromPlacements + placementsFromStored', () => {
  const fields: FieldPlacement[] = [
    {
      id: 'x1',
      type: 'text',
      pageIndex: 0,
      xPercent: 3,
      yPercent: 4,
      widthPercent: 12,
      heightPercent: 6,
      label: 'L',
    },
    {
      id: 'x2',
      type: 'signature',
      pageIndex: 0,
      xPercent: 3,
      yPercent: 50,
      widthPercent: 20,
      heightPercent: 8,
    },
  ]

  it('round-trips signerIndex: 0', () => {
    const signerIndexById = { x1: null, x2: 0 }
    const stored = storedFieldsFromPlacements({ fields, signerIndexById })
    expect(stored.find((f) => f.id === 'x1')?.signerIndex).toBe(null)
    expect(stored.find((f) => f.id === 'x2')?.signerIndex).toBe(0)
    const back = placementsFromStored(stored)
    expect(back.signerIndexById['x1']).toBe(null)
    expect(back.signerIndexById['x2']).toBe(0)
    expect(back.fields[0].id).toBe('x1')
  })

  it('round-trips signerIndex: 1', () => {
    const signerIndexById = { x1: null, x2: 1 }
    const stored = storedFieldsFromPlacements({ fields, signerIndexById })
    expect(stored.find((f) => f.id === 'x2')?.signerIndex).toBe(1)
    const back = placementsFromStored(stored)
    expect(back.signerIndexById['x2']).toBe(1)
  })

  it('derives forSigner from signerIndex', () => {
    const stored = storedFieldsFromPlacements({ fields, signerIndexById: { x1: null, x2: 0 } })
    expect(stored.find((f) => f.id === 'x1')?.forSigner).toBe(false)
    expect(stored.find((f) => f.id === 'x2')?.forSigner).toBe(true)
  })
})

// ─── mergeCreatorFieldValues + validateCreatorFieldsComplete ──────────────────

describe('mergeCreatorFieldValues + validateCreatorFieldsComplete', () => {
  it('requires non-empty creator values', () => {
    const merged = mergeCreatorFieldValues({
      templateFields: [creatorField, signerField],
      fieldValues: { f1: '  ' },
    })
    const r = validateCreatorFieldsComplete(merged)
    expect(r.valid).toBe(false)
    expect(r.missingLabels.length).toBeGreaterThan(0)
  })
  it('valid when creator fields filled', () => {
    const merged = mergeCreatorFieldValues({
      templateFields: [creatorField, signerField],
      fieldValues: { f1: 'Acme Inc' },
    })
    expect(validateCreatorFieldsComplete(merged).valid).toBe(true)
  })
  it('ignores signer fields during creator validation', () => {
    const merged = mergeCreatorFieldValues({
      templateFields: [signer1Field, signer2Field],
      fieldValues: {},
    })
    expect(validateCreatorFieldsComplete(merged).valid).toBe(true)
  })
})

describe('validateSignerFieldAssignments', () => {
  it('fails when a required signer slot has no assigned fields', () => {
    const result = validateSignerFieldAssignments([creatorField, signer1Field], 2)
    expect(result.valid).toBe(false)
    expect(result.missingSignerIndexes).toEqual([1])
  })

  it('passes when every signer slot has at least one assigned field', () => {
    const result = validateSignerFieldAssignments([signer1Field, signer2Field], 2)
    expect(result.valid).toBe(true)
    expect(result.missingSignerIndexes).toEqual([])
  })

  it('fails for single-signer flows without any signer-assigned fields', () => {
    const result = validateSignerFieldAssignments([creatorField], 1)
    expect(result.valid).toBe(false)
    expect(result.missingSignerIndexes).toEqual([0])
  })
})

// ─── serializeFieldMetadata ───────────────────────────────────────────────────

describe('serializeFieldMetadata', () => {
  it('round-trips with parseFieldMetadataJson', () => {
    const arr = [creatorField]
    const parsed = parseFieldMetadataJson(serializeFieldMetadata(arr))
    expect(parsed[0].id).toBe(arr[0].id)
  })
})

// ─── applySignerValuesToPlacements ────────────────────────────────────────────

describe('applySignerValuesToPlacements', () => {
  it('legacy mode: fills signer fields from signer info', () => {
    const stored: StoredField[] = [
      { ...creatorField, forSigner: false, value: 'Co' },
      {
        id: 'a1',
        type: 'fullName',
        pageIndex: 0,
        xPercent: 1,
        yPercent: 1,
        widthPercent: 20,
        heightPercent: 5,
        forSigner: true,
      },
    ]
    const fields = hydrateForSigner(stored)
    const out = applySignerValuesToPlacements({
      fields,
      stored,
      displayName: 'Pat Doe',
      signerTitle: 'CEO',
      signatureDataUrl: 'data:image/png;base64,xx',
      dateText: 'Jan 1',
    })
    expect(out.find((f) => f.id === 'f1')?.value).toBe('Co')
    expect(out.find((f) => f.id === 'a1')?.value).toBe('Pat Doe')
  })

  it('slot mode: only applies values for current signer index; other-signer fields are not in the placement set at all', () => {
    const stored: StoredField[] = [
      { ...signer1Field, value: 'prev-signed' },
      signer2Field,
    ]
    const placements = hydrateForSigner(stored, 1)
    const out = applySignerValuesToPlacements({
      fields: placements,
      stored,
      currentSignerIndex: 1,
      displayName: 'Jane Smith',
      signerTitle: '',
      signatureDataUrl: 'data:image/png;base64,yy',
      dateText: 'Feb 1',
    })
    // S1's field was dropped by hydrateForSigner — its signature is already burned into
    // the base PDF S2 is signing on top of; modifyPdf must not redraw it.
    expect(out.find((f) => f.id === 's1')).toBeUndefined()
    expect(out.find((f) => f.id === 's2')?.value).toBe('Jane Smith')
  })
})
