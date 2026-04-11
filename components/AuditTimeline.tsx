import { AuditLogWithActor } from '@/lib/types'

interface AuditTimelineProps {
  logs: AuditLogWithActor[]
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    document_uploaded: 'Document uploaded',
    signer_added: 'Signer added',
    signer_removed: 'Signer removed',
    document_sent: 'Document sent for signing',
    document_signed: 'Document signed',
    document_viewed: 'Document viewed',
    document_completed: 'Document completed',
    document_cancelled: 'Signing request revoked',
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
    case 'document_signed':
    case 'document_completed':
      return 'bg-lr-cyan'
    case 'document_cancelled':
      return 'bg-lr-error'
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
    <div className="rounded-lr-lg border border-lr-border bg-lr-surface p-5 shadow-lr-card">
      <h2 className="mb-4 font-display text-lr-xl font-semibold text-lr-text">Activity</h2>

      {logs.length === 0 ? (
        <p className="text-lr-sm text-lr-muted">No activity yet.</p>
      ) : (
        <div className="space-y-0">
          {logs.map((log, index) => {
            const actorLine = getActorLine(log)
            return (
              <div key={log.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${getDotClass(log.action)}`} />
                  {index < logs.length - 1 && (
                    <div className="flex-1 w-0.5 bg-lr-border mt-1" />
                  )}
                </div>

                <div className="pb-4 flex-1">
                  <p className="text-lr-sm font-medium text-lr-text">
                    {getActionLabel(log.action)}
                  </p>
                  {actorLine && (
                    <p className="text-lr-xs text-lr-muted">{actorLine}</p>
                  )}
                  <p className="text-lr-xs text-lr-muted">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
