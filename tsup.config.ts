import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/server/entries/cloudflare.ts'],
    outDir: 'dist/cloudflare',
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
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
      'drizzle-orm/d1'
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
])
