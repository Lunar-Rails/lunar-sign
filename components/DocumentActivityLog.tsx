import { cn } from '@/lib/utils'
import type { AuditLogWithActor } from '@/lib/types'

interface DocumentActivityLogProps {
  logs: AuditLogWithActor[]
}

export function DocumentActivityLog({ logs }: DocumentActivityLogProps) {
  return (
    <div className="rounded-lr-lg border border-lr-border bg-lr-surface shadow-lr-card">
      <div className="border-b border-lr-border px-4 py-3">
        <h2 className="text-card-title">Activity</h2>
      </div>
      <div className="px-4 py-4">
        {logs.length === 0 ? (
          <p className="text-lr-sm text-lr-muted">No activity recorded yet.</p>
        ) : (
          <ol className="space-y-0">
            {logs.map((log, index) => (
              <li key={log.id} className="flex gap-3">
                {/* Timeline spine */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-lr-surface',
                      getDotClass(log.action)
                    )}
                  />
                  {index < logs.length - 1 && (
                    <div className="mt-1 flex-1 w-px bg-lr-border" />
                  )}
                </div>

                {/* Content */}
                <div className={cn('min-w-0 flex-1', index < logs.length - 1 && 'pb-4')}>
                  <p className="text-lr-sm font-medium text-lr-text leading-snug">
                    {getActionLabel(log.action)}
                  </p>
                  <p className="text-lr-xs text-lr-muted mt-0.5 leading-snug">
                    {getDetailLine(log)}
                  </p>
                  <p className="text-lr-xs text-lr-muted mt-0.5">
                    {formatTimestamp(log.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    document_uploaded: 'Document uploaded',
    document_fields_updated: 'Signature fields saved',
    signer_added: 'Signer added',
    signer_removed: 'Signer removed',
    document_sent: 'Sent for signing',
    document_signed: 'Document signed',
    document_completed: 'All signatures collected',
    document_cancelled: 'Signing request revoked',
  }
  return labels[action] ?? action.replace(/_/g, ' ')
}

function getDetailLine(log: AuditLogWithActor): string {
  const meta = log.metadata ?? {}
  const actorName = log.actor?.full_name?.trim() || log.actor?.email || null

  switch (log.action) {
    case 'document_uploaded': {
      const fileName = typeof meta.fileName === 'string' ? meta.fileName : null
      if (actorName && fileName) return `by ${actorName} · ${fileName}`
      if (actorName) return `by ${actorName}`
      if (fileName) return fileName
      return ''
    }
    case 'signer_added':
    case 'signer_removed': {
      const email = typeof meta.signer_email === 'string' ? meta.signer_email : null
      const prefix = log.action === 'signer_added' ? 'Added' : 'Removed'
      if (actorName && email) return `${prefix} ${email} · by ${actorName}`
      if (email) return `${prefix} ${email}`
      if (actorName) return `by ${actorName}`
      return ''
    }
    case 'document_sent': {
      const count = typeof meta.signer_count === 'number' ? meta.signer_count : null
      const signerText = count != null ? `${count} ${count === 1 ? 'signer' : 'signers'} notified` : ''
      if (actorName && signerText) return `by ${actorName} · ${signerText}`
      if (actorName) return `by ${actorName}`
      return signerText
    }
    case 'document_signed': {
      const signerName = typeof meta.signer_name === 'string' ? meta.signer_name : null
      const signerEmail = typeof meta.signer_email === 'string' ? meta.signer_email : null
      if (signerName && signerEmail) return `${signerName} (${signerEmail})`
      return signerName ?? signerEmail ?? ''
    }
    case 'document_completed': {
      const total = typeof meta.total_signers === 'number' ? meta.total_signers : null
      return total != null ? `${total} ${total === 1 ? 'signature' : 'signatures'} collected` : ''
    }
    case 'document_cancelled': {
      return actorName ? `by ${actorName}` : ''
    }
    case 'document_fields_updated': {
      const count = typeof meta.field_count === 'number' ? meta.field_count : null
      const fieldText = count != null ? `${count} ${count === 1 ? 'field' : 'fields'}` : ''
      if (actorName && fieldText) return `by ${actorName} · ${fieldText}`
      if (actorName) return `by ${actorName}`
      return fieldText
    }
    default: {
      return actorName ? `by ${actorName}` : ''
    }
  }
}

function getDotClass(action: string): string {
  switch (action) {
    case 'document_uploaded':
    case 'document_fields_updated':
      return 'bg-lr-accent'
    case 'signer_added':
      return 'bg-lr-accent-soft'
    case 'signer_removed':
      return 'bg-lr-muted'
    case 'document_sent':
      return 'bg-lr-accent'
    case 'document_signed':
      return 'bg-lr-cyan'
    case 'document_completed':
      return 'bg-lr-success'
    case 'document_cancelled':
      return 'bg-lr-error'
    default:
      return 'bg-lr-muted'
  }
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}
