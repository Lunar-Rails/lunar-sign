import { AuditLogWithActor } from '@/lib/types'

interface AuditTimelineProps {
  logs: AuditLogWithActor[]
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    document_uploaded: 'Document uploaded',
    document_fields_updated: 'Signature fields saved',
    signer_added: 'Signer added',
    signer_removed: 'Signer removed',
    document_sent: 'Document sent for signing',
    document_signed: 'Document signed',
    document_viewed: 'Document viewed',
    document_completed: 'Document completed',
    document_cancelled: 'Signing request revoked',
    document_reminder_sent: 'Reminder sent',
  }
  return labels[action] || action.replace(/_/g, ' ')
}

function getDotClass(action: string): string {
  switch (action) {
    case 'document_uploaded':
    case 'document_sent':
      return 'bg-lr-accent'
    case 'signer_added':
    case 'signer_removed':
      return 'bg-lr-accent-soft'
    case 'document_fields_updated':
      return 'bg-lr-accent-soft'
    case 'document_signed':
    case 'document_completed':
      return 'bg-lr-cyan'
    case 'document_cancelled':
      return 'bg-lr-error'
    case 'document_reminder_sent':
      return 'bg-lr-warning'
    default:
      return 'bg-lr-muted'
  }
}

function getActorLine(log: AuditLogWithActor): string | null {
  const name = log.actor?.full_name?.trim()
  if (name) return name
  if (log.actor?.email) return log.actor.email
  const signerEmail = log.metadata?.signer_email
  if (typeof signerEmail === 'string' && signerEmail) return signerEmail
  return null
}

export function AuditTimeline({ logs }: AuditTimelineProps) {
  return (
    <div className="rounded-lr-lg border border-lr-border bg-lr-surface shadow-lr-card">
      <div className="border-b border-lr-border px-4 py-3">
        <h2 className="font-display text-lr-sm font-semibold text-lr-text">Activity</h2>
      </div>

      {logs.length === 0 ? (
        <p className="px-4 py-4 text-lr-sm text-lr-muted">No activity yet.</p>
      ) : (
        <div className="max-h-72 overflow-y-auto px-4 py-3">
          <div className="space-y-0">
            {logs.map((log, index) => {
              const actorLine = getActorLine(log)
              return (
                <div key={log.id} className="flex gap-2.5">
                  <div className="flex flex-col items-center pt-1.5">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${getDotClass(log.action)}`} />
                    {index < logs.length - 1 && (
                      <div className="mt-1 flex-1 w-px bg-lr-border" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 pb-3">
                    <p className="text-lr-xs font-medium text-lr-text">
                      {getActionLabel(log.action)}
                    </p>
                    <p className="text-lr-xs text-lr-muted">
                      {actorLine && <>{actorLine} &middot; </>}
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
