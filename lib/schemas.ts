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

export type DocumentUploadInput = z.infer<typeof DocumentUploadSchema>
export type DocumentCompanyIdsInput = z.infer<typeof DocumentCompanyIdsSchema>
export type DocumentTypeNamesInput = z.infer<typeof DocumentTypeNamesSchema>
export type AddSignerInput = z.infer<typeof AddSignerSchema>
export type SendDocumentInput = z.infer<typeof SendDocumentSchema>
export type CompanyCreateInput = z.infer<typeof CompanyCreateSchema>
export type CompanyUpdateInput = z.infer<typeof CompanyUpdateSchema>
export type AddCompanyMemberInput = z.infer<typeof AddCompanyMemberSchema>
export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>
