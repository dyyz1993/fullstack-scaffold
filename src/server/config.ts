import { config } from 'dotenv'
import { resolve } from 'path'
import { existsSync } from 'fs'
import { isCloudflare } from './utils/env'

export type DatabaseDriver = 'sqlite' | 'mysql' | 'd1'

export interface DatabaseConfig {
  driver: DatabaseDriver
  sqlitePath?: string
  mysqlHost?: string
  mysqlPort?: number
  mysqlUser?: string
  mysqlPassword?: string
  mysqlDatabase?: string
  d1Database?: D1Database
}

export interface AppConfig {
  nodeEnv: string
  port: number
  enableDocs: boolean
  database: DatabaseConfig
}

function loadEnvFileSync(): void {
  if (isCloudflare) return

  const nodeEnv = process.env.NODE_ENV || 'development'

  const envFiles: Record<string, string> = {
    test: '.env.test',
    development: '.env.local',
    production: '.env.production',
  }

  const envFile = envFiles[nodeEnv]
  if (envFile) {
    const envPath = resolve(process.cwd(), envFile)
    if (existsSync(envPath)) {
      config({ path: envPath })
    }
  }
}

loadEnvFileSync()

function envString(key: string, fallback: string): string {
  return typeof process !== 'undefined' ? process.env[key] || fallback : fallback
}

function envInt(key: string, fallback: number): number {
  return typeof process !== 'undefined'
    ? parseInt(process.env[key] || String(fallback), 10)
    : fallback
}

export function getAppConfig(): AppConfig {
  const nodeEnv =
    typeof process !== 'undefined' ? process.env.NODE_ENV || 'development' : 'production'
  const port = envInt('PORT', 3010)
  const enableDocs = typeof process !== 'undefined' ? process.env.ENABLE_DOCS !== 'false' : false
  const dbDriver = (envString('DB_DRIVER', 'd1') as DatabaseDriver) || 'sqlite'

  return {
    nodeEnv,
    port,
    enableDocs,
    database: {
      driver: isCloudflare ? 'd1' : dbDriver,
      sqlitePath: envString('SQLITE_PATH', `./data/${nodeEnv}.db`),
      mysqlHost: envString('MYSQL_HOST', 'localhost'),
      mysqlPort: envInt('MYSQL_PORT', 3306),
      mysqlUser: envString('MYSQL_USER', 'root'),
      mysqlPassword: envString('MYSQL_PASSWORD', ''),
      mysqlDatabase: envString('MYSQL_DATABASE', 'app'),
      d1Database: (globalThis as unknown as { DB?: D1Database }).DB,
    },
  }
}

export function getDatabaseConfig(): DatabaseConfig {
  return getAppConfig().database
}
