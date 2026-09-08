import { defineConfig, type Options } from 'tsup'
import { existsSync } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const root = process.cwd()

// 按入口文件存在性过滤（cli-only 等无 client preset 会排除 cloudflare 入口）
const rawServerBuildConfigs: Options[] = [
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
      'react',
      'react-dom',
      'react-dom/server',
      'react-router-dom',
      'react-helmet-async',
      'zustand',
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
      'import.meta.env.VITE_PRESET': '"todo"',
    },
    esbuildOptions(options) {
      // Strip CSS imports for SSR (CSS is handled by client build)
      options.loader = {
        ...options.loader,
        '.css': 'empty',
        '.svg': 'empty',
        '.png': 'empty',
        '.jpg': 'empty',
        '.jpeg': 'empty',
        '.gif': 'empty',
        '.woff': 'empty',
        '.woff2': 'empty',
        '.ttf': 'empty',
        '.eot': 'empty',
      }
      // Path aliases for client/shared modules
      options.alias = {
        '@shared': resolve(root, 'src/shared'),
        '@client': resolve(root, 'src/client'),
        '@server': resolve(root, 'src/server'),
        '@admin': resolve(root, 'src/admin'),
        // Use browser variant of react-dom/server for Cloudflare Workers
        // (Node variant requires 'util' builtin which is unavailable in Workers)
        'react-dom/server': 'react-dom/server.browser',
      }
    },
  },
]

// 按入口文件存在性过滤（cli-only 等无 client 的 preset 会排除 cloudflare 入口文件）
const serverBuildConfigs: Options[] = rawServerBuildConfigs.filter(c => {
  const raw = c.entry
  const entries = Array.isArray(raw) ? raw : raw ? [raw] : []
  return (
    entries.length === 0 ||
    entries.every(e => typeof e === 'string' && existsSync(resolve(__dirname, e)))
  )
})

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
    esbuildOptions(options) {
      // Resolve @cli/* path aliases for CLI build
      options.alias = {
        '@cli': resolve(root, 'src/cli'),
      }
    },
  })
}

export default defineConfig(serverBuildConfigs)
