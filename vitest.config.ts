import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    globals: true,
    include: ['src/__tests__/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'template/**',
      'src/client/**',
      'src/server/**',
      'src/shared/**',
    ],
    testTimeout: 60000,
    hookTimeout: 60000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'node_modules/**'],
    },
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'template/src/shared'),
    },
  },
})
