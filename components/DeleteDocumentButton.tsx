'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export interface DeleteDocumentButtonProps {
  documentId: string
  documentTitle: string
  /** When true, renders a square icon-only button (for use in tables/lists). */
  iconOnly?: boolean
  /** Called after successful deletion instead of the default redirect to /documents. */
  onDeleted?: () => void
}

export function DeleteDocumentButton({
  documentId,
  documentTitle,
  iconOnly,
  onDeleted,
}: DeleteDocumentButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setError(null)
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to delete document')
      setOpen(false)
      if (onDeleted) {
        onDeleted()
      } else {
        router.push('/documents')
        router.refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {iconOnly ? (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="h-8 w-8 shrink-0"
            title={`Delete "${documentTitle}"`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" variant="destructive" size="sm">
            Delete document
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete document?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-lr-text">{documentTitle}</span> will be permanently
            removed. Any pending signers will no longer be able to access it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-lr-sm text-lr-error">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isDeleting} onClick={(e) => { e.preventDefault(); handleDelete() }}>
            {isDeleting ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
