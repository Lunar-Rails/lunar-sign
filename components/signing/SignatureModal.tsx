'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { SignatureCaptureForm } from '@/components/signing/SignatureCaptureForm'

export interface SignatureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  displayName: string
  onAccept: (dataUrl: string) => void
}

export function SignatureModal({ open, onOpenChange, displayName, onAccept }: SignatureModalProps) {
  const [draftUrl, setDraftUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) setDraftUrl(null)
  }, [open])

  function handleAccept() {
    if (!draftUrl) return
    onAccept(draftUrl)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Signature</DialogTitle>
          <DialogDescription asChild>
            <p className="text-caption text-lr-muted">
              Choose how your signature appears on the document.
            </p>
          </DialogDescription>
        </DialogHeader>

        <SignatureCaptureForm
          displayName={displayName}
          onSignatureDataUrl={setDraftUrl}
        />

        <p className="text-caption text-lr-muted leading-relaxed">
          By electronically signing this document, you agree that your signature is the legal equivalent of your
          handwritten signature on paper. The signed PDF will be recorded with the details shown in your session.
        </p>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!draftUrl} onClick={handleAccept}>
            Accept and sign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
