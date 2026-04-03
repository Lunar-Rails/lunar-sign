import { getServiceClient } from '@/lib/supabase/service'

import { mapSupabaseAuditRows } from '@/lib/map-audit-log-row'

export const dynamic = 'force-dynamic'

export default async function AdminAuditLogPage() {
  const supabase = getServiceClient()

  const { data: auditLogs } = await supabase
    .from('audit_log')
    .select(
      `
      id,
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata,
      created_at,
      profiles:actor_id(email, full_name)
    `
    )
    .order('created_at', { ascending: false })
    .limit(500)

  const logs = mapSupabaseAuditRows(auditLogs)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
        <p className="mt-2 text-gray-600">
          View all system activities and changes.
        </p>
      </div>

      <div className="mt-8 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Actor
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Action
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Entity
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-600">
                  No audit logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {log.actor ? (
                      <div>
                        <div className="font-medium">{log.actor.full_name}</div>
                        <div className="text-xs text-gray-500">{log.actor.email}</div>
                      </div>
                    ) : (
                      <span className="text-gray-500">System</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>{log.entity_type}</div>
                    {log.entity_id && (
                      <div className="text-xs text-gray-500 font-mono">
                        {log.entity_id.substring(0, 8)}...
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-600">
        Showing latest 500 entries. For older logs, check your audit log database.
      </p>
    </div>
  )
}
