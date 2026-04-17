import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const { data, error } = await supabase
  .from('signatures')
  .select('id, ots_proof')
  .not('ots_proof', 'is', null)
  .limit(1)

if (error) {
  console.error(error)
  process.exit(1)
}

const row = data?.[0]
if (!row) {
  console.log('no rows with ots_proof')
  process.exit(0)
}

const v = row.ots_proof as unknown
console.log('typeof:', typeof v)
console.log('isBuffer:', Buffer.isBuffer(v))
console.log('isUint8Array:', v instanceof Uint8Array)
if (typeof v === 'string') {
  console.log('len:', v.length)
  console.log('first 60 chars:', v.slice(0, 60))
}
console.log('raw:', v)
