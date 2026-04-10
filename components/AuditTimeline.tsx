import { Activity, CheckCircle2, Clock3, Eye, Send, UserPlus, UserMinus } from 'lucide-react'

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

function getEventMeta(action: string) {
  switch (action) {
    case 'document_uploaded':
      return {
        icon: Activity,
        className:
          'border-[rgba(193,178,255,0.18)] bg-[rgba(124,92,252,0.12)] text-[var(--lr-accent-soft)]',
      }
    case 'document_sent':
      return {
        icon: Send,
        className:
          'border-[rgba(244,197,106,0.24)] bg-[rgba(244,197,106,0.12)] text-[var(--lr-gold)]',
      }
    case 'signer_added':
      return {
        icon: UserPlus,
        className:
          'border-[rgba(193,178,255,0.18)] bg-[rgba(124,92,252,0.12)] text-[var(--lr-accent-soft)]',
      }
    case 'signer_removed':
      return {
        icon: UserMinus,
        className:
          'border-[rgba(255,141,151,0.24)] bg-[rgba(255,141,151,0.12)] text-[var(--lr-danger)]',
      }
    case 'document_signed':
    case 'document_completed':
      return {
        icon: CheckCircle2,
        className:
          'border-[rgba(98,208,196,0.24)] bg-[rgba(98,208,196,0.12)] text-[var(--lr-success)]',
      }
    case 'document_viewed':
      return {
        icon: Eye,
        className:
          'border-[rgba(193,178,255,0.16)] bg-[rgba(255,255,255,0.04)] text-[var(--lr-text-soft)]',
      }
    default:
      return {
        icon: Clock3,
        className:
          'border-[rgba(193,178,255,0.16)] bg-[rgba(255,255,255,0.04)] text-[var(--lr-text-soft)]',
      }
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
    <div className="lr-panel p-6">
      <p className="lr-label">Timeline</p>
      <h2 className="font-display mt-2 text-xl font-semibold text-white">Activity</h2>

      {logs.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--lr-text-muted)]">No activity yet.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {logs.map((log, index) => {
            const actorLine = getActorLine(log)
            const meta = getEventMeta(log.action)
            const Icon = meta.icon

            return (
              <div key={log.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${meta.className}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {index < logs.length - 1 && (
                    <div className="mt-2 h-10 w-px bg-[rgba(193,178,255,0.14)]" />
                  )}
                </div>

                <div className="min-w-0 flex-1 pb-4">
                  <p className="text-sm font-medium text-white">
                    {getActionLabel(log.action)}
                  </p>
                  {actorLine && (
                    <p className="mt-1 text-xs text-[var(--lr-text-soft)]">{actorLine}</p>
                  )}
                  <p className="mt-1 text-xs text-[var(--lr-text-muted)]">
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
