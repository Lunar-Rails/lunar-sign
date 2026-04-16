'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Bell, Loader2 } from 'lucide-react'

interface ReminderButtonProps {
  documentId: string
  pendingCount: number
}

export function ReminderButton({ documentId, pendingCount }: ReminderButtonProps) {
  const [isSending, setIsSending] = useState(false)

  async function handleClick() {
    setIsSending(true)
    try {
      const response = await fetch(`/api/documents/${documentId}/remind`, { method: 'POST' })
      const data = (await response.json()) as { message?: string; error?: string }

      if (!response.ok) throw new Error(data.error || 'Failed to send reminders')

      toast.success(data.message ?? 'Reminder sent')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send reminders')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleClick}
      disabled={isSending || pendingCount === 0}
    >
      {isSending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      {isSending ? 'Sending…' : 'Send reminder'}
    </Button>
  )
}
