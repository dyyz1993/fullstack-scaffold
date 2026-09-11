import { existsSync, mkdirSync, readFileSync } from 'fs'
import { dirname } from 'path'
import { createHash } from 'crypto'
import { getDatabaseConfig, type DatabaseConfig } from '../config'
import * as schema from './schema'
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql'
import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import { createClient, type Client } from '@libsql/client'
import { logger } from '../utils/logger'
import { isCloudflare } from '../utils/env'

type LibSQLDb = ReturnType<typeof drizzleLibsql<typeof schema>>
type D1Db = ReturnType<typeof drizzleD1<typeof schema>>
type Db = LibSQLDb | D1Db

let _db: Db | null = null
let _client: Client | null = null

const log = logger.db()

export async function getDb(): Promise<Db> {
  if (_db) return _db

  const config = getDatabaseConfig()

  log.debug({ driver: config.driver }, 'Creating database connection')

  if (config.driver === 'd1') {
    _db = createD1Db(config)
  } else {
    const result = createSqliteDb(config)
    _db = result.db
    _client = result.client
  }

  log.info({ driver: config.driver }, 'Database connected')
  return _db
}

function createSqliteDb(config: DatabaseConfig): { db: LibSQLDb; client: Client } {
  if (isCloudflare) {
    throw new Error('SQLite is not supported in Cloudflare Workers. Use D1 instead.')
  }

  const dbPath = config.sqlitePath || './data/app.db'

  if (dbPath !== ':memory:') {
    const dbDir = dirname(dbPath)
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true })
      log.debug({ dir: dbDir }, 'Created database directory')
    }
  }

  const client = createClient({ url: dbPath === ':memory:' ? ':memory:' : `file:${dbPath}` })
  const db = drizzleLibsql(client, { schema })

  log.debug({ path: dbPath }, 'SQLite database created')
  return { db, client }
}

function createD1Db(config: DatabaseConfig): D1Db {
  if (!config.d1Database) {
    throw new Error('D1 database binding not found. Make sure D1 is configured in wrangler.toml')
  }

  return drizzleD1(config.d1Database, { schema })
}

export async function getRawClient(): Promise<Client | D1Database | null> {
  const config = getDatabaseConfig()

  if (config.driver === 'sqlite') {
    if (!_client) {
      await getDb()
    }
    return _client
  }

  if (config.driver === 'd1') {
    return config.d1Database || null
  }

  return null
}

export async function closeDb(): Promise<void> {
  const config = getDatabaseConfig()

  if (config.driver === 'sqlite' && _client) {
    _client.close()
    _client = null
    _db = null
    log.info({}, 'Database connection closed')
  }
}

/**
 * 账本补齐：db:push 建出的库有表但没有 __drizzle_migrations 记录，
 * migrate 会重放 0000 的 CREATE TABLE 撞表崩溃（部署流水线先 push 后
 * start 即此形态）。检测到该历史时，把已带当前 schema 的库按"迁移已
 * 应用"补记账本（hash=SQL 文件 sha256、created_at=journal.when，与
 * drizzle migrator 自身写入格式一致），migrate 随后即成 no-op。
 */
async function stampJournalIfPushBuilt(migrationsFolder: string): Promise<void> {
  if (!_client || !('execute' in _client)) return

  // 核心表 + 租户表都在（= 当前 schema 形态、由 push 建成）
  const shape = await _client.execute(
    "SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name IN ('todos','tenants')"
  )
  if (Number(shape.rows[0]?.c ?? 0) < 2) return

  const journalTable = await _client.execute(
    "SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'"
  )
  if (Number(journalTable.rows[0]?.c ?? 0) > 0) {
    const applied = await _client.execute('SELECT COUNT(*) AS c FROM __drizzle_migrations')
    if (Number(applied.rows[0]?.c ?? 0) > 0) return
  }

  const metaPath = `${migrationsFolder}/meta/_journal.json`
  if (!existsSync(metaPath)) return
  const meta = JSON.parse(readFileSync(metaPath, 'utf-8')) as {
    entries: Array<{ tag: string; when: number }>
  }

  await _client.execute(
    'CREATE TABLE IF NOT EXISTS __drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)'
  )
  for (const entry of meta.entries) {
    const sqlText = readFileSync(`${migrationsFolder}/${entry.tag}.sql`, 'utf-8')
    const hash = createHash('sha256').update(sqlText).digest('hex')
    await _client.execute({
      sql: 'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
      args: [hash, entry.when],
    })
  }
  log.warn(
    { entries: meta.entries.length },
    'Push-built database detected — migration journal stamped as applied (schema already current)'
  )
}

export async function runMigrations(): Promise<void> {
  if (isCloudflare) {
    log.info({}, 'Migrations skipped in Cloudflare Workers')
    return
  }

  const config = getDatabaseConfig()

  if (config.driver === 'sqlite' && _db) {
    const migrationsFolder = './drizzle'

    if (existsSync(migrationsFolder)) {
      const { migrate } = await import('drizzle-orm/libsql/migrator')
      await stampJournalIfPushBuilt(migrationsFolder)
      await migrate(_db as LibSQLDb, { migrationsFolder })
      log.info({ folder: migrationsFolder }, 'Migrations applied')
    } else {
      log.warn({ folder: migrationsFolder }, 'No migrations folder found')
    }
  }
}
