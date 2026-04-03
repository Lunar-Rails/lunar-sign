/**
 * Applies SQL migration files from supabase/migrations/ to the remote database.
 *
 * Usage:
 *   pnpm db:migrate          — apply all pending migrations
 *   pnpm db:migrate:status   — show which migrations are applied / pending
 *
 * Requires SUPABASE_DB_URL in .env.local:
 *   postgresql://postgres.[project-ref]:[password]@[host]:6543/postgres
 */

import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import postgres, { type Sql } from 'postgres'

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations')
const MIGRATIONS_TABLE = '_migrations'

function getSql() {
  const url = process.env.SUPABASE_DB_URL
  if (!url) {
    console.error(
      '\n  Error: SUPABASE_DB_URL is not set.\n' +
      '  Add it to .env.local:\n\n' +
      '    SUPABASE_DB_URL=postgresql://postgres.[project-ref]:[password]@[host]:6543/postgres\n\n' +
      '  Get it from: Supabase Dashboard → Settings → Database → Connection string (URI)\n'
    )
    process.exit(1)
  }
  return postgres(url, { max: 1, ssl: 'require' })
}

async function ensureMigrationsTable(sql: Sql) {
  await sql`
    create table if not exists ${sql(MIGRATIONS_TABLE)} (
      id         serial      primary key,
      name       text        not null unique,
      applied_at timestamptz not null default now()
    )
  `
}

async function getAppliedMigrations(sql: Sql): Promise<Set<string>> {
  const rows = await sql<{ name: string }[]>`
    select name from ${sql(MIGRATIONS_TABLE)} order by id
  `
  return new Set(rows.map((r) => r.name))
}

async function getMigrationFiles(): Promise<string[]> {
  const files = await readdir(MIGRATIONS_DIR)
  return files
    .filter((f) => f.endsWith('.sql'))
    .sort()
}

async function runMigrations() {
  const sql = getSql()

  try {
    await ensureMigrationsTable(sql)
    const applied = await getAppliedMigrations(sql)
    const files = await getMigrationFiles()
    const pending = files.filter((f) => !applied.has(f))

    if (pending.length === 0) {
      console.log('  No pending migrations.')
      return
    }

    console.log(`  Found ${pending.length} pending migration(s):\n`)

    for (const file of pending) {
      const content = await readFile(join(MIGRATIONS_DIR, file), 'utf8')

      process.stdout.write(`  → ${file} ... `)

      await sql.begin(async (tx) => {
        await tx.unsafe(content)
        await tx.unsafe(
          `insert into "${MIGRATIONS_TABLE}" (name) values ($1)`,
          [file]
        )
      })

      console.log('done')
    }

    console.log(`\n  ${pending.length} migration(s) applied successfully.`)
  } finally {
    await sql.end()
  }
}

async function showStatus() {
  const sql = getSql()

  try {
    await ensureMigrationsTable(sql)
    const applied = await getAppliedMigrations(sql)
    const files = await getMigrationFiles()

    console.log('\n  Migration status:\n')

    if (files.length === 0) {
      console.log('  No migration files found in supabase/migrations/\n')
      return
    }

    for (const file of files) {
      const status = applied.has(file) ? '✓ applied' : '○ pending'
      console.log(`  ${status}  ${file}`)
    }

    const orphaned = files.length > 0
      ? Array.from(applied).filter((name) => !files.includes(name))
      : []

    for (const name of orphaned) {
      console.log(`  ! orphaned (file deleted)  ${name}`)
    }

    console.log()
  } finally {
    await sql.end()
  }
}

const command = process.argv[2]

if (command === 'status') {
  showStatus().catch((err) => { console.error(err); process.exit(1) })
} else {
  runMigrations().catch((err) => { console.error(err); process.exit(1) })
}
