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

function getDotClassName(action: string): string {
  switch (action) {
    case 'document_uploaded':
      return 'bg-blue-500'
    case 'document_sent':
      return 'bg-sky-500'
    case 'signer_added':
    case 'signer_removed':
      return 'bg-violet-500'
    case 'document_signed':
    case 'document_completed':
      return 'bg-green-500'
    case 'document_viewed':
      return 'bg-gray-400'
    case 'document_cancelled':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
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
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Activity</h2>

      {logs.length === 0 ? (
        <p className="text-sm text-gray-500">No activity yet.</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log, index) => {
            const actorLine = getActorLine(log)
            return (
              <div key={log.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-2 w-2 shrink-0 rounded-full ${getDotClassName(log.action)}`}
                  />
                  {index < logs.length - 1 && (
                    <div className="mt-1 h-6 w-0.5 bg-gray-200" />
                  )}
                </div>

                <div className="flex-1 pb-4">
                  <p className="text-sm font-medium text-gray-900">
                    {getActionLabel(log.action)}
                  </p>
                  {actorLine && (
                    <p className="text-xs text-gray-600">{actorLine}</p>
                  )}
                  <p className="text-xs text-gray-500">
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

