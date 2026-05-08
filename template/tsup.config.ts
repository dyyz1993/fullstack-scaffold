import { defineConfig } from 'tsup'
import { existsSync } from 'fs'
import { join } from 'path'

const serverBuildConfigs = [
  {
    entry: ['src/server/entries/node.ts'],
    outDir: 'dist/server',
    format: 'esm' as const,
    platform: 'node' as const,
    target: 'node18' as const,
    clean: false,
    sourcemap: false,
    minify: true,
    external: [
      '@libsql/client',
      'mysql2',
      'ws',
      'drizzle-orm',
      'drizzle-orm/libsql',
      'drizzle-orm/libsql/migrator',
      'drizzle-orm/mysql2',
      'drizzle-orm/d1',
      'pino',
      'pino-pretty',
      'dotenv',
    ],
    treeshake: true,
    dts: false,
  },
  {
    entry: ['src/server/entries/cloudflare.ts'],
    outDir: 'dist/cloudflare',
    format: 'esm' as const,
    platform: 'neutral' as const,
    target: 'es2022' as const,
    clean: true,
    sourcemap: false,
    minify: true,
    treeshake: true,
    dts: false,
    noExternal: [
      'hono',
      '@hono/zod-openapi',
      '@hono/zod-validator',
      'zod',
      'drizzle-orm',
      'drizzle-orm/d1',
    ],
    external: [
      'pino',
      'pino-pretty',
      'dotenv',
      '@libsql/client',
      'mysql2',
      'ws',
      'drizzle-orm/libsql',
      'drizzle-orm/libsql/migrator',
      'drizzle-orm/mysql2',
      'path',
      'fs',
      'crypto',
      'http',
      'stream',
      'node:path',
      'node:fs',
      'node:crypto',
      'node:http',
      'node:stream',
    ],
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  },
]

// Only build CLI if CLI module is included in preset
const cliEntryPath = join(process.cwd(), 'src/cli/index.ts')
if (existsSync(cliEntryPath)) {
  serverBuildConfigs.push({
    entry: ['src/cli/index.ts'],
    outDir: 'dist/cli',
    format: 'esm' as const,
    platform: 'node' as const,
    target: 'node18' as const,
    clean: false,
    sourcemap: true,
    minify: false,
    treeshake: true,
    dts: true,
    external: ['hono', 'hono/client', 'commander', 'chalk', 'eslint'],
  })
}

export default defineConfig(serverBuildConfigs)
