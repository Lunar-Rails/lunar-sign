'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface IntentConfirmDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function IntentConfirmDialog({ open, onConfirm, onCancel }: IntentConfirmDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm your signature</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-lr-sm text-lr-text-2">
              <p>
                By clicking <strong className="text-lr-text">Sign Document</strong>, you:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Adopt the signature above as your legal signature</li>
                <li>Agree to be legally bound by this document</li>
                <li>
                  Acknowledge that your electronic signature has the same legal effect as a
                  handwritten signature under the U.S. ESIGN Act and UETA
                </li>
              </ul>
              <p className="text-lr-xs text-lr-muted">
                This action cannot be undone. If you do not wish to sign, click Cancel.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-lr-accent text-white hover:bg-lr-accent-hover"
          >
            Sign Document
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
