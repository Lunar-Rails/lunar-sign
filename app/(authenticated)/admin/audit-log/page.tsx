import { getServiceClient } from '@/lib/supabase/service'
import { mapSupabaseAuditRows } from '@/lib/map-audit-log-row'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const dynamic = 'force-dynamic'

export default async function AdminAuditLogPage() {
  const supabase = getServiceClient()

  const { data: auditLogs } = await supabase
    .from('audit_log')
    .select('id, actor_id, action, entity_type, entity_id, metadata, created_at, profiles:actor_id(email, full_name)')
    .order('created_at', { ascending: false })
    .limit(500)

  const logs = mapSupabaseAuditRows(auditLogs)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-kicker mb-1">Admin</p>
        <h1 className="text-page-title">Audit Log</h1>
        <p className="text-body mt-1">View all system activities and changes.</p>
      </div>

      <div className="rounded-lr-lg border border-lr-border bg-lr-surface shadow-lr-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-lr-muted py-8">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-lr-muted text-lr-xs">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {log.actor ? (
                      <div>
                        <div className="text-lr-sm font-medium text-lr-text">{log.actor.full_name}</div>
                        <div className="text-lr-xs text-lr-muted">{log.actor.email}</div>
                      </div>
                    ) : (
                      <span className="text-lr-xs text-lr-muted">System</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className="font-mono">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-lr-sm text-lr-muted capitalize">{log.entity_type}</div>
                    {log.entity_id && (
                      <div className="font-mono text-lr-xs text-lr-muted">
                        {log.entity_id.substring(0, 8)}…
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-caption">
        Showing latest 500 entries. For older logs, check your audit log database.
      </p>
    </div>
  )
}
