import { describe, expect, it } from 'vitest'
import { mapSupabaseAuditRows } from '@/lib/map-audit-log-row'

describe('mapSupabaseAuditRows', () => {
  it('returns empty array for null, undefined, or empty', () => {
    expect(mapSupabaseAuditRows(null)).toEqual([])
    expect(mapSupabaseAuditRows(undefined)).toEqual([])
    expect(mapSupabaseAuditRows([])).toEqual([])
  })

  it('maps profiles object to actor', () => {
    const rows = [
      {
        id: '1',
        actor_id: 'a',
        action: 'x',
        entity_type: 'document',
        entity_id: 'e',
        metadata: {},
        created_at: '2020-01-01',
        profiles: { id: 'a', email: 'e@x.com', full_name: 'N' },
      },
    ]
    const out = mapSupabaseAuditRows(rows)
    expect(out).toHaveLength(1)
    expect(out[0].actor).toEqual(rows[0].profiles)
  })

  it('uses first element when profiles is array', () => {
    const actor = { id: 'a', email: 'e@x.com', full_name: 'N' }
    const out = mapSupabaseAuditRows([
      {
        id: '1',
        actor_id: 'a',
        action: 'x',
        entity_type: 'document',
        entity_id: 'e',
        metadata: {},
        created_at: '2020-01-01',
        profiles: [actor, { id: 'b', email: 'b@x.com', full_name: 'B' }],
      },
    ])
    expect(out[0].actor).toEqual(actor)
  })

  it('sets actor undefined when profiles null', () => {
    const out = mapSupabaseAuditRows([
      {
        id: '1',
        actor_id: null,
        action: 'x',
        entity_type: 'document',
        entity_id: null,
        metadata: {},
        created_at: '2020-01-01',
        profiles: null,
      },
    ])
    expect(out[0].actor).toBeUndefined()
  })
})
