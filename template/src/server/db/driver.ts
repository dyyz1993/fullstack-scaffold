import { getDatabaseConfig, type DatabaseConfig } from '../config';
import * as schema from './schema';
import { LibSQLDatabase } from 'drizzle-orm/libsql';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client';
import { logger } from '../lib/logger';
import { isCloudflare } from '../utils/env';

type Db = LibSQLDatabase<typeof schema>;

let _db: Db | null = null;
let _client: Client | null = null;

const log = logger.db();

export async function getDb(): Promise<Db> {
  if (_db) return _db;
  
  const config = getDatabaseConfig();
  
  log.debug({ driver: config.driver }, 'Creating database connection');
  
  if (config.driver === 'd1') {
    _db = createD1Db(config);
  } else {
    const result = await createSqliteDb(config);
    _db = result.db;
    _client = result.client;
  }
  
  log.info({ driver: config.driver }, 'Database connected');
  return _db;
}

async function createSqliteDb(config: DatabaseConfig): Promise<{ db: Db; client: Client }> {
  if (isCloudflare) {
    throw new Error('SQLite is not supported in Cloudflare Workers. Use D1 instead.');
  }
  
  // Node.js only - these requires will not be executed in Cloudflare
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { existsSync, mkdirSync } = require('node:fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { dirname } = require('node:path');
  
  const dbPath = config.sqlitePath || './data/app.db';
  const dbDir = dirname(dbPath);
  
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
    log.debug({ dir: dbDir }, 'Created database directory');
  }
  
  const client = createClient({ url: `file:${dbPath}` });
  const db = drizzleLibsql(client, { schema });
  
  log.debug({ path: dbPath }, 'SQLite database created');
  return { db, client };
}

function createD1Db(config: DatabaseConfig): Db {
  if (!config.d1Database) {
    throw new Error('D1 database binding not found. Make sure D1 is configured in wrangler.toml');
  }
  
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { drizzle: drizzleD1 } = require('drizzle-orm/d1');
  return drizzleD1(config.d1Database, { schema });
}

export async function getRawClient(): Promise<Client | D1Database | null> {
  const config = getDatabaseConfig();
  
  if (config.driver === 'sqlite') {
    if (!_client) {
      await getDb();
    }
    return _client;
  }
  
  if (config.driver === 'd1') {
    return config.d1Database || null;
  }
  
  return null;
}

export async function closeDb(): Promise<void> {
  const config = getDatabaseConfig();
  
  if (config.driver === 'sqlite' && _client) {
    _client.close();
    _client = null;
    _db = null;
    log.info({}, 'Database connection closed');
  }
}

export async function runMigrations(): Promise<void> {
  if (isCloudflare) {
    log.info({}, 'Migrations skipped in Cloudflare Workers');
    return;
  }
  
  const config = getDatabaseConfig();
  
  if (config.driver === 'sqlite' && _db) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { existsSync } = require('node:fs');
    const migrationsFolder = './drizzle';
    
    if (existsSync(migrationsFolder)) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { migrate } = require('drizzle-orm/libsql/migrator');
      await migrate(_db, { migrationsFolder });
      log.info({ folder: migrationsFolder }, 'Migrations applied');
    } else {
      log.warn({ folder: migrationsFolder }, 'No migrations folder found');
    }
  }
}
