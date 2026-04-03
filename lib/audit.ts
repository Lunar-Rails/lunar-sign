import { getServiceClient } from '@/lib/supabase/service'

export async function logAudit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = getServiceClient()

    const { error } = await supabase
      .from('audit_logs')
      .insert(
        [
          {
            actor_id: actorId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            metadata,
          },
        ] as any
      )

    if (error) {
      console.error('Audit log error:', error)
    }
  } catch (error) {
    console.error('Failed to log audit:', error)
    // Don't throw - audit logging failures shouldn't break the flow
  }
}
