import { describe, expect, it } from 'vitest'
import type { FieldPlacement } from '@drvillo/react-browser-e-signing'

import {
  applySignerValuesToPlacements,
  hydrateForDocumentCreator,
  hydrateForSigner,
  mergeCreatorFieldValues,
  parseFieldMetadata,
  parseFieldMetadataJson,
  placementsFromStored,
  serializeFieldMetadata,
  storedFieldsFromPlacements,
  validateCreatorFieldsComplete,
} from '@/lib/field-metadata'
import type { StoredField } from '@/lib/types'

const storedA: StoredField = {
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

const storedB: StoredField = {
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

describe('parseFieldMetadataJson', () => {
  it('parses valid JSON array', () => {
    const json = JSON.stringify([storedA])
    expect(parseFieldMetadataJson(json)).toEqual([storedA])
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

describe('hydrateForSigner', () => {
  it('sets locked true and preserves creator value', () => {
    const out = hydrateForSigner([storedA, storedB])
    expect(out.every((f) => f.locked)).toBe(true)
    const t = out.find((f) => f.id === 'f1')
    expect(t?.value).toBe('Acme')
    const s = out.find((f) => f.id === 'f2')
    expect(s?.value).toBeUndefined()
  })
})

describe('hydrateForDocumentCreator', () => {
  it('unlocks creator fields and locks signer fields', () => {
    const out = hydrateForDocumentCreator([storedA, storedB])
    expect(out.find((f) => f.id === 'f1')?.locked).toBe(false)
    expect(out.find((f) => f.id === 'f2')?.locked).toBe(true)
  })
})

describe('storedFieldsFromPlacements + placementsFromStored', () => {
  it('round-trips layout and forSigner flags', () => {
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
    ]
    const forSignerById = { x1: true }
    const stored = storedFieldsFromPlacements({ fields, forSignerById })
    const back = placementsFromStored(stored)
    expect(back.forSignerById.x1).toBe(true)
    expect(back.fields[0].id).toBe('x1')
    expect(back.fields[0].locked).toBe(false)
  })
})

describe('mergeCreatorFieldValues + validateCreatorFieldsComplete', () => {
  it('requires non-empty creator values', () => {
    const merged = mergeCreatorFieldValues({
      templateFields: [storedA, storedB],
      fieldValues: { f1: '  ' },
    })
    const r = validateCreatorFieldsComplete(merged)
    expect(r.valid).toBe(false)
    expect(r.missingLabels.length).toBeGreaterThan(0)
  })
  it('valid when creator fields filled', () => {
    const merged = mergeCreatorFieldValues({
      templateFields: [storedA, storedB],
      fieldValues: { f1: 'Acme Inc' },
    })
    expect(validateCreatorFieldsComplete(merged).valid).toBe(true)
  })
})

describe('serializeFieldMetadata', () => {
  it('round-trips with parseFieldMetadataJson', () => {
    const arr = [storedA]
    expect(parseFieldMetadataJson(serializeFieldMetadata(arr))).toEqual(arr)
  })
})

describe('applySignerValuesToPlacements', () => {
  it('fills signer fields from signer info', () => {
    const stored: StoredField[] = [
      { ...storedA, forSigner: false, value: 'Co' },
      {
        id: 's1',
        type: 'fullName',
        pageIndex: 0,
        xPercent: 1,
        yPercent: 1,
        widthPercent: 20,
        heightPercent: 5,
        forSigner: true,
      },
      {
        id: 's2',
        type: 'text',
        pageIndex: 0,
        xPercent: 1,
        yPercent: 10,
        widthPercent: 20,
        heightPercent: 5,
        forSigner: true,
      },
    ]
    const fields = hydrateForSigner(stored)
    const withText = fields.map((f) => (f.id === 's2' ? { ...f, value: 'Hello' } : f))
    const out = applySignerValuesToPlacements({
      fields: withText,
      stored,
      displayName: 'Pat Doe',
      signerTitle: 'CEO',
      signatureDataUrl: 'data:image/png;base64,xx',
      dateText: 'Jan 1',
    })
    expect(out.find((f) => f.id === 'f1')?.value).toBe('Co')
    expect(out.find((f) => f.id === 's1')?.value).toBe('Pat Doe')
    expect(out.find((f) => f.id === 's2')?.value).toBe('Hello')
  })
})
