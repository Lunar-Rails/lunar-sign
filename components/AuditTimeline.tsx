import { AuditLog } from '@/lib/types'

interface AuditTimelineProps {
  logs: AuditLog[]
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    document_uploaded: 'Document uploaded',
    signer_added: 'Signer added',
    signer_removed: 'Signer removed',
    document_sent: 'Document sent for signing',
    signature_added: 'Signature added',
    document_completed: 'Document completed',
  }
  return labels[action] || action
}

export default function AuditTimeline({ logs }: AuditTimelineProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Activity</h2>

      {logs.length === 0 ? (
        <p className="text-sm text-gray-500">No activity yet.</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log, index) => (
            <div key={log.id} className="flex gap-3">
              {/* Timeline dot and line */}
              <div className="flex flex-col items-center">
                <div className="h-2 w-2 rounded-full bg-gray-400" />
                {index < logs.length - 1 && (
                  <div className="mt-1 h-6 w-0.5 bg-gray-200" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <p className="text-sm font-medium text-gray-900">
                  {getActionLabel(log.action)}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(log.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
