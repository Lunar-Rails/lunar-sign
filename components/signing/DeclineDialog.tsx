'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface DeclineDialogProps {
  open: boolean
  documentTitle: string
  declining: boolean
  onDecline: (reason: string) => void
  onCancel: () => void
}

export function DeclineDialog({
  open,
  documentTitle,
  declining,
  onDecline,
  onCancel,
}: DeclineDialogProps) {
  const [reason, setReason] = useState('')

  const handleDecline = () => {
    onDecline(reason)
    setReason('')
  }

  const handleCancel = () => {
    setReason('')
    onCancel()
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Decline to sign?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-body text-lr-text-2">
              <p>
                You are about to decline signing{' '}
                <strong className="text-lr-text">{documentTitle}</strong>. The document will be
                cancelled and the owner will be notified. This action cannot be undone.
              </p>
              <div>
                <label
                  htmlFor="decline-reason"
                  className="block text-caption font-medium text-lr-text-2 mb-1.5"
                >
                  Reason{' '}
                  <span className="text-lr-muted font-normal">(optional)</span>
                </label>
                <textarea
                  id="decline-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. Terms need to be revised"
                  className="w-full resize-none rounded-lr border border-lr-border bg-lr-bg/60 px-3 py-2 text-body text-lr-text placeholder:text-lr-muted outline-none transition-all duration-lr-fast focus:border-lr-accent focus:ring-2 focus:ring-lr-accent/30"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={declining}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDecline}
            disabled={declining}
          >
            {declining ? 'Declining…' : 'Decline to sign'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
