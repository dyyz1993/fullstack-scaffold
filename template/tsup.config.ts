import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server/main.ts'],
  outDir: 'dist/server',
  format: 'esm',
  platform: 'node',
  target: 'node18',
  clean: false,
  sourcemap: true,
  minify: false,
  external: [
    '@libsql/client',
    'mysql2',
    'ws',
    'drizzle-orm',
    'drizzle-orm/libsql',
    'drizzle-orm/libsql/migrator',
    'drizzle-orm/mysql2',
    'drizzle-orm/d1',
  ],
  treeshake: true,
  dts: false,
});
