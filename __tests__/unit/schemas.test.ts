import { describe, expect, it } from 'vitest'
import {
  AddCompanyMemberSchema,
  AddSignerSchema,
  CompanyCreateSchema,
  CompanyUpdateSchema,
  CreateInvitationSchema,
  DocumentCompanyIdsSchema,
  DocumentTypeNamesSchema,
  DocumentUploadSchema,
  SendDocumentSchema,
} from '@/lib/schemas'

const validUuid = '550e8400-e29b-41d4-a716-446655440000'

describe('DocumentUploadSchema', () => {
  it('accepts title and optional description', () => {
    expect(
      DocumentUploadSchema.safeParse({ title: 'Doc', description: null }).success
    ).toBe(true)
    expect(DocumentUploadSchema.safeParse({ title: 'Doc' }).success).toBe(true)
  })
  it('rejects empty title', () => {
    expect(DocumentUploadSchema.safeParse({ title: '' }).success).toBe(false)
  })
})

describe('DocumentCompanyIdsSchema', () => {
  it('defaults companyIds to empty', () => {
    const r = DocumentCompanyIdsSchema.safeParse({})
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.companyIds).toEqual([])
  })
  it('accepts valid UUIDs', () => {
    expect(
      DocumentCompanyIdsSchema.safeParse({ companyIds: [validUuid] }).success
    ).toBe(true)
  })
  it('rejects invalid UUID', () => {
    expect(
      DocumentCompanyIdsSchema.safeParse({ companyIds: ['not-a-uuid'] }).success
    ).toBe(false)
  })
})

describe('DocumentTypeNamesSchema', () => {
  it('accepts trimmed non-empty names', () => {
    expect(
      DocumentTypeNamesSchema.safeParse({ typeNames: ['Contract'] }).success
    ).toBe(true)
  })
  it('rejects empty string after trim', () => {
    expect(
      DocumentTypeNamesSchema.safeParse({ typeNames: ['   '] }).success
    ).toBe(false)
  })
  it('rejects name over 60 chars', () => {
    expect(
      DocumentTypeNamesSchema.safeParse({ typeNames: ['x'.repeat(61)] }).success
    ).toBe(false)
  })
})

describe('AddSignerSchema', () => {
  it('accepts name and email', () => {
    expect(
      AddSignerSchema.safeParse({
        signer_name: 'A',
        signer_email: 'a@b.co',
      }).success
    ).toBe(true)
  })
  it('rejects empty name', () => {
    expect(
      AddSignerSchema.safeParse({
        signer_name: '',
        signer_email: 'a@b.co',
      }).success
    ).toBe(false)
  })
  it('rejects invalid email', () => {
    expect(
      AddSignerSchema.safeParse({
        signer_name: 'A',
        signer_email: 'bad',
      }).success
    ).toBe(false)
  })
})

describe('SendDocumentSchema', () => {
  it('accepts valid document_id', () => {
    expect(
      SendDocumentSchema.safeParse({ document_id: validUuid }).success
    ).toBe(true)
  })
  it('rejects invalid uuid', () => {
    expect(
      SendDocumentSchema.safeParse({ document_id: 'nope' }).success
    ).toBe(false)
  })
})

describe('CompanyCreateSchema', () => {
  it('accepts name', () => {
    expect(CompanyCreateSchema.safeParse({ name: 'Acme' }).success).toBe(true)
  })
  it('rejects empty name', () => {
    expect(CompanyCreateSchema.safeParse({ name: '' }).success).toBe(false)
  })
  it('rejects name over 120 chars', () => {
    expect(
      CompanyCreateSchema.safeParse({ name: 'x'.repeat(121) }).success
    ).toBe(false)
  })
})

describe('CompanyUpdateSchema', () => {
  it('matches create rules', () => {
    expect(CompanyUpdateSchema.safeParse({ name: 'Acme' }).success).toBe(true)
    expect(CompanyUpdateSchema.safeParse({ name: '' }).success).toBe(false)
  })
})

describe('AddCompanyMemberSchema', () => {
  it('accepts email', () => {
    expect(
      AddCompanyMemberSchema.safeParse({ email: 'u@example.com' }).success
    ).toBe(true)
  })
  it('rejects invalid email', () => {
    expect(AddCompanyMemberSchema.safeParse({ email: 'x' }).success).toBe(false)
  })
})

describe('CreateInvitationSchema', () => {
  it('accepts email role and company ids', () => {
    expect(
      CreateInvitationSchema.safeParse({
        email: 'u@example.com',
        role: 'admin',
        companyIds: [validUuid],
      }).success
    ).toBe(true)
  })
  it('rejects invalid role', () => {
    expect(
      CreateInvitationSchema.safeParse({
        email: 'u@example.com',
        role: 'superuser',
      }).success
    ).toBe(false)
  })
  it('rejects invalid company id', () => {
    expect(
      CreateInvitationSchema.safeParse({
        email: 'u@example.com',
        role: 'member',
        companyIds: ['bad'],
      }).success
    ).toBe(false)
  })
})
