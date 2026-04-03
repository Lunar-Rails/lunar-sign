import type { AuditLogActorPreview, AuditLogWithActor } from '@/lib/types'

type SupabaseAuditRow = {
  id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  profiles?: AuditLogActorPreview | AuditLogActorPreview[] | null
}

function actorFromJoin(
  profiles: AuditLogActorPreview | AuditLogActorPreview[] | null | undefined
): AuditLogActorPreview | undefined {
  if (profiles == null) return undefined
  return Array.isArray(profiles) ? profiles[0] : profiles
}

/** Map PostgREST `profiles:actor_id(...)` join to `AuditLogWithActor`. */
export function mapSupabaseAuditRows(
  rows: unknown[] | null | undefined
): AuditLogWithActor[] {
  if (!rows?.length) return []
  return rows.map((row) => {
    const r = row as SupabaseAuditRow
    return {
      id: r.id,
      actor_id: r.actor_id,
      action: r.action,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      metadata: r.metadata,
      created_at: r.created_at,
      actor: actorFromJoin(r.profiles),
    }
  })
}
