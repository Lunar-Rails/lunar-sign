import { z } from 'zod'

export const DocumentUploadSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
})

export const DocumentCompanyIdsSchema = z.object({
  companyIds: z.array(z.string().uuid('Invalid company ID')).default([]),
})

const DocumentTypeNameSchema = z
  .string()
  .trim()
  .min(1, 'Document type name is required')
  .max(60, 'Document type name is too long')

export const DocumentTypeNamesSchema = z.object({
  typeNames: z.array(DocumentTypeNameSchema).default([]),
})

export const AddSignerSchema = z.object({
  signer_name: z.string().min(1, 'Signer name is required'),
  signer_email: z.string().email('Invalid email address'),
})

export const SendDocumentSchema = z.object({
  document_id: z.string().uuid('Invalid document ID'),
})

export const CompanyCreateSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(120, 'Name is too long'),
})

export const CompanyUpdateSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(120, 'Name is too long'),
})

export const AddCompanyMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const CreateInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member']),
  companyIds: z.array(z.string().uuid('Invalid company ID')).default([]),
})

const percentSchema = z.number().min(0).max(100)

export const StoredFieldTypeSchema = z.enum([
  'signature',
  'fullName',
  'title',
  'date',
  'text',
])

export const StoredFieldSchema = z.object({
  id: z.string().min(1, 'Field id is required'),
  type: StoredFieldTypeSchema,
  pageIndex: z.number().int().min(0),
  xPercent: percentSchema,
  yPercent: percentSchema,
  widthPercent: percentSchema,
  heightPercent: percentSchema,
  label: z.string().optional(),
  value: z.string().optional(),
  forSigner: z.boolean(),
})

export const FieldMetadataSchema = z.array(StoredFieldSchema)

export const DocumentFromTemplateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  field_values: z.record(z.string(), z.string()).default({}),
  signers: z
    .array(AddSignerSchema)
    .min(1, 'At least one signer is required'),
  /** When true (default), set document to pending and email signers. */
  send_now: z.boolean().optional().default(true),
})

export const TemplateUpdateBodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  document_type_id: z.string().uuid().nullable().optional(),
  field_metadata: FieldMetadataSchema.optional(),
  companyIds: z.array(z.string().uuid()).optional(),
})

export type DocumentUploadInput = z.infer<typeof DocumentUploadSchema>
export type DocumentCompanyIdsInput = z.infer<typeof DocumentCompanyIdsSchema>
export type DocumentTypeNamesInput = z.infer<typeof DocumentTypeNamesSchema>
export type AddSignerInput = z.infer<typeof AddSignerSchema>
export type SendDocumentInput = z.infer<typeof SendDocumentSchema>
export type CompanyCreateInput = z.infer<typeof CompanyCreateSchema>
export type CompanyUpdateInput = z.infer<typeof CompanyUpdateSchema>
export type AddCompanyMemberInput = z.infer<typeof AddCompanyMemberSchema>
export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>
export type StoredFieldInput = z.infer<typeof StoredFieldSchema>
export type DocumentFromTemplateInput = z.infer<typeof DocumentFromTemplateSchema>
export type TemplateUpdateBodyInput = z.infer<typeof TemplateUpdateBodySchema>
