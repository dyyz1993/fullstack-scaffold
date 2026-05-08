import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli/index.ts'],
  outDir: 'dist/cli',
  format: 'esm',
  platform: 'node',
  target: 'node18',
  clean: true,
  sourcemap: true,
  minify: false,
  treeshake: true,
  dts: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: [
    'hono',
    'hono/client',
    'commander',
    'chalk',
    'eslint',
    'fs-extra',
    'ora',
    'tsx',
    'tsx/esm/api',
  ],
  noExternal: [],
})
