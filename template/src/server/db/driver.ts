import { getDatabaseConfig, type DatabaseConfig } from './config';
import * as schema from './schema';
import { LibSQLDatabase } from 'drizzle-orm/libsql';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client';
import { migrate } from 'drizzle-orm/libsql/migrator';

type Db = LibSQLDatabase<typeof schema>;

let _db: Db | null = null;
let _client: Client | null = null;

export async function getDb(): Promise<Db> {
  if (_db) return _db;
  
  const config = getDatabaseConfig();
  
  if (config.driver === 'd1') {
    _db = createD1Db(config);
  } else {
    const result = await createSqliteDb(config);
    _db = result.db;
    _client = result.client;
  }
  
  return _db;
}

async function createSqliteDb(config: DatabaseConfig): Promise<{ db: Db; client: Client }> {
  const { existsSync, mkdirSync } = await import('node:fs');
  const { dirname } = await import('node:path');
  
  const dbPath = config.sqlitePath || './data/app.db';
  const dbDir = dirname(dbPath);
  
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  
  const client = createClient({ url: `file:${dbPath}` });
  const db = drizzleLibsql(client, { schema });
  
  return { db, client };
}

function createD1Db(config: DatabaseConfig): Db {
  if (!config.d1Database) {
    throw new Error('D1 database binding not found. Make sure D1 is configured in wrangler.toml');
  }
  
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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
  }
}

export async function runMigrations(): Promise<void> {
  const config = getDatabaseConfig();
  
  if (config.driver === 'sqlite' && _db) {
    const { existsSync } = await import('node:fs');
    const migrationsFolder = './drizzle';
    
    if (existsSync(migrationsFolder)) {
      await migrate(_db, { migrationsFolder });
    } else {
      console.warn('No migrations folder found. Run `npm run db:generate` first.');
    }
  }
}

process.on('SIGINT', async () => {
  await closeDb();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDb();
  process.exit(0);
});
