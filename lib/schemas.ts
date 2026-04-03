import { z } from 'zod'

export const DocumentUploadSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
})

export const AddSignerSchema = z.object({
  signer_name: z.string().min(1, 'Signer name is required'),
  signer_email: z.string().email('Invalid email address'),
})

export const SendDocumentSchema = z.object({
  document_id: z.string().uuid('Invalid document ID'),
})

export type DocumentUploadInput = z.infer<typeof DocumentUploadSchema>
export type AddSignerInput = z.infer<typeof AddSignerSchema>
export type SendDocumentInput = z.infer<typeof SendDocumentSchema>
