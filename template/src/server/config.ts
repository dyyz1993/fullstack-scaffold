import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

export type DatabaseDriver = 'sqlite' | 'mysql' | 'd1';

declare global {
  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
    exec(query: string): Promise<D1Result>;
  }

  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = unknown>(colName?: string): Promise<T | null>;
    run(): Promise<D1Result>;
    all<T = unknown>(): Promise<D1Result<T>>;
    raw<T = unknown>(): Promise<T[]>;
  }

  interface D1Result<T = unknown> {
    results: T[];
    success: boolean;
    error?: string;
    meta?: {
      duration: number;
      changes: number;
      last_row_id: number;
      rows_read: number;
      rows_written: number;
    };
  }
}

export interface DatabaseConfig {
  driver: DatabaseDriver;
  sqlitePath?: string;
  mysqlHost?: string;
  mysqlPort?: number;
  mysqlUser?: string;
  mysqlPassword?: string;
  mysqlDatabase?: string;
  d1Database?: D1Database;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  enableDocs: boolean;
  database: DatabaseConfig;
}

function loadEnvFile(): void {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  const envFiles: Record<string, string> = {
    test: '.env.test',
    development: '.env.local',
    production: '.env.production',
  };

  const envFile = envFiles[nodeEnv];
  if (envFile) {
    const envPath = resolve(process.cwd(), envFile);
    if (existsSync(envPath)) {
      config({ path: envPath });
    }
  }
}

loadEnvFile();

export function getAppConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  return {
    nodeEnv,
    port: parseInt(process.env.PORT || '3010', 10),
    enableDocs: process.env.ENABLE_DOCS !== 'false',
    database: {
      driver: (process.env.DB_DRIVER as DatabaseDriver) || 'sqlite',
      sqlitePath: process.env.SQLITE_PATH || `./data/${nodeEnv}.db`,
      mysqlHost: process.env.MYSQL_HOST || 'localhost',
      mysqlPort: parseInt(process.env.MYSQL_PORT || '3306', 10),
      mysqlUser: process.env.MYSQL_USER || 'root',
      mysqlPassword: process.env.MYSQL_PASSWORD || '',
      mysqlDatabase: process.env.MYSQL_DATABASE || 'app',
      d1Database: (globalThis as unknown as { D1?: D1Database }).D1,
    },
  };
}

export function getDatabaseConfig(): DatabaseConfig {
  return getAppConfig().database;
}
